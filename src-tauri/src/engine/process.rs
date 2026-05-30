use crate::{AppEngineState, ProgressSnapshot};
use rusqlite::{params, Connection};
use std::process::Stdio;
use tauri::{AppHandle, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug)]
pub enum EngineError {
    ProcessSpawnFailed(String),
}

pub struct ResolvedJobConfig {
    pub target_url: String,
    pub format_string: String,
    pub file_type: String,
    pub selected_subtitles: Option<String>,
    pub cookie_data: Option<String>,
    pub proxy_string: Option<String>,
    pub resolved_path: String,
    pub custom_title: Option<String>,
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

/// Dynamic Cross-Platform Fallback: Fetches the pure Rust path targeting user standard downloads
fn get_system_downloads_fallback() -> String {
    directories::UserDirs::new()
        .and_then(|dirs| {
            dirs.download_dir()
                .map(|p| p.to_string_lossy().into_owned())
        })
        .unwrap_or_else(|| ".".to_string())
}

fn sanitize_title(title: &str) -> String {
    title.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect::<String>()
        .split('_')
        .filter(|s| !s.is_empty())
        .collect::<Vec<&str>>()
        .join("_")
}

/// Query SQLite to extract all configuration parameters attached to this explicit job row
pub fn resolve_job_parameters(
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
            pr.proxy_string,
            j.base_download_path,
            j.custom_download_path,
            p.sanitized_title,
            p.sanitized_playlist_name,
            j.file_type,
            j.selected_subtitles,
            j.is_from_playlist,
            COALESCE(p.is_playlist, 0) as is_playlist_parent,
            p.parent_playlist_slug
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

            // Extract the user configuration directory paths
            let base_path: Option<String> = row.get(4).ok();
            let custom_title: Option<String> = row.get(5).ok();
            let sanitized_title: Option<String> = row.get(6).ok();
            let sanitized_playlist: Option<String> = row.get(7).ok();
            let file_type: String = row.get(8).unwrap_or_default();
            let selected_subtitles: Option<String> = row.get(9).ok();
            let is_from_playlist: i32 = row.get(10).unwrap_or(0);
            let is_playlist_parent: i32 = row.get(11).unwrap_or(0);
            let parent_playlist_slug: Option<String> = row.get(12).ok();

            // 1. Fetch the user's selected download folder from the SQL `app_settings` table.
            let global_download_path = match conn.query_row(
                "SELECT value FROM app_settings WHERE key = 'download_path'",
                [],
                |r| r.get::<_, String>(0)
            ) {
                Ok(val) => Some(val),
                Err(_) => None,
            };

            // 2. Prioritize global setting, then the job's recorded path, then the OS downloads folder fallback.
            let root_destination = global_download_path
                .filter(|s| !s.trim().is_empty())
                .or(base_path.filter(|s| !s.trim().is_empty()))
                .unwrap_or_else(get_system_downloads_fallback);

            // 3. Always append "Synclime" to the selected path.
            let mut final_path = std::path::PathBuf::from(root_destination);
            if final_path.file_name().map(|n| n.to_string_lossy().to_string().to_lowercase()) != Some("synclime".to_string()) {
                final_path = final_path.join("Synclime");
            }

            let is_playlist_item = is_from_playlist == 1 || !parent_playlist_slug.clone().unwrap_or_default().trim().is_empty();

            if is_playlist_item {
                // Get playlist folder name (sanitized)
                let raw_playlist_name = if is_playlist_parent == 1 {
                    sanitized_title.clone().unwrap_or_else(|| "playlist".to_string())
                } else {
                    sanitized_playlist.clone().unwrap_or_else(|| "playlist".to_string())
                };
                let clean_playlist_name = sanitize_title(&raw_playlist_name);

                // Get video folder name (sanitized)
                let raw_video_name = if is_playlist_parent == 1 {
                    custom_title.clone().unwrap_or_else(|| "video".to_string())
                } else {
                    sanitized_title.clone().unwrap_or_else(|| "video".to_string())
                };
                let clean_video_name = sanitize_title(&raw_video_name);

                final_path = final_path.join(clean_playlist_name).join(clean_video_name);
            } else {
                // Standalone video
                let raw_video_name = sanitized_title
                    .clone()
                    .or(custom_title.clone())
                    .unwrap_or_else(|| "video".to_string());
                let clean_video_name = sanitize_title(&raw_video_name);
                final_path = final_path.join(clean_video_name);
            }

            if !final_path.exists() {
                let _ = std::fs::create_dir_all(&final_path);
            }

            Ok(ResolvedJobConfig {
                target_url: url,
                format_string: format,
                file_type,
                selected_subtitles,
                cookie_data: cookie,
                proxy_string: proxy,
                resolved_path: final_path.to_string_lossy().into_owned(),
                custom_title,
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
    let state = app_handle.state::<AppEngineState>();

    let config = match resolve_job_parameters(&state.db_path, &job_slug) {
        Ok(cfg) => cfg,
        Err(err) => return Err(EngineError::ProcessSpawnFailed(err)),
    };

    let _permit = match state.pool_semaphore.acquire().await {
        Ok(p) => p,
        Err(e) => return Err(EngineError::ProcessSpawnFailed(e.to_string())),
    };

    let mut cmd = Command::new("yt-dlp");
    cmd.arg("--no-playlist"); // FORCE SINGLE MEDIA EXCLUSIVITY
    
    cmd.arg("-f").arg(&config.format_string);
    cmd.arg("--newline");

    // Explicit Destination Path Argument for yt-dlp execution mapping
    cmd.arg("-P").arg(&config.resolved_path);

    // Specify the absolute output path directly in the output template to guarantee directory structure
    let output_template = if let Some(ref ct) = config.custom_title {
        if !ct.trim().is_empty() {
            format!("{}/{}.%(ext)s", &config.resolved_path, ct.trim())
        } else {
            format!("{}/%(title)s.%(ext)s", &config.resolved_path)
        }
    } else {
        format!("{}/%(title)s.%(ext)s", &config.resolved_path)
    };
    cmd.arg("-o").arg(output_template);

    if config.file_type == "subtitle" {
        cmd.arg("--write-subs");
        cmd.arg("--write-auto-subs");
        cmd.arg("--skip-download");
        if let Some(ref subs) = config.selected_subtitles {
            cmd.arg("--sub-langs").arg(subs);
        } else {
            cmd.arg("--sub-langs").arg("all");
        }
    }

    if let Some(ref proxy_url) = config.proxy_string {
        cmd.arg("--proxy").arg(proxy_url);
    }

    if let Some(ref cookies) = config.cookie_data {
        cmd.arg("--cookies-from-viewer").arg(cookies);
    }

    cmd.arg(&config.target_url);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return Err(EngineError::ProcessSpawnFailed(e.to_string())),
    };

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
    let mut current_progress = 0.0;

    while let Ok(Some(line)) = reader.next_line().await {
        let clean_line = line.trim();
        if clean_line.is_empty() {
            continue;
        }

        if let Some((percentage, _)) = parse_progress_line(clean_line) {
            current_progress = percentage;
        }

        {
            let mut cache = state.progress_cache.lock();
            cache.insert(
                job_slug.clone(),
                ProgressSnapshot {
                    progress: current_progress,
                    status_message: clean_line.to_string(),
                },
            );
        }
    }

    let remaining_process = {
        let mut active_instances = state.active_processes.instances.write();
        active_instances.remove(&job_slug)
    };

    let clean_exit = match remaining_process {
        Some(mut remaining_child) => match remaining_child.wait().await {
            Ok(status) => status.success(),
            Err(_) => false,
        },
        None => false,
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
