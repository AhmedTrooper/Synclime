use crate::engine::process::execute_download_worker;
use crate::{AppEngineState, QueueSignal};
use tauri::{AppHandle, State};

#[derive(serde::Serialize)]
pub struct CommandResponse {
    pub success: bool,
    pub message: String,
}

/// Tauri IPC Command: Safe background handler to initialize an extraction task line thread
#[tauri::command]
pub async fn trigger_job_start(
    app_handle: AppHandle,
    state: State<'_, AppEngineState>,
    job_slug: String,
) -> Result<CommandResponse, String> {
    // 1. Check the true in-memory registry to see if the process is currently alive
    // This entirely bypasses SQLite disk-write lag race conditions where a killed worker
    // hasn't finished writing its 'paused' state yet.
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

    // 2. Safely enforce the downloading state in SQLite now that we know it's not running
    {
        let conn = state.db_conn.lock();
        let _ = conn.execute(
            "UPDATE download_jobs SET status = 'downloading', updated_at = datetime('now') WHERE slug = ?1;",
            rusqlite::params![job_slug]
        );
    }

    // 3. Offload the heavy execution tracking thread task safely onto Tauri's managed background worker pool
    let worker_slug = job_slug.clone();
    tauri::async_runtime::spawn(async move {
        let _ = execute_download_worker(app_handle, worker_slug).await;
    });

    Ok(CommandResponse {
        success: true,
        message: "Asynchronous download engine pipeline initialized successfully.".to_string(),
    })
}

/// Tauri IPC Command: Safe multi-threaded handler to halt an active downloading shell container process
#[tauri::command]
pub async fn request_job_pause(
    state: State<'_, AppEngineState>,
    job_slug: String,
) -> Result<CommandResponse, String> {
    // 1. Pipe a Pause signal into our thread-isolated channel worker pipeline
    match state
        .signal_tx
        .send(QueueSignal::PauseJob(job_slug.clone()))
        .await
    {
        Ok(_) => {
            // 2. Cleanly reflect the 'paused' state change status back down into SQLite records immediately
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
}

/// Tauri IPC Command: Injects a brand new download job directly into the SQLite database securely
#[tauri::command]
pub async fn insert_job_record(
    state: State<'_, AppEngineState>,
    payload: InsertJobPayload,
) -> Result<CommandResponse, String> {
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
        cookie_profile_slug: None,
        proxy_profile_slug: None,
        status: "pending".to_string(),
        format_string: payload.format_string,
        audio_format: None,
        video_format: None,
        selected_subtitles: payload.selected_subtitles,
        created_at: payload.created_at.clone(),
        updated_at: payload.created_at,
    };

    let conn = state.db_conn.lock();
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

/// Tauri IPC Command: Drops a single download job from the SQLite database
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

/// Tauri IPC Command: Clears all download jobs completely from the SQLite database
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

#[tauri::command]
pub async fn update_concurrency_limit(
    state: State<'_, AppEngineState>,
    limit: usize,
) -> Result<CommandResponse, String> {
    if let Ok(conn) = rusqlite::Connection::open(&state.db_path) {
        let _ = conn.execute(
            "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('concurrency_limit', ?1);",
            rusqlite::params![limit.to_string()]
        );
    }

    // Dynamic Concurrency Resizing: Update the active in-memory semaphore!
    {
        let mut lock = state.pool_semaphore.write();
        *lock = std::sync::Arc::new(tokio::sync::Semaphore::new(limit));
    }

    Ok(CommandResponse { success: true, message: "Concurrency limit updated.".to_string() })
}

#[tauri::command]
pub async fn get_concurrency_limit(
    state: State<'_, AppEngineState>,
) -> Result<usize, String> {
    if let Ok(conn) = rusqlite::Connection::open(&state.db_path) {
        if let Ok(val) = conn.query_row("SELECT value FROM app_settings WHERE key = 'concurrency_limit'", [], |row| row.get::<_, String>(0)) {
            if let Ok(parsed) = val.parse::<usize>() {
                return Ok(parsed);
            }
        }
    }
    Ok(3)
}
