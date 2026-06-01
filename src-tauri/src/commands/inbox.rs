use crate::AppEngineState;
use tauri::{AppHandle, Emitter, State};

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct InboxUrlRow {
    pub slug: String,
    pub url: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(serde::Serialize)]
pub struct InboxResponse {
    pub success: bool,
    pub message: String,
    pub slug: Option<String>,
}

// this function gets all links in inbox from database, newest first
#[tauri::command]
pub async fn get_inbox_urls(state: State<'_, AppEngineState>) -> Result<Vec<InboxUrlRow>, String> {
    let conn = state.db_conn.lock();
    let mut stmt = conn
        .prepare("SELECT slug, url, status, created_at, updated_at FROM inbox_urls ORDER BY created_at DESC;")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(InboxUrlRow {
                slug: row.get(0)?,
                url: row.get(1)?,
                status: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(item) = r {
            list.push(item);
        }
    }
    Ok(list)
}

// this function gets only one inbox link by its special name slug
#[tauri::command]
pub async fn get_inbox_url_by_slug(
    state: State<'_, AppEngineState>,
    slug: String,
) -> Result<Option<InboxUrlRow>, String> {
    let conn = state.db_conn.lock();
    let mut stmt = conn
        .prepare("SELECT slug, url, status, created_at, updated_at FROM inbox_urls WHERE slug = ?1;")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map(rusqlite::params![slug], |row| {
            Ok(InboxUrlRow {
                slug: row.get(0)?,
                url: row.get(1)?,
                status: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    if let Some(res) = rows.next() {
        let item = res.map_err(|e| e.to_string())?;
        Ok(Some(item))
    } else {
        Ok(None)
    }
}

// this function saves a new url in the inbox and tells the front page
#[tauri::command]
pub async fn add_inbox_url(
    app_handle: AppHandle,
    state: State<'_, AppEngineState>,
    url: String,
    slug: Option<String>,
) -> Result<InboxResponse, String> {
    let target_slug = slug.unwrap_or_else(|| format!("inbox-{}", chrono::Utc::now().timestamp_millis()));
    let conn = state.db_conn.lock();

    let query = "
        INSERT OR IGNORE INTO inbox_urls (slug, url, status, created_at, updated_at)
        VALUES (?1, ?2, 'pending', datetime('now'), datetime('now'));
    ";

    match conn.execute(query, rusqlite::params![target_slug, url]) {
        Ok(rows_affected) => {
            if rows_affected > 0 {
                let _ = app_handle.emit("inbox-updated", ());
                Ok(InboxResponse {
                    success: true,
                    message: "URL successfully added to inbox.".to_string(),
                    slug: Some(target_slug),
                })
            } else {
                Ok(InboxResponse {
                    success: false,
                    message: "URL already exists in inbox.".to_string(),
                    slug: None,
                })
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

// this function changes the status of url, like parsed or downloading
#[tauri::command]
pub async fn update_inbox_status(
    app_handle: AppHandle,
    state: State<'_, AppEngineState>,
    slug: String,
    status: String,
) -> Result<InboxResponse, String> {
    if status != "pending" && status != "parsed" && status != "downloaded" {
        return Err("Invalid inbox status. Must be pending, parsed, or downloaded.".to_string());
    }

    let conn = state.db_conn.lock();
    let query = "UPDATE inbox_urls SET status = ?1, updated_at = datetime('now') WHERE slug = ?2;";

    match conn.execute(query, rusqlite::params![status, slug]) {
        Ok(rows) => {
            if rows > 0 {
                let _ = app_handle.emit("inbox-updated", ());
                Ok(InboxResponse {
                    success: true,
                    message: format!("Inbox item status updated to {}.", status),
                    slug: Some(slug),
                })
            } else {
                Ok(InboxResponse {
                    success: false,
                    message: "No inbox item matched the provided slug.".to_string(),
                    slug: None,
                })
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct AppUpdateItem {
    pub version_slug: String,
    pub application_online_version: String,
    pub date: String,
    pub features: Vec<String>,
    pub fixes: Vec<String>,
    pub severity: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct AppUpdatesSchema {
    pub latest_update: String,
    pub updates: Vec<AppUpdateItem>,
}

// this function reads the update file updates.json on your computer if offline
#[tauri::command]
pub async fn get_local_updates() -> Result<AppUpdatesSchema, String> {
    let data = std::fs::read_to_string("updates.json")
        .or_else(|_| std::fs::read_to_string("../updates.json"))
        .map_err(|e| format!("Failed to read updates.json: {}", e))?;

    let parsed: AppUpdatesSchema = serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse updates.json: {}", e))?;

    Ok(parsed)
}

// this function deletes a url from your inbox completely
#[tauri::command]
pub async fn delete_inbox_url(
    app_handle: AppHandle,
    state: State<'_, AppEngineState>,
    slug: String,
) -> Result<InboxResponse, String> {
    let conn = state.db_conn.lock();
    match conn.execute("DELETE FROM inbox_urls WHERE slug = ?1;", rusqlite::params![slug]) {
        Ok(rows) => {
            if rows > 0 {
                let _ = app_handle.emit("inbox-updated", ());
                Ok(InboxResponse {
                    success: true,
                    message: "Inbox item deleted successfully.".to_string(),
                    slug: Some(slug),
                })
            } else {
                Ok(InboxResponse {
                    success: false,
                    message: "No inbox item matched the provided slug.".to_string(),
                    slug: None,
                })
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

// this function gets new updates from github online, very safe no cors problem!
#[tauri::command]
pub async fn get_online_updates() -> Result<AppUpdatesSchema, String> {
    let client = reqwest::Client::new();
    let url = "https://raw.githubusercontent.com/AhmedTrooper/Synclime/main/updates.json";
    
    let response = client
        .get(url)
        .header("User-Agent", "Synclime-Desktop-App")
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned error code: {}", response.status()));
    }

    let parsed: AppUpdatesSchema = response
        .json::<AppUpdatesSchema>()
        .await
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;

    Ok(parsed)
}

// this function asks database what port our API server is using
#[tauri::command]
pub async fn get_active_api_port(state: State<'_, AppEngineState>) -> Result<u16, String> {
    let conn = state.db_conn.lock();
    let val: String = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'active_api_port';",
        [],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    let port = val.parse::<u16>().map_err(|_| "Invalid port parsed from SQLite settings".to_string())?;
    Ok(port)
}
