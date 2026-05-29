use crate::{AppEngineState, ProgressSnapshot};
use rusqlite::{params, Connection};
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug)]
pub enum EngineError {
    ProcessSpawnFailed(String),
}

struct ResolvedJobConfig {
    target_url: String,
    format_string: String,
    cookie_data: Option<String>,
    proxy_string: Option<String>,
}

/// Helper function to parse raw text lines into metrics strings cleanly
fn parse_progress_line(line: &str) -> Option<(f64, String)> {
    if !line.contains("[download]") || !line.contains("%") {
        return None;
    }

    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() < 2 {
        return None;
    }

    let clean_pct = parts[1].trim_end_matches('%');
    let percentage = match clean_pct.parse::<f64>() {
        Ok(val) => val,
        Err(_) => return None,
    };

    let status_msg = parts[2..].join(" ");
    Some((percentage, status_msg))
}

/// Query SQLite to extract all configuration parameters attached to this explicit job row
fn resolve_job_parameters(
    db_path: &std::path::Path,
    job_slug: &str,
) -> Result<ResolvedJobConfig, String> {
    let conn = match Connection::open(db_path) {
        Ok(c) => c,
        Err(e) => return Err(e.to_string()),
    };

    let query = "
        SELECT
            COALESCE(j.direct_url, p.url) as target_url,
            j.format_string,
            c.cookie_data,
            pr.proxy_string
        FROM download_jobs j
        LEFT JOIN parsed_files p ON j.parsed_file_slug = p.slug
        LEFT JOIN cookie_profiles c ON j.cookie_profile_slug = c.slug
        LEFT JOIN proxy_profiles pr ON j.proxy_profile_slug = pr.slug
        WHERE j.slug = ?1;
    ";

    let mut stmt = match conn.prepare(query) {
        Ok(s) => s,
        Err(e) => return Err(e.to_string()),
    };

    let mut rows = match stmt.query(params![job_slug]) {
        Ok(r) => r,
        Err(e) => return Err(e.to_string()),
    };

    match rows.next() {
        Ok(Some(row)) => {
            let url: String = match row.get(0) {
                Ok(v) => v,
                Err(e) => return Err(e.to_string()),
            };
            let format: String = match row.get(1) {
                Ok(v) => v,
                Err(e) => return Err(e.to_string()),
            };
            let cookie: Option<String> = row.get(2).ok();
            let proxy: Option<String> = row.get(3).ok();

            Ok(ResolvedJobConfig {
                target_url: url,
                format_string: format,
                cookie_data: cookie,
                proxy_string: proxy,
            })
        }
        Ok(None) => Err(
            "Target download job configuration missing from database record registries."
                .to_string(),
        ),
        Err(e) => Err(e.to_string()),
    }
}

pub async fn execute_download_worker(
    app_handle: AppHandle,
    job_slug: String,
) -> Result<(), EngineError> {
    // FIXED: Changed from match state lookup to a direct state fetch to adapt to Tauri v2 definitions
    let state = app_handle.state::<AppEngineState>();

    // 1. Resolve every format, URL, proxy, and cookie parameter from SQLite using zero unwrap statements
    let config = match resolve_job_parameters(&state.db_path, &job_slug) {
        Ok(cfg) => cfg,
        Err(err) => return Err(EngineError::ProcessSpawnFailed(err)),
    };

    let _permit = match state.pool_semaphore.acquire().await {
        Ok(p) => p,
        Err(e) => return Err(EngineError::ProcessSpawnFailed(e.to_string())),
    };

    // 2. Assemble our multi-threaded command arguments array dynamically
    let mut cmd = Command::new("yt-dlp");
    cmd.arg("-f").arg(&config.format_string);
    cmd.arg("--newline");

    // 3. Conditionally append Proxy arguments if established on the config profile
    if let Some(ref proxy_url) = config.proxy_string {
        cmd.arg("--proxy").arg(proxy_url);
    }

    // 4. Conditionally handle security cookie authentication strings safely if present
    if let Some(ref cookies) = config.cookie_data {
        cmd.arg("--cookies-from-viewer").arg(cookies);
    }

    // Append our target extraction address destination parameter
    cmd.arg(&config.target_url);

    // 5. Configure standard descriptor pipelines
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return Err(EngineError::ProcessSpawnFailed(e.to_string())),
    };

    // Safe Process ID caching steps
    let mut child_process = {
        let mut active_instances = state.active_processes.instances.write();
        active_instances.insert(job_slug.clone(), child);
        match active_instances.remove(&job_slug) {
            Some(c) => c,
            None => return Ok(()),
        }
    };

    let stdout_stream = match child_process.stdout.take() {
        Some(out) => out,
        None => {
            return Err(EngineError::ProcessSpawnFailed(
                "Failed to trap stdout.".to_string(),
            ))
        }
    };

    {
        let mut active_instances = state.active_processes.instances.write();
        active_instances.insert(job_slug.clone(), child_process);
    }

    let mut reader = BufReader::new(stdout_stream).lines();

    while let Ok(Some(line)) = reader.next_line().await {
        let clean_line = line.trim();
        if clean_line.is_empty() {
            continue;
        }

        if let Some((percentage, status_text)) = parse_progress_line(clean_line) {
            {
                let mut cache = state.progress_cache.lock();
                cache.insert(
                    job_slug.clone(),
                    ProgressSnapshot {
                        progress: percentage,
                        status_message: status_text.clone(),
                    },
                );
            }

            let _ = app_handle.emit(
                "download-progress-token",
                serde_json::json!({
                    "slug": job_slug,
                    "progress": percentage,
                    "message": status_text
                }),
            );
        }
    }

    let clean_exit = {
        let mut active_instances = state.active_processes.instances.write();
        match active_instances.remove(&job_slug) {
            Some(mut remaining_child) => match remaining_child.wait().await {
                Ok(status) => status.success(),
                Err(_) => false,
            },
            None => false,
        }
    };

    if let Ok(conn) = rusqlite::Connection::open(&state.db_path) {
        let final_status = if clean_exit { "completed" } else { "paused" };
        let _ = conn.execute(
            "UPDATE download_jobs SET status = ?1, updated_at = datetime('now') WHERE slug = ?2;",
            rusqlite::params![final_status, job_slug],
        );
    }

    Ok(())
}
