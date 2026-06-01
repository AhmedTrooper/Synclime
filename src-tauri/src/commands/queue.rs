use crate::engine::process::execute_download_worker;
use crate::{AppEngineState, QueueSignal};
use tauri::{AppHandle, State};

#[derive(serde::Serialize)]
pub struct CommandResponse {
    pub success: bool,
    pub message: String,
}

// this function starts a download job in the background
#[tauri::command]
pub async fn trigger_job_start(
    app_handle: AppHandle,
    state: State<'_, AppEngineState>,
    job_slug: String,
) -> Result<CommandResponse, String> {
    let is_running = {
        let instances = state.active_processes.instances.read();
        instances.contains_key(&job_slug)
    };

    if is_running {
        return Ok(CommandResponse {
            success: true,
            message: "Job is already actively running in memory. Ignored duplicate trigger."
                .to_string(),
        });
    }

    {
        let conn = state.db_conn.lock();
        let _ = conn.execute(
            "UPDATE download_jobs SET status = 'downloading', tracking_message = NULL, updated_at = datetime('now') WHERE slug = ?1;",
            rusqlite::params![job_slug]
        );
    }

    let worker_slug = job_slug.clone();
    tauri::async_runtime::spawn(async move {
        let _ = execute_download_worker(app_handle, worker_slug).await;
    });

    Ok(CommandResponse {
        success: true,
        message: "Asynchronous download engine pipeline initialized successfully.".to_string(),
    })
}

// this function pauses a running download job
#[tauri::command]
pub async fn request_job_pause(
    state: State<'_, AppEngineState>,
    job_slug: String,
) -> Result<CommandResponse, String> {
    match state
        .signal_tx
        .send(QueueSignal::PauseJob(job_slug.clone()))
        .await
    {
        Ok(_) => {
            {
                let conn = state.db_conn.lock();
                let _ = conn.execute(
                    "UPDATE download_jobs SET status = 'paused', updated_at = datetime('now') WHERE slug = ?1;",
                    rusqlite::params![job_slug]
                );
            }

            Ok(CommandResponse {
                success: true,
                message: "Process cancellation interruption token dispatched successfully."
                    .to_string(),
            })
        }
        Err(e) => Ok(CommandResponse {
            success: false,
            message: format!(
                "Failed to route channel cancellation execution token: {}",
                e
            ),
        }),
    }
}

#[derive(serde::Deserialize)]
pub struct InsertJobPayload {
    pub slug: String,
    pub url: String,
    pub parsed_file_slug: Option<String>,
    pub file_type: String,
    pub associated_media_job_slug: Option<String>,
    pub format_string: String,
    pub download_path: String,
    pub created_at: String,
    pub is_from_playlist: Option<bool>,
    pub selected_subtitles: Option<String>,
    pub custom_title: Option<String>,
    pub site_config_slug: Option<String>,
}

// this function adds a new download task into database
#[tauri::command]
pub async fn insert_job_record(
    state: State<'_, AppEngineState>,
    payload: InsertJobPayload,
) -> Result<CommandResponse, String> {
    let conn = state.db_conn.lock();

    let mut cookie_profile_slug = None;
    let mut proxy_profile_slug = None;

    // 1. Resolve from site_config_slug passed in payload
    if let Some(ref slug) = payload.site_config_slug {
        let query = "SELECT cookie_profile_slug, proxy_profile_slug FROM site_configs WHERE slug = ?1;";
        if let Ok(mut stmt) = conn.prepare(query) {
            if let Ok(mut rows) = stmt.query(rusqlite::params![slug]) {
                if let Ok(Some(row)) = rows.next() {
                    cookie_profile_slug = row.get(0).ok();
                    proxy_profile_slug = row.get(1).ok();
                }
            }
        }
    }
    
    // 2. Fallback: Resolve from the parsed file itself if no site_config_slug was passed
    if cookie_profile_slug.is_none() && proxy_profile_slug.is_none() {
        if let Some(ref parsed_slug) = payload.parsed_file_slug {
            let query = "
                SELECT sc.cookie_profile_slug, sc.proxy_profile_slug
                FROM parsed_files p
                JOIN site_configs sc ON p.site_config_slug = sc.slug
                WHERE p.slug = ?1;
            ";
            if let Ok(mut stmt) = conn.prepare(query) {
                if let Ok(mut rows) = stmt.query(rusqlite::params![parsed_slug]) {
                    if let Ok(Some(row)) = rows.next() {
                        cookie_profile_slug = row.get(0).ok();
                        proxy_profile_slug = row.get(1).ok();
                    }
                }
            }
        }
    }

    let row = crate::database::operations::DownloadJobRow {
        slug: payload.slug,
        parsed_file_slug: payload.parsed_file_slug.clone(),
        file_type: payload.file_type,
        associated_media_job_slug: payload.associated_media_job_slug,
        is_direct_url: if payload.parsed_file_slug.is_some() {
            0
        } else {
            1
        },
        direct_url: Some(payload.url),
        is_from_playlist: if payload.is_from_playlist.unwrap_or(false) {
            1
        } else {
            0
        },
        current_part: 1,
        total_parts: 1,
        base_download_path: payload.download_path,
        custom_download_path: payload.custom_title,
        cookie_profile_slug,
        proxy_profile_slug,
        status: "pending".to_string(),
        format_string: payload.format_string,
        audio_format: None,
        video_format: None,
        selected_subtitles: payload.selected_subtitles,
        created_at: payload.created_at.clone(),
        updated_at: payload.created_at,
    };

    match crate::database::operations::create_download_job(&conn, &row) {
        Ok(_) => Ok(CommandResponse {
            success: true,
            message: "Job inserted into SQLite registry successfully.".to_string(),
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            message: e.0,
        }),
    }
}

// this function removes a download task from database
#[tauri::command]
pub async fn delete_job_record(
    state: State<'_, AppEngineState>,
    job_slug: String,
) -> Result<CommandResponse, String> {
    let conn = state.db_conn.lock();
    match crate::database::operations::delete_download_job(&conn, &job_slug) {
        Ok(_) => Ok(CommandResponse {
            success: true,
            message: "Job dropped from SQLite registry successfully.".to_string(),
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            message: e.0,
        }),
    }
}

// this function deletes all download tasks from database
#[tauri::command]
pub async fn clear_all_jobs_records(
    state: State<'_, AppEngineState>,
) -> Result<CommandResponse, String> {
    let conn = state.db_conn.lock();
    match crate::database::operations::clear_all_download_jobs(&conn) {
        Ok(_) => Ok(CommandResponse {
            success: true,
            message: "All jobs dropped from SQLite registry successfully.".to_string(),
        }),
        Err(e) => Ok(CommandResponse {
            success: false,
            message: e.0,
        }),
    }
}

#[derive(serde::Serialize)]
pub struct FrontDownloadJob {
    pub slug: String,
    pub name: String,
    pub url: String,
    pub progress: f64,
    pub status: String,
    pub message: String,
    #[serde(rename = "fileType")]
    pub file_type: String,
    #[serde(rename = "formatString")]
    pub format_string: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "associatedMediaJobSlug")]
    pub associated_media_job_slug: Option<String>,
    #[serde(rename = "parsedFileSlug")]
    pub parsed_file_slug: Option<String>,
    #[serde(rename = "isPlaylist")]
    pub is_playlist: bool,
    #[serde(rename = "playlistName")]
    pub playlist_name: Option<String>,
    #[serde(rename = "parentPlaylistSlug")]
    pub parent_playlist_slug: Option<String>,
}

// this function gets all download tasks so frontend can show them
#[tauri::command]
pub async fn get_all_jobs(
    state: State<'_, AppEngineState>,
) -> Result<Vec<FrontDownloadJob>, String> {
    let conn = state.db_conn.lock();

    let query = "
        SELECT
            j.slug,
            COALESCE(j.custom_download_path, p.title, j.direct_url, 'Unknown File') as name,
            COALESCE(j.direct_url, p.url) as url,
            j.progress,
            j.status,
            COALESCE(j.tracking_message, '') as message,
            j.file_type,
            j.format_string,
            j.created_at,
            j.associated_media_job_slug,
            j.parsed_file_slug,
            COALESCE(p.is_playlist, 0) as is_playlist,
            COALESCE(p.playlist_name, p.title, 'Playlist Batch') as playlist_name,
            p.parent_playlist_slug
        FROM download_jobs j
        LEFT JOIN parsed_files p ON j.parsed_file_slug = p.slug
        WHERE j.slug != 'app_fallback'
        ORDER BY j.created_at DESC;
    ";

    let mut stmt = match conn.prepare(query) {
        Ok(s) => s,
        Err(e) => return Err(e.to_string()),
    };

    let mut rows = match stmt.query([]) {
        Ok(r) => r,
        Err(e) => return Err(e.to_string()),
    };

    let mut jobs = Vec::new();
    while let Ok(Some(row)) = rows.next() {
        jobs.push(FrontDownloadJob {
            slug: row.get(0).unwrap_or_default(),
            name: row.get(1).unwrap_or_default(),
            url: row.get(2).unwrap_or_default(),
            progress: row.get(3).unwrap_or_default(),
            status: row.get(4).unwrap_or_default(),
            message: row.get(5).unwrap_or_default(),
            file_type: row.get(6).unwrap_or_default(),
            format_string: row.get(7).ok(),
            created_at: row.get(8).unwrap_or_default(),
            associated_media_job_slug: row.get(9).ok(),
            parsed_file_slug: row.get(10).ok(),
            is_playlist: row.get::<_, i32>(11).unwrap_or(0) == 1,
            playlist_name: row.get(12).ok(),
            parent_playlist_slug: row.get(13).ok(),
        });
    }

    Ok(jobs)
}

// this function opens the folder where the downloaded file is saved
#[tauri::command]
pub async fn reveal_job_in_explorer(
    state: State<'_, AppEngineState>,
    job_slug: String,
) -> Result<CommandResponse, String> {
    let config = {
        let conn = state.db_conn.lock();
        match crate::engine::process::resolve_job_parameters(&conn, &job_slug) {
            Ok(cfg) => cfg,
            Err(e) => return Err(e),
        }
    };

    if let Err(e) = opener::open(&config.resolved_path) {
        return Err(format!("Native OS failed to open path: {}", e));
    }

    Ok(CommandResponse {
        success: true,
        message: "Successfully opened natively.".to_string(),
    })
}

// this function opens the folder in your operating system
#[tauri::command]
pub async fn reveal_folder_in_explorer(
    path: String,
) -> Result<CommandResponse, String> {
    let mut final_path = std::path::PathBuf::from(&path);
    if final_path.file_name().map(|n| n.to_string_lossy().to_string().to_lowercase()) != Some("synclime".to_string()) {
        final_path = final_path.join("Synclime");
    }

    if !final_path.exists() {
        let _ = std::fs::create_dir_all(&final_path);
    }

    if let Err(e) = opener::open(&final_path) {
        return Err(format!("Native OS failed to open path: {}", e));
    }

    Ok(CommandResponse {
        success: true,
        message: "Successfully opened folder natively.".to_string(),
    })
}

// this function updates how many downloads can run at same time
#[tauri::command]
pub async fn update_concurrency_limit(
    state: State<'_, AppEngineState>,
    limit: usize,
) -> Result<CommandResponse, String> {
    {
        let conn = state.db_conn.lock();
        let _ = conn.execute(
            "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('concurrency_limit', ?1);",
            rusqlite::params![limit.to_string()]
        );
    }

    {
        let mut lock = state.pool_semaphore.write();
        *lock = std::sync::Arc::new(tokio::sync::Semaphore::new(limit));
    }

    Ok(CommandResponse { success: true, message: "Concurrency limit updated.".to_string() })
}

// this function gets the max number of parallel downloads
#[tauri::command]
pub async fn get_concurrency_limit(
    state: State<'_, AppEngineState>,
) -> Result<usize, String> {
    {
        let conn = state.db_conn.lock();
        if let Ok(val) = conn.query_row("SELECT value FROM app_settings WHERE key = 'concurrency_limit'", [], |row| row.get::<_, String>(0)) {
            if let Ok(parsed) = val.parse::<usize>() {
                return Ok(parsed);
            }
        }
    }
    Ok(3)
}

// this function updates how many parts to download at once
#[tauri::command]
pub async fn update_download_chunks(
    state: State<'_, AppEngineState>,
    chunks: usize,
) -> Result<CommandResponse, String> {
    {
        let conn = state.db_conn.lock();
        let _ = conn.execute(
            "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('download_chunks', ?1);",
            rusqlite::params![chunks.to_string()]
        );
    }

    Ok(CommandResponse { success: true, message: "Download chunks updated.".to_string() })
}

// this function gets the chunk count for speed settings
#[tauri::command]
pub async fn get_download_chunks(
    state: State<'_, AppEngineState>,
) -> Result<usize, String> {
    {
        let conn = state.db_conn.lock();
        if let Ok(val) = conn.query_row("SELECT value FROM app_settings WHERE key = 'download_chunks'", [], |row| row.get::<_, String>(0)) {
            if let Ok(parsed) = val.parse::<usize>() {
                return Ok(parsed);
            }
        }
    }
    Ok(4)
}
