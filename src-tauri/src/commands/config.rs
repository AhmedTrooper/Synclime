use serde::{Deserialize, Serialize};
use tauri::State;
use rusqlite::params;
use crate::AppEngineState;

#[derive(Serialize, Deserialize)]
pub struct CookieProfile {
    pub slug: String,
    pub title: String,
    pub domain: String,
    pub cookie_data: String,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub async fn add_cookie_profile(
    state: State<'_, AppEngineState>,
    title: String,
    domain: String,
    cookie_data: String,
) -> Result<String, String> {
    let slug = format!("cp_{}", chrono::Utc::now().timestamp_millis());
    let now = chrono::Utc::now().to_rfc3339();

    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute(
        "INSERT INTO cookie_profiles (slug, title, domain, cookie_data, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![slug, title, domain, cookie_data, now, now],
    ).map_err(|e| format!("Failed to insert cookie profile: {}", e))?;

    Ok(slug)
}

#[tauri::command]
pub async fn get_cookie_profiles(state: State<'_, AppEngineState>) -> Result<Vec<CookieProfile>, String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let mut stmt = conn.prepare("SELECT slug, title, domain, cookie_data, created_at, updated_at FROM cookie_profiles ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let iter = stmt.query_map([], |row| {
        Ok(CookieProfile {
            slug: row.get(0)?,
            title: row.get(1)?,
            domain: row.get(2)?,
            cookie_data: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }).map_err(|e| format!("Query failed: {}", e))?;

    let mut profiles = Vec::new();
    for p in iter {
        if let Ok(profile) = p {
            profiles.push(profile);
        }
    }

    Ok(profiles)
}

#[tauri::command]
pub async fn update_cookie_data(
    state: State<'_, AppEngineState>,
    slug: String,
    cookie_data: String,
) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute(
        "UPDATE cookie_profiles SET cookie_data = ?1, updated_at = ?2 WHERE slug = ?3",
        params![cookie_data, now, slug],
    ).map_err(|e| format!("Failed to update cookie profile: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_cookie_profile(
    state: State<'_, AppEngineState>,
    slug: String,
) -> Result<(), String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute("DELETE FROM cookie_profiles WHERE slug = ?1", params![slug])
        .map_err(|e| format!("Failed to delete cookie profile: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn batch_delete_cookie_profiles(
    state: State<'_, AppEngineState>,
    slugs: Vec<String>,
) -> Result<(), String> {
    let mut conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let tx = conn.transaction().map_err(|e| format!("Transaction failed: {}", e))?;
    
    {
        let mut stmt = tx.prepare("DELETE FROM cookie_profiles WHERE slug = ?1")
            .map_err(|e| format!("Prepare failed: {}", e))?;
            
        for slug in slugs {
            let _ = stmt.execute(params![slug]);
        }
    }
    
    tx.commit().map_err(|e| format!("Commit failed: {}", e))?;
    
    Ok(())
}
