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
            message: "Job is already actively running in memory. Ignored duplicate trigger.".to_string(),
        });
    }

    // 2. Safely enforce the downloading state in SQLite now that we know it's not running
    if let Ok(conn) = rusqlite::Connection::open(&state.db_path) {
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
            if let Ok(conn) = rusqlite::Connection::open(&state.db_path) {
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
        is_direct_url: if payload.parsed_file_slug.is_some() { 0 } else { 1 },
        direct_url: Some(payload.url),
        is_from_playlist: 0,
        current_part: 1,
        total_parts: 1,
        base_download_path: payload.download_path,
        custom_download_path: None,
        cookie_profile_slug: None,
        proxy_profile_slug: None,
        status: "pending".to_string(),
        format_string: payload.format_string,
        audio_format: None,
        video_format: None,
        selected_subtitles: None,
        created_at: payload.created_at.clone(),
        updated_at: payload.created_at,
    };

    match crate::database::operations::create_download_job(&state.db_path, &row) {
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
    match crate::database::operations::delete_download_job(&state.db_path, &job_slug) {
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
    match crate::database::operations::clear_all_download_jobs(&state.db_path) {
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
