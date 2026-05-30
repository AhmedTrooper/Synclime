use crate::engine::structures::{parse_extraction_payload, DiscoveryResult};
use crate::AppEngineState;
use rusqlite::{params, Connection};
use std::process::Stdio;
use tauri::AppHandle;
use tauri::Manager; // FIXED: Brought the Manager trait into scope to activate .state() lookups
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(serde::Serialize)]
pub struct DiscoveryResponse {
    pub success: bool,
    pub payload: Option<DiscoveryResult>,
    pub error_message: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct InsertParsedFilePayload {
    pub slug: String,
    pub url: String,
    pub title: String,
    pub sanitized_title: String,
    pub is_playlist: i32,
    pub parent_playlist_slug: Option<String>,
    pub playlist_name: Option<String>,
    pub sanitized_playlist_name: Option<String>,
    pub json_metadata: Option<String>,
    pub created_at: String,
    pub site_config_slug: Option<String>,
}

/// Tauri IPC Command: Saves a parsed video/playlist directly to the parsed_files SQLite table
#[tauri::command]
pub async fn insert_parsed_file(
    state: tauri::State<'_, AppEngineState>,
    payload: InsertParsedFilePayload,
) -> Result<crate::commands::queue::CommandResponse, String> {
    let row = crate::database::operations::ParsedFileRow {
        slug: payload.slug,
        url: payload.url,
        title: payload.title,
        sanitized_title: payload.sanitized_title,
        is_playlist: payload.is_playlist,
        parent_playlist_slug: payload.parent_playlist_slug,
        playlist_name: payload.playlist_name,
        sanitized_playlist_name: payload.sanitized_playlist_name,
        json_metadata: payload.json_metadata,
        created_at: payload.created_at,
        site_config_slug: payload.site_config_slug,
    };

    match crate::database::operations::save_parsed_file(&state.db_path, &row) {
        Ok(_) => Ok(crate::commands::queue::CommandResponse {
            success: true,
            message: "Parsed file registered in SQLite successfully.".to_string(),
        }),
        Err(e) => Ok(crate::commands::queue::CommandResponse {
            success: false,
            message: e.0,
        }),
    }
}

struct OptionalSiteConfig {
    cookie_data: Option<String>,
    proxy_string: Option<String>,
}

/// Dynamic Configuration Resolver: Queries SQLite site config directly using selected site config slug
fn resolve_selected_site_configs(db_path: &std::path::Path, slug: &str) -> OptionalSiteConfig {
    let mut config = OptionalSiteConfig {
        cookie_data: None,
        proxy_string: None,
    };

    if let Ok(conn) = Connection::open(db_path) {
        let query = "
            SELECT c.cookie_data, pr.proxy_string
            FROM site_configs s
            LEFT JOIN cookie_profiles c ON s.cookie_profile_slug = c.slug
            LEFT JOIN proxy_profiles pr ON s.proxy_profile_slug = pr.slug
            WHERE s.slug = ?1;
        ";

        if let Ok(mut stmt) = conn.prepare(query) {
            if let Ok(mut rows) = stmt.query(params![slug]) {
                if let Ok(Some(row)) = rows.next() {
                    config.cookie_data = row.get(0).ok();
                    config.proxy_string = row.get(1).ok();
                }
            }
        }
    }
    config
}

/// Tauri IPC Command: Spawns a high-speed json extraction worker pool thread to read site parameters
#[tauri::command]
pub async fn discover_asset_metadata(
    app_handle: AppHandle,
    target_url: String,
    site_config_slug: Option<String>,
) -> Result<DiscoveryResponse, String> {
    let state = app_handle.state::<AppEngineState>();

    // 1. Automatically fetch proxy and cookie parameters from the selected site configuration
    let site_config = if let Some(ref slug) = site_config_slug {
        resolve_selected_site_configs(&state.db_path, slug)
    } else {
        OptionalSiteConfig {
            cookie_data: None,
            proxy_string: None,
        }
    };

    // 2. Assemble optimized yt-dlp arguments for safe structural metadata extraction
    let mut cmd = Command::new("yt-dlp");
    cmd.arg("--dump-single-json");
    cmd.arg("--flat-playlist"); // Enables instantaneous metadata extraction for 100+ item playlists

    if let Some(ref proxy) = site_config.proxy_string {
        cmd.arg("--proxy").arg(proxy);
    }

    let mut temp_cookie_path = None;
    if let Some(ref cookies) = site_config.cookie_data {
        let temp_dir = std::env::temp_dir();
        let unique_id = chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0);
        let unique_name = format!("synclime_cookie_{}.txt", unique_id);
        let file_path = temp_dir.join(unique_name);
        if std::fs::write(&file_path, cookies).is_ok() {
            cmd.arg("--cookies").arg(&file_path);
            temp_cookie_path = Some(file_path);
        }
    }

    struct CookieFileCleanup(Option<std::path::PathBuf>);
    impl Drop for CookieFileCleanup {
        fn drop(&mut self) {
            if let Some(ref path) = self.0 {
                let _ = std::fs::remove_file(path);
            }
        }
    }
    let _cleanup_guard = CookieFileCleanup(temp_cookie_path);

    cmd.arg(&target_url);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    // 3. Spawn the child container process safely
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(err) => {
            return Ok(DiscoveryResponse {
                success: false,
                payload: None,
                error_message: Some(format!(
                    "Failed to initialize extraction sub-engine: {}",
                    err
                )),
            })
        }
    };

    let stdout_pipe = match child.stdout.take() {
        Some(out) => out,
        None => {
            return Ok(DiscoveryResponse {
                success: false,
                payload: None,
                error_message: Some(
                    "Failed to hook standard output allocation handle.".to_string(),
                ),
            })
        }
    };

    let stderr_pipe = child.stderr.take();

    // 4. In-Memory Aggregator: Read the json text stream lines chunk-by-chunk
    let mut reader = BufReader::new(stdout_pipe).lines();
    let mut raw_json_accumulator = String::new();

    while let Ok(Some(line)) = reader.next_line().await {
        raw_json_accumulator.push_str(&line);
    }

    // Await process exit completion status safely
    let _ = child.wait().await;

    if raw_json_accumulator.is_empty() {
        let mut stderr_msg = String::new();
        if let Some(stderr) = stderr_pipe {
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

        let final_err = if stderr_msg.is_empty() {
            "Extraction sub-engine returned a completely empty stream buffer data block.".to_string()
        } else {
            format!("yt-dlp error: {}", stderr_msg)
        };

        return Ok(DiscoveryResponse {
            success: false,
            payload: None,
            error_message: Some(final_err),
        });
    }

    // 5. Evaluate accumulator data through our resilient fallback property prober engine
    match parse_extraction_payload(&raw_json_accumulator) {
        Ok(discovery_variant) => Ok(DiscoveryResponse {
            success: true,
            payload: Some(discovery_variant),
            error_message: None,
        }),
        Err(parse_err) => Ok(DiscoveryResponse {
            success: false,
            payload: None,
            error_message: Some(parse_err),
        }),
    }
}
