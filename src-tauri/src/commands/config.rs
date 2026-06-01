use crate::AppEngineState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

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
pub async fn get_cookie_profiles(
    state: State<'_, AppEngineState>,
) -> Result<Vec<CookieProfile>, String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let mut stmt = conn.prepare("SELECT slug, title, domain, cookie_data, created_at, updated_at FROM cookie_profiles ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let iter = stmt
        .query_map([], |row| {
            Ok(CookieProfile {
                slug: row.get(0)?,
                title: row.get(1)?,
                domain: row.get(2)?,
                cookie_data: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("Query failed: {}", e))?;

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
    )
    .map_err(|e| format!("Failed to update cookie profile: {}", e))?;

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

    let tx = conn
        .transaction()
        .map_err(|e| format!("Transaction failed: {}", e))?;

    {
        let mut stmt = tx
            .prepare("DELETE FROM cookie_profiles WHERE slug = ?1")
            .map_err(|e| format!("Prepare failed: {}", e))?;

        for slug in slugs {
            stmt.execute(params![slug])
                .map_err(|e| format!("Failed to delete cookie profile '{}': {}", slug, e))?;
        }
    }

    tx.commit().map_err(|e| format!("Commit failed: {}", e))?;

    Ok(())
}

#[derive(Serialize, Deserialize)]
pub struct ProxyProfile {
    pub slug: String,
    pub title: String,
    pub proxy_string: String,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub async fn add_proxy_profile(
    state: State<'_, AppEngineState>,
    title: String,
    proxy_string: String,
) -> Result<String, String> {
    let slug = format!("px_{}", chrono::Utc::now().timestamp_millis());
    let now = chrono::Utc::now().to_rfc3339();

    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute(
        "INSERT INTO proxy_profiles (slug, title, proxy_string, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![slug, title, proxy_string, now, now],
    ).map_err(|e| format!("Failed to insert proxy profile: {}", e))?;

    Ok(slug)
}

#[tauri::command]
pub async fn get_proxy_profiles(
    state: State<'_, AppEngineState>,
) -> Result<Vec<ProxyProfile>, String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let mut stmt = conn.prepare("SELECT slug, title, proxy_string, created_at, updated_at FROM proxy_profiles ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let iter = stmt
        .query_map([], |row| {
            Ok(ProxyProfile {
                slug: row.get(0)?,
                title: row.get(1)?,
                proxy_string: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Query failed: {}", e))?;

    let mut profiles = Vec::new();
    for p in iter {
        if let Ok(profile) = p {
            profiles.push(profile);
        }
    }

    Ok(profiles)
}

#[tauri::command]
pub async fn update_proxy_data(
    state: State<'_, AppEngineState>,
    slug: String,
    proxy_string: String,
) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute(
        "UPDATE proxy_profiles SET proxy_string = ?1, updated_at = ?2 WHERE slug = ?3",
        params![proxy_string, now, slug],
    )
    .map_err(|e| format!("Failed to update proxy profile: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_proxy_profile(
    state: State<'_, AppEngineState>,
    slug: String,
) -> Result<(), String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute("DELETE FROM proxy_profiles WHERE slug = ?1", params![slug])
        .map_err(|e| format!("Failed to delete proxy profile: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn batch_delete_proxy_profiles(
    state: State<'_, AppEngineState>,
    slugs: Vec<String>,
) -> Result<(), String> {
    let mut conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("Transaction failed: {}", e))?;

    {
        let mut stmt = tx
            .prepare("DELETE FROM proxy_profiles WHERE slug = ?1")
            .map_err(|e| format!("Prepare failed: {}", e))?;

        for slug in slugs {
            stmt.execute(params![slug])
                .map_err(|e| format!("Failed to delete proxy profile '{}': {}", slug, e))?;
        }
    }

    tx.commit().map_err(|e| format!("Commit failed: {}", e))?;

    Ok(())
}

#[derive(Serialize, Deserialize)]
pub struct SiteConfig {
    pub slug: String,
    pub title: String,
    pub domain: String,
    pub cookie_profile_slug: Option<String>,
    pub proxy_profile_slug: Option<String>,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub async fn add_site_config(
    state: State<'_, AppEngineState>,
    title: String,
    domain: String,
    cookie_profile_slug: Option<String>,
    proxy_profile_slug: Option<String>,
    is_default: bool,
) -> Result<String, String> {
    let slug = format!("sc_{}", chrono::Utc::now().timestamp_millis());
    let now = chrono::Utc::now().to_rfc3339();

    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute(
        "INSERT INTO site_configs (slug, title, domain, cookie_profile_slug, proxy_profile_slug, is_default, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![slug, title, domain, cookie_profile_slug, proxy_profile_slug, if is_default { 1 } else { 0 }, now, now],
    ).map_err(|e| format!("Failed to insert site config: {}", e))?;

    Ok(slug)
}

#[tauri::command]
pub async fn get_site_configs(state: State<'_, AppEngineState>) -> Result<Vec<SiteConfig>, String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let mut stmt = conn.prepare("SELECT slug, title, domain, cookie_profile_slug, proxy_profile_slug, is_default, created_at, updated_at FROM site_configs ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let iter = stmt
        .query_map([], |row| {
            Ok(SiteConfig {
                slug: row.get(0)?,
                title: row.get(1)?,
                domain: row.get(2)?,
                cookie_profile_slug: row.get(3)?,
                proxy_profile_slug: row.get(4)?,
                is_default: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Query failed: {}", e))?;

    let mut configs = Vec::new();
    for c in iter {
        if let Ok(cfg) = c {
            configs.push(cfg);
        }
    }

    Ok(configs)
}

#[tauri::command]
pub async fn update_site_config(
    state: State<'_, AppEngineState>,
    slug: String,
    cookie_profile_slug: Option<String>,
    proxy_profile_slug: Option<String>,
) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute(
        "UPDATE site_configs SET cookie_profile_slug = ?1, proxy_profile_slug = ?2, updated_at = ?3 WHERE slug = ?4",
        params![cookie_profile_slug, proxy_profile_slug, now, slug],
    ).map_err(|e| format!("Failed to update site config: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_site_config(
    state: State<'_, AppEngineState>,
    slug: String,
) -> Result<(), String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute("DELETE FROM site_configs WHERE slug = ?1", params![slug])
        .map_err(|e| format!("Failed to delete site config: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn update_download_path(
    state: State<'_, AppEngineState>,
    path: String,
) -> Result<(), String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('download_path', ?1)",
        params![path],
    )
    .map_err(|e| format!("Failed to update download path: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_download_path(
    state: State<'_, AppEngineState>,
) -> Result<String, String> {
    let conn = rusqlite::Connection::open(&state.db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT value FROM app_settings WHERE key = 'download_path'")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let mut rows = stmt
        .query([])
        .map_err(|e| format!("Query failed: {}", e))?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let path: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(path)
    } else {
        Ok("".to_string())
    }
}
