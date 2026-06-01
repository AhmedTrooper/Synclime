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
    pub sanitized_title: String,
    pub download_chunks: usize,
    pub is_direct_url: bool,
}

/// Helper function to parse raw text lines into metrics strings cleanly using a resilient backwards scanner
fn parse_progress_line(line: &str) -> Option<(f64, String)> {
    if !line.contains("[download]") || !line.contains("%") {
        return None;
    }

    // 1. Strip common ANSI control sequences to keep parsing clean
    let mut clean_line = String::new();
    let mut in_ansi = false;
    for c in line.chars() {
        if c == '\x1b' || c == '\u{001b}' {
            in_ansi = true;
        } else if in_ansi {
            if c.is_ascii_alphabetic() {
                in_ansi = false;
            }
        } else {
            clean_line.push(c);
        }
    }
    let clean_str = clean_line.trim();

    // 2. Find the percent index
    let pct_idx = clean_str.find('%')?;
    if pct_idx == 0 {
        return None;
    }

    // 3. Scan backward to extract the numeric string
    let mut numeric_chars = Vec::new();
    let chars: Vec<char> = clean_str.chars().collect();
    let mut i = pct_idx;
    while i > 0 {
        i -= 1;
        let c = chars[i];
        if c.is_ascii_digit() || c == '.' {
            numeric_chars.push(c);
        } else if c.is_whitespace() {
            if numeric_chars.is_empty() {
                continue;
            } else {
                break;
            }
        } else {
            break;
        }
    }

    if numeric_chars.is_empty() {
        return None;
    }

    numeric_chars.reverse();
    let num_str: String = numeric_chars.into_iter().collect();
    let percentage = num_str.parse::<f64>().ok()?;

    // Extract status message (everything after the percentage symbol)
    let status_msg = clean_str[pct_idx + 1..].trim().to_string();

    Some((percentage, status_msg))
}

/// Resilient progress line decoder for Aria2 external downloaders
fn parse_aria2_progress(line: &str) -> Option<(f64, String)> {
    // Scan for any percentage symbol inside parentheses, e.g. "(99%)", "( 9.5%)"
    if !line.contains('%') {
        return None;
    }

    // Try finding a percentage match dynamically by checking all '%' characters
    let chars: Vec<char> = line.chars().collect();
    for pct_idx in 0..chars.len() {
        if chars[pct_idx] == '%' {
            // Scan backward to locate the corresponding opening parenthesis '('
            let mut i = pct_idx;
            while i > 0 {
                i -= 1;
                if chars[i] == '(' {
                    let pct_str: String = chars[i + 1..pct_idx].iter().collect();
                    let trimmed = pct_str.trim();
                    if let Ok(percentage) = trimmed.parse::<f64>() {
                        if percentage >= 0.0 && percentage <= 100.0 {
                            // Extract a clean status message
                            // If the line contains a bracketed segment (e.g. [#xxxxxx ...]), extract it.
                            // Otherwise, just use the trimmed line content.
                            let status_msg = if let Some(start_idx) = line.find('[') {
                                let end_idx = line.rfind(']').unwrap_or(line.len());
                                line[start_idx..end_idx + 1].trim().to_string()
                            } else {
                                line.trim().to_string()
                            };
                            return Some((percentage, status_msg));
                        }
                    }
                    break;
                }
            }
        }
    }

    None
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
    conn: &Connection,
    job_slug: &str,
) -> Result<ResolvedJobConfig, String> {

    let query = "
        SELECT
            COALESCE(j.direct_url, p.url) as target_url,
            j.format_string,
            COALESCE(sc_cookie.cookie_data, c.cookie_data) as cookie_data,
            COALESCE(sc_proxy.proxy_string, pr.proxy_string) as proxy_string,
            j.base_download_path,
            j.custom_download_path,
            p.sanitized_title,
            p.sanitized_playlist_name,
            j.file_type,
            j.selected_subtitles,
            j.is_from_playlist,
            COALESCE(p.is_playlist, 0) as is_playlist_parent,
            p.parent_playlist_slug,
            j.parsed_file_slug,
            j.is_direct_url
        FROM download_jobs j
        LEFT JOIN parsed_files p ON j.parsed_file_slug = p.slug
        LEFT JOIN parsed_files parent_p ON p.parent_playlist_slug = parent_p.slug
        -- Resolve selected site config for the parsed file or its parent playlist
        LEFT JOIN site_configs sc ON COALESCE(p.site_config_slug, parent_p.site_config_slug) = sc.slug
        LEFT JOIN cookie_profiles sc_cookie ON sc.cookie_profile_slug = sc_cookie.slug
        LEFT JOIN proxy_profiles sc_proxy ON sc.proxy_profile_slug = sc_proxy.slug
        -- direct profile links fallbacks
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
            let parsed_file_slug: Option<String> = row.get(13).ok();
            let is_direct_url: i32 = row.get(14).unwrap_or(0);

            // 1. Fetch the user's selected download folder from the SQL `app_settings` table.
            let global_download_path = match conn.query_row(
                "SELECT value FROM app_settings WHERE key = 'download_path'",
                [],
                |r| r.get::<_, String>(0)
            ) {
                Ok(val) => Some(val),
                Err(_) => None,
            };

            let download_chunks = match conn.query_row(
                "SELECT value FROM app_settings WHERE key = 'download_chunks'",
                [],
                |r| r.get::<_, String>(0)
            ) {
                Ok(val) => val.parse::<usize>().unwrap_or(4),
                Err(_) => 4,
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

            let raw_video_name = sanitized_title
                .clone()
                .or(custom_title.clone())
                .unwrap_or_else(|| "video".to_string());
            let video_slug = parsed_file_slug.clone().unwrap_or_else(|| "video".to_string());
            let clean_video_name = {
                let base = sanitize_title(&raw_video_name);
                let clean_slug = sanitize_title(&video_slug);
                if base.is_empty() {
                    clean_slug
                } else {
                    format!("{}_{}", base, clean_slug)
                }
            };

            if is_direct_url == 1 {
                // Direct Standalone File - no video subfolder created. Sits directly under Synclime directory.
            } else if is_playlist_item {
                // Get playlist folder name (sanitized)
                let raw_playlist_name = if is_playlist_parent == 1 {
                    sanitized_title.clone().unwrap_or_else(|| "playlist".to_string())
                } else {
                    sanitized_playlist.clone().unwrap_or_else(|| "playlist".to_string())
                };
                let playlist_slug = if is_playlist_parent == 1 {
                    parsed_file_slug.clone().unwrap_or_else(|| "playlist".to_string())
                } else {
                    parent_playlist_slug.clone().unwrap_or_else(|| "playlist".to_string())
                };
                let clean_playlist_name = {
                    let base = sanitize_title(&raw_playlist_name);
                    let clean_slug = sanitize_title(&playlist_slug);
                    if base.is_empty() {
                        clean_slug
                    } else {
                        format!("{}_{}", base, clean_slug)
                    }
                };

                final_path = final_path.join(clean_playlist_name).join(&clean_video_name);
            } else {
                // Standalone video
                final_path = final_path.join(&clean_video_name);
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
                sanitized_title: clean_video_name,
                download_chunks,
                is_direct_url: is_direct_url == 1,
            })
        }
        Ok(None) => Err(
            "Target download job configuration missing from database record registries."
                .to_string(),
        ),
        Err(e) => Err(e.to_string()),
    }
}

fn log_spawn_error(
    state: &AppEngineState,
    job_slug: &str,
    command_executed: &str,
    error_message: &str,
) {
    let conn = state.db_conn.lock();

    // 1. Update database to error and set tracking_message
    let _ = conn.execute(
        "UPDATE download_jobs SET status = 'error', tracking_message = ?1, updated_at = datetime('now') WHERE slug = ?2;",
        rusqlite::params![error_message, job_slug],
    );

    // 2. Log detailed error record in SQLite error_logs
    let error_slug = format!("err_{}", chrono::Utc::now().timestamp_millis());
    let now_str = chrono::Utc::now().to_rfc3339();
    let _ = conn.execute(
        "INSERT INTO error_logs (slug, download_job_slug, command_executed, error_message, is_resolved, timestamp) VALUES (?1, ?2, ?3, ?4, 0, ?5);",
        rusqlite::params![error_slug, job_slug, command_executed, error_message, now_str],
    );

    // 3. Push final error snapshot into cache
    let mut cache = state.progress_cache.lock();
    cache.insert(
        job_slug.to_string(),
        ProgressSnapshot {
            progress: 0.0,
            status_message: error_message.to_string(),
            status: "error".to_string(),
        },
    );
}

pub async fn execute_download_worker(
    app_handle: AppHandle,
    job_slug: String,
) -> Result<(), EngineError> {
    let state = app_handle.state::<AppEngineState>();
    let mut command_executed = "yt-dlp (failed during setup)".to_string();

    let config = {
        let conn = state.db_conn.lock();
        match resolve_job_parameters(&conn, &job_slug) {
            Ok(cfg) => cfg,
            Err(err) => {
                log_spawn_error(&state, &job_slug, &command_executed, &err);
                return Err(EngineError::ProcessSpawnFailed(err));
            }
        }
    };

    let semaphore = {
        let lock = state.pool_semaphore.read();
        std::sync::Arc::clone(&*lock)
    };

    let _permit = match semaphore.acquire_owned().await {
        Ok(p) => p,
        Err(e) => {
            let err_msg = e.to_string();
            log_spawn_error(&state, &job_slug, &command_executed, &err_msg);
            return Err(EngineError::ProcessSpawnFailed(err_msg));
        }
    };

    // Build full command arguments array
    let mut command_args: Vec<String> = Vec::new();
    command_args.push("--no-playlist".to_string());
    command_args.push("-f".to_string());
    command_args.push(config.format_string.clone());
    command_args.push("--newline".to_string());
    command_args.push("-P".to_string());
    command_args.push(config.resolved_path.clone());
    
    if !config.is_direct_url {
        // Parsed video/playlist download job - concurrent fragments
        command_args.push("-N".to_string());
        command_args.push(config.download_chunks.to_string());
    } else {
        // Direct standalone file download - check if aria2c is installed on host system
        let aria2_available = std::process::Command::new("aria2c")
            .arg("--version")
            .output()
            .is_ok();

        if aria2_available {
            command_args.push("--downloader".to_string());
            command_args.push("aria2c".to_string());
            command_args.push("--downloader-args".to_string());
            command_args.push(format!("aria2c:-x {} -s {}", config.download_chunks, config.download_chunks));
        } else {
            command_args.push("--http-chunk-size".to_string());
            command_args.push("10M".to_string());
        }
    }
    
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
    command_args.push("-o".to_string());
    command_args.push(output_template.clone());

    if config.file_type == "subtitle" {
        command_args.push("--write-subs".to_string());
        command_args.push("--write-auto-subs".to_string());
        command_args.push("--skip-download".to_string());
        if let Some(ref subs) = config.selected_subtitles {
            command_args.push("--sub-langs".to_string());
            command_args.push(subs.clone());
        } else {
            command_args.push("--sub-langs".to_string());
            command_args.push("all".to_string());
        }
    }

    if let Some(ref proxy_url) = config.proxy_string {
        command_args.push("--proxy".to_string());
        command_args.push(proxy_url.clone());
    }

    let mut cmd = Command::new("yt-dlp");
    #[cfg(unix)]
    {
        cmd.process_group(0);
    }
    for arg in &command_args {
        cmd.arg(arg);
    }

    let mut temp_cookie_path = None;
    if let Some(ref cookies) = config.cookie_data {
        if let Some(app_dir) = state.db_path.parent() {
            let unique_id = chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0);
            let unique_name = format!("synclime_cookie_{}.txt", unique_id);
            let file_path = app_dir.join(unique_name);
            
            #[cfg(unix)]
            {
                use std::os::unix::fs::OpenOptionsExt;
                let mut options = std::fs::OpenOptions::new();
                options.create(true).write(true).truncate(true).mode(0o600);
                if let Ok(mut file) = options.open(&file_path) {
                    use std::io::Write;
                    let _ = file.write_all(cookies.as_bytes());
                    cmd.arg("--cookies").arg(&file_path);
                    temp_cookie_path = Some(file_path.clone());
                    command_args.push("--cookies".to_string());
                    command_args.push(file_path.to_string_lossy().to_string());
                    println!("[SYNCLIME DOWNLOADER] Secure Netscape cookies file created (Unix 0600):");
                    println!("  - Path: {:?}", file_path);
                    println!("  - Size: {} bytes", cookies.len());
                } else {
                    println!("[SYNCLIME DOWNLOADER] ERROR: Failed to open secure temporary cookie file at {:?}", file_path);
                }
            }
            #[cfg(not(unix))]
            {
                if std::fs::write(&file_path, cookies).is_ok() {
                    cmd.arg("--cookies").arg(&file_path);
                    temp_cookie_path = Some(file_path.clone());
                    command_args.push("--cookies".to_string());
                    command_args.push(file_path.to_string_lossy().to_string());
                    println!("[SYNCLIME DOWNLOADER] Secure Netscape cookies file created (non-Unix):");
                    println!("  - Path: {:?}", file_path);
                    println!("  - Size: {} bytes", cookies.len());
                } else {
                    println!("[SYNCLIME DOWNLOADER] ERROR: Failed to write secure temporary cookie file at {:?}", file_path);
                }
            }
        }
    }

    struct CookieFileCleanup(Option<std::path::PathBuf>);
    impl Drop for CookieFileCleanup {
        fn drop(&mut self) {
            if let Some(ref path) = self.0 {
                if std::fs::remove_file(path).is_ok() {
                    println!("[SYNCLIME DOWNLOADER] Secure temporary cookies file successfully deleted: {:?}", path);
                } else {
                    println!("[SYNCLIME DOWNLOADER] WARNING: Failed to delete secure temporary cookies file: {:?}", path);
                }
            }
        }
    }
    let _cleanup_guard = CookieFileCleanup(temp_cookie_path.clone());

    cmd.arg(&config.target_url);
    command_args.push(config.target_url.clone());

    // Build completed executed command string representation
    command_executed = format!("yt-dlp {}", command_args.join(" "));
    println!("[SYNCLIME DOWNLOADER] Spawning download process:");
    println!("  - Command string: {}", command_executed);
    if let Some(ref p) = temp_cookie_path {
        println!("  - Associated cookies file: {:?}", p);
    }

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            let err_msg = e.to_string();
            log_spawn_error(&state, &job_slug, &command_executed, &err_msg);
            return Err(EngineError::ProcessSpawnFailed(err_msg));
        }
    };

    let stdout_stream = match child.stdout.take() {
        Some(out) => out,
        None => {
            let err_msg = "Failed to trap stdout.".to_string();
            log_spawn_error(&state, &job_slug, &command_executed, &err_msg);
            return Err(EngineError::ProcessSpawnFailed(err_msg));
        }
    };

    {
        let mut active_instances = state.active_processes.instances.write();
        active_instances.insert(job_slug.clone(), child);
    }

    let mut reader = BufReader::new(stdout_stream).lines();
    let mut current_progress = 0.0;

    while let Ok(Some(line)) = reader.next_line().await {
        let clean_line = line.trim();
        if clean_line.is_empty() {
            continue;
        }

        let parsed_progress = parse_progress_line(clean_line)
            .or_else(|| parse_aria2_progress(clean_line));

        if let Some((percentage, _)) = parsed_progress {
            current_progress = percentage;
        }

        {
            let mut cache = state.progress_cache.lock();
            cache.insert(
                job_slug.clone(),
                ProgressSnapshot {
                    progress: current_progress,
                    status_message: clean_line.to_string(),
                    status: "downloading".to_string(),
                },
            );
        }
    }

    let remaining_process = {
        let mut active_instances = state.active_processes.instances.write();
        active_instances.remove(&job_slug)
    };

    let mut stderr_msg = String::new();
    let mut clean_exit = false;

    if let Some(mut remaining_child) = remaining_process {
        // Read stderr if process fails to capture the exact error message
        if let Some(stderr) = remaining_child.stderr.take() {
            let mut err_reader = BufReader::new(stderr).lines();
            let mut err_lines = Vec::new();
            while let Ok(Some(line)) = err_reader.next_line().await {
                let clean = line.trim();
                if !clean.is_empty() {
                    err_lines.push(clean.to_string());
                }
            }
            if !err_lines.is_empty() {
                stderr_msg = err_lines.last().cloned().unwrap_or_default();
                if stderr_msg.is_empty() {
                    stderr_msg = err_lines.join(" ");
                }
            }
        }

        clean_exit = match remaining_child.wait().await {
            Ok(status) => status.success(),
            Err(_) => false,
        };
    }

    {
        let conn = state.db_conn.lock();
        
        // Check if the user paused this job
        let mut is_paused = false;
        if let Ok(status) = conn.query_row(
            "SELECT status FROM download_jobs WHERE slug = ?1;",
            rusqlite::params![job_slug],
            |row| row.get::<_, String>(0)
        ) {
            if status == "paused" {
                is_paused = true;
            }
        }

        if is_paused {
            // It was paused by the user! Preserve paused state, clear tracking message.
            let _ = conn.execute(
                "UPDATE download_jobs SET tracking_message = NULL, updated_at = datetime('now') WHERE slug = ?1;",
                rusqlite::params![job_slug],
            );
            
            // Push final paused snapshot into cache
            let mut cache = state.progress_cache.lock();
            cache.insert(
                job_slug.clone(),
                ProgressSnapshot {
                    progress: current_progress,
                    status_message: "Download paused by user.".to_string(),
                    status: "paused".to_string(),
                },
            );
        } else if clean_exit {
            // Update database to completed
            let _ = conn.execute(
                "UPDATE download_jobs SET status = 'completed', progress = 100.0, updated_at = datetime('now') WHERE slug = ?1;",
                rusqlite::params![job_slug],
            );
            
            // Push final completed snapshot into cache
            let mut cache = state.progress_cache.lock();
            cache.insert(
                job_slug.clone(),
                ProgressSnapshot {
                    progress: 100.0,
                    status_message: "Download completed successfully.".to_string(),
                    status: "completed".to_string(),
                },
            );
        } else {
            let error_desc = if stderr_msg.is_empty() {
                "Download process terminated with error status.".to_string()
            } else {
                stderr_msg.trim().to_string()
            };

            // Update database to error and set tracking_message
            let _ = conn.execute(
                "UPDATE download_jobs SET status = 'error', tracking_message = ?1, updated_at = datetime('now') WHERE slug = ?2;",
                rusqlite::params![error_desc, job_slug],
            );

            // Log detailed error record in SQLite error_logs
            let error_slug = format!("err_{}", chrono::Utc::now().timestamp_millis());
            let now_str = chrono::Utc::now().to_rfc3339();
            let _ = conn.execute(
                "INSERT INTO error_logs (slug, download_job_slug, command_executed, error_message, is_resolved, timestamp) VALUES (?1, ?2, ?3, ?4, 0, ?5);",
                rusqlite::params![error_slug, job_slug, command_executed, error_desc, now_str],
            );

            // Push final error snapshot into cache
            let mut cache = state.progress_cache.lock();
            cache.insert(
                job_slug.clone(),
                ProgressSnapshot {
                    progress: current_progress,
                    status_message: error_desc,
                    status: "error".to_string(),
                },
            );
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_progress_line_standard() {
        let input = "[download]  23.4% of  12.34MiB at  1.23MiB/s ETA 00:10";
        let res = parse_progress_line(input);
        assert!(res.is_some());
        let (pct, msg) = res.unwrap();
        assert_eq!(pct, 23.4);
        assert_eq!(msg, "of  12.34MiB at  1.23MiB/s ETA 00:10");
    }

    #[test]
    fn test_parse_progress_line_spacing() {
        let input = "[download]   0.1% of 100.0MiB";
        let res = parse_progress_line(input);
        assert!(res.is_some());
        let (pct, msg) = res.unwrap();
        assert_eq!(pct, 0.1);
        assert_eq!(msg, "of 100.0MiB");
    }

    #[test]
    fn test_parse_progress_line_ansi() {
        let input = "\x1b[0;32m[download]  45.6% of  100.00MiB\x1b[0m";
        let res = parse_progress_line(input);
        assert!(res.is_some());
        let (pct, msg) = res.unwrap();
        assert_eq!(pct, 45.6);
        assert_eq!(msg, "of  100.00MiB");
    }

    #[test]
    fn test_parse_progress_line_invalid() {
        let input = "[youtube] Extracting subtitles...";
        let res = parse_progress_line(input);
        assert!(res.is_none());
    }
}

