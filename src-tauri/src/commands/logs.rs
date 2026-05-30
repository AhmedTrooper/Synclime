use crate::AppEngineState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize, Clone)]
pub struct ErrorLog {
    pub slug: String,
    pub download_job_slug: String,
    pub command_executed: String,
    pub error_message: String,
    pub is_resolved: i32,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ParseLog {
    pub slug: String,
    pub parsed_file_slug: String,
    pub status: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub duration_ms: i64,
    pub command_executed: String,
    pub exit_code: Option<i32>,
    pub bytes_returned: i64,
}

#[tauri::command]
pub async fn get_error_logs(
    state: State<'_, AppEngineState>,
) -> Result<Vec<ErrorLog>, String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT slug, download_job_slug, command_executed, error_message, is_resolved, timestamp FROM error_logs ORDER BY timestamp DESC")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let iter = stmt
        .query_map([], |row| {
            Ok(ErrorLog {
                slug: row.get(0)?,
                download_job_slug: row.get(1)?,
                command_executed: row.get(2)?,
                error_message: row.get(3)?,
                is_resolved: row.get(4)?,
                timestamp: row.get(5)?,
            })
        })
        .map_err(|e| format!("Query failed: {}", e))?;

    let mut logs = Vec::new();
    for item in iter {
        if let Ok(log) = item {
            logs.push(log);
        }
    }
    Ok(logs)
}

#[tauri::command]
pub async fn get_parse_logs(
    state: State<'_, AppEngineState>,
) -> Result<Vec<ParseLog>, String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT slug, parsed_file_slug, status, started_at, finished_at, duration_ms, command_executed, exit_code, bytes_returned FROM parse_logs ORDER BY started_at DESC")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let iter = stmt
        .query_map([], |row| {
            Ok(ParseLog {
                slug: row.get(0)?,
                parsed_file_slug: row.get(1)?,
                status: row.get(2)?,
                started_at: row.get(3)?,
                finished_at: row.get(4)?,
                duration_ms: row.get(5)?,
                command_executed: row.get(6)?,
                exit_code: row.get(7)?,
                bytes_returned: row.get(8)?,
            })
        })
        .map_err(|e| format!("Query failed: {}", e))?;

    let mut logs = Vec::new();
    for item in iter {
        if let Ok(log) = item {
            logs.push(log);
        }
    }
    Ok(logs)
}

#[tauri::command]
pub async fn insert_error_log(
    state: State<'_, AppEngineState>,
    download_job_slug: String,
    command_executed: String,
    error_message: String,
) -> Result<(), String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    // Ensure a fallback record exists in download_jobs to satisfy NOT NULL foreign key constraints
    let _ = conn.execute(
        "INSERT OR IGNORE INTO download_jobs (slug, file_type, is_direct_url, is_from_playlist, base_download_path, status, format_string, created_at, updated_at) VALUES (?1, 'video', 1, 0, 'n/a', 'error', 'n/a', datetime('now'), datetime('now'));",
        params![download_job_slug],
    );

    let slug = format!("err_{}", chrono::Utc::now().timestamp_millis());
    let timestamp = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO error_logs (slug, download_job_slug, command_executed, error_message, is_resolved, timestamp) VALUES (?1, ?2, ?3, ?4, 0, ?5);",
        params![slug, download_job_slug, command_executed, error_message, timestamp],
    ).map_err(|e| format!("Failed to insert error log: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn insert_parse_log(
    state: State<'_, AppEngineState>,
    parsed_file_slug: String,
    status: String,
    started_at: String,
    finished_at: Option<String>,
    duration_ms: i64,
    command_executed: String,
    exit_code: Option<i32>,
    bytes_returned: i64,
) -> Result<(), String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    // Ensure a fallback record exists in parsed_files to satisfy foreign key constraints
    let _ = conn.execute(
        "INSERT OR IGNORE INTO parsed_files (slug, url, title, sanitized_title, is_playlist, created_at) VALUES (?1, 'n/a', 'Fallback Extraction Target', 'fallback', 0, datetime('now'));",
        params![parsed_file_slug],
    );

    let slug = format!("prse_{}", chrono::Utc::now().timestamp_millis());

    conn.execute(
        "INSERT INTO parse_logs (slug, parsed_file_slug, status, started_at, finished_at, duration_ms, command_executed, exit_code, bytes_returned) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9);",
        params![slug, parsed_file_slug, status, started_at, finished_at, duration_ms, command_executed, exit_code, bytes_returned],
    ).map_err(|e| format!("Failed to insert parse log: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn clear_all_logs(
    state: State<'_, AppEngineState>,
) -> Result<(), String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute("DELETE FROM error_logs", [])
        .map_err(|e| format!("Failed to clear error logs: {}", e))?;

    conn.execute("DELETE FROM parse_logs", [])
        .map_err(|e| format!("Failed to clear parse logs: {}", e))?;

    Ok(())
}
