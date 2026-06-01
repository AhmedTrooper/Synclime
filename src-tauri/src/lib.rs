use parking_lot::RwLock;
use rusqlite::Connection;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
use std::collections::HashMap;
use std::fs;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tokio::process::Child;
use tokio::sync::{mpsc, Semaphore};

pub mod commands;
pub mod database;
pub mod engine;

pub enum QueueSignal {
    PauseJob(String),
}

pub struct ActiveProcessRegistry {
    pub instances: Arc<RwLock<HashMap<String, Child>>>,
}

pub struct ProgressSnapshot {
    pub progress: f64,
    pub status_message: String,
    pub status: String,
}

pub struct AppEngineState {
    pub pool_semaphore: Arc<parking_lot::RwLock<Arc<Semaphore>>>,
    pub db_path: std::path::PathBuf,
    pub db_conn: Arc<parking_lot::Mutex<Connection>>,
    pub active_processes: Arc<ActiveProcessRegistry>,
    pub signal_tx: mpsc::Sender<QueueSignal>,
    pub progress_cache: Arc<parking_lot::Mutex<HashMap<String, ProgressSnapshot>>>,
}

const DATABASE_MIGRATION_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS cookie_profiles (
    slug TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    cookie_data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proxy_profiles (
    slug TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    proxy_string TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_configs (
    slug TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    cookie_profile_slug TEXT REFERENCES cookie_profiles(slug) ON DELETE SET NULL,
    proxy_profile_slug TEXT REFERENCES proxy_profiles(slug) ON DELETE SET NULL,
    is_default INTEGER NOT NULL CHECK (is_default IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('concurrency_limit', '3');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('download_chunks', '4');

CREATE TABLE IF NOT EXISTS parsed_files (
    slug TEXT PRIMARY KEY NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    sanitized_title TEXT NOT NULL,
    is_playlist INTEGER NOT NULL CHECK (is_playlist IN (0, 1)),
    parent_playlist_slug REFERENCES parsed_files(slug) ON DELETE SET NULL,
    playlist_name TEXT,
    sanitized_playlist_name TEXT,
    json_metadata TEXT,
    created_at TEXT NOT NULL,
    site_config_slug TEXT REFERENCES site_configs(slug) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS download_jobs (
    slug TEXT PRIMARY KEY NOT NULL,
    parsed_file_slug TEXT REFERENCES parsed_files(slug) ON DELETE SET NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('video', 'audio', 'subtitle', 'direct_document')),
    associated_media_job_slug TEXT REFERENCES download_jobs(slug) ON DELETE CASCADE,
    is_direct_url INTEGER NOT NULL CHECK (is_direct_url IN (0, 1)),
    direct_url TEXT,
    is_from_playlist INTEGER NOT NULL CHECK (is_from_playlist IN (0, 1)),
    current_part INTEGER NOT NULL DEFAULT 1,
    total_parts INTEGER NOT NULL DEFAULT 1,
    base_download_path TEXT NOT NULL,
    custom_download_path TEXT,
    cookie_profile_slug TEXT REFERENCES cookie_profiles(slug) ON DELETE SET NULL,
    proxy_profile_slug TEXT REFERENCES proxy_profiles(slug) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'downloading', 'paused', 'completed', 'error')),
    progress REAL NOT NULL DEFAULT 0.00,
    tracking_message TEXT,
    format_string TEXT NOT NULL,
    audio_format TEXT,
    video_format TEXT,
    selected_subtitles TEXT,
    last_pid INTEGER NOT NULL DEFAULT 0,
    priority_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    resumed_at TEXT,
    restarted_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parse_logs (
    slug TEXT PRIMARY KEY NOT NULL,
    parsed_file_slug TEXT NOT NULL REFERENCES parsed_files(slug) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    started_at TEXT NOT NULL,
    finished_at TEXT,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    command_executed TEXT NOT NULL,
    exit_code INTEGER,
    bytes_returned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS error_logs (
    slug TEXT PRIMARY KEY NOT NULL,
    download_job_slug TEXT NOT NULL REFERENCES download_jobs(slug) ON DELETE CASCADE,
    command_executed TEXT NOT NULL,
    error_message TEXT NOT NULL,
    is_resolved INTEGER NOT NULL CHECK (is_resolved IN (0, 1)),
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parsed_files_parent ON parsed_files (parent_playlist_slug) WHERE parent_playlist_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_download_jobs_parsed_file ON download_jobs (parsed_file_slug) WHERE parsed_file_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_download_jobs_subtitles ON download_jobs (associated_media_job_slug) WHERE file_type = 'subtitle' AND associated_media_job_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_download_jobs_queue_priority ON download_jobs (status, priority_index DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS inbox_urls (
    slug TEXT PRIMARY KEY NOT NULL,
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'parsed', 'downloaded')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"#;

fn initialize_database(app: &tauri::App) -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    let app_dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(e) => return Err(Box::new(e)),
    };

    if !app_dir.exists() {
        if let Err(e) = fs::create_dir_all(&app_dir) {
            return Err(Box::new(e));
        }
    }

    let db_path = app_dir.join("synclime_core.db");
    let conn = match Connection::open(&db_path) {
        Ok(c) => c,
        Err(e) => return Err(Box::new(e)),
    };

    if let Err(e) = conn.execute("PRAGMA foreign_keys = ON;", []) {
        return Err(Box::new(e));
    }

    if let Err(e) = conn.execute_batch(DATABASE_MIGRATION_SCHEMA) {
        return Err(Box::new(e));
    }

    // Safely execute alter column mapping if it doesn't already exist on active DB schema
    let _ = conn.execute("ALTER TABLE parsed_files ADD COLUMN site_config_slug TEXT REFERENCES site_configs(slug) ON DELETE SET NULL;", []);

    // Insert fallback records to prevent FK constraints pollution
    let _ = conn.execute(
        "INSERT OR IGNORE INTO parsed_files (slug, url, title, sanitized_title, is_playlist, created_at) VALUES ('app_fallback', 'n/a', 'Fallback Cache Profile', 'fallback', 0, datetime('now'));",
        []
    );
    let _ = conn.execute(
        "INSERT OR IGNORE INTO download_jobs (slug, file_type, is_direct_url, is_from_playlist, base_download_path, status, format_string, created_at, updated_at) VALUES ('app_fallback', 'video', 1, 0, 'n/a', 'error', 'n/a', datetime('now'), datetime('now'));",
        []
    );

    Ok(db_path)
}

async fn start_cancellation_worker(
    mut rx: mpsc::Receiver<QueueSignal>,
    registry: Arc<ActiveProcessRegistry>,
) {
    while let Some(signal) = rx.recv().await {
        match signal {
            QueueSignal::PauseJob(slug) => {
                let target_process = {
                    let mut active_instances = registry.instances.write();
                    active_instances.remove(&slug)
                };

                match target_process {
                    Some(child_process) => {
                        #[cfg(unix)]
                        {
                            if let Some(pid) = child_process.id() {
                                let _ = std::process::Command::new("kill")
                                    .args(&["-9", &format!("-{}", pid)])
                                    .status();
                            }
                        }
                        #[cfg(not(unix))]
                        {
                            let _ = child_process.kill().await;
                        }
                    }
                    None => {}
                }
            }
        }
    }
}

pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init());

    builder = builder.setup(|app| {
        let db_path = match initialize_database(app) {
            Ok(path) => path,
            Err(err) => {
                eprintln!("[CRITICAL] Failed to map local data schemas: {}", err);
                std::process::exit(1);
            }
        };

        // Open the single persistent connection for the entire application life cycle!
        let db_conn = match Connection::open(&db_path) {
            Ok(c) => {
                let _ = c.execute("PRAGMA foreign_keys = ON;", []);
                Arc::new(parking_lot::Mutex::new(c))
            }
            Err(err) => {
                eprintln!("[CRITICAL] Failed to open native SQLite thread-safe connection: {}", err);
                std::process::exit(1);
            }
        };

        let mut concurrency_limit = 3;
        {
            let conn = db_conn.lock();
            let _ = conn.execute(
                "UPDATE download_jobs SET status = 'paused', updated_at = datetime('now') WHERE status = 'downloading' OR status = 'pending';",
                [],
            );

            if let Ok(val) = conn.query_row("SELECT value FROM app_settings WHERE key = 'concurrency_limit'", [], |row| row.get::<_, String>(0)) {
                if let Ok(parsed) = val.parse::<usize>() {
                    concurrency_limit = parsed;
                }
            }
        }

        let process_registry = Arc::new(ActiveProcessRegistry {
            instances: Arc::new(RwLock::new(HashMap::new())),
        });

        let (signal_tx, signal_rx) = mpsc::channel::<QueueSignal>(32);

        let worker_registry = Arc::clone(&process_registry);

        tauri::async_runtime::spawn(async move {
            start_cancellation_worker(signal_rx, worker_registry).await;
        });

        let progress_cache: Arc<parking_lot::Mutex<HashMap<String, ProgressSnapshot>>> =
            Arc::new(parking_lot::Mutex::new(HashMap::new()));

        let flush_conn = Arc::clone(&db_conn);
        let flush_cache = Arc::clone(&progress_cache);
        let tic_emitter = app.handle().clone();
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                let mut cache = flush_cache.lock();
                if !cache.is_empty() {
                    let conn = flush_conn.lock();
                    for (slug, snapshot) in cache.iter() {
                        let _ = conn.execute(
                            "UPDATE download_jobs SET progress = ?1, tracking_message = ?2, status = ?3, updated_at = datetime('now') WHERE slug = ?4;",
                            rusqlite::params![snapshot.progress, snapshot.status_message, snapshot.status, slug]
                        );
                        
                        let _ = tic_emitter.emit(
                            "download-progress-token",
                            serde_json::json!({
                                "slug": slug,
                                "progress": snapshot.progress,
                                "message": snapshot.status_message,
                                "status": snapshot.status
                            })
                        );
                    }
                    cache.clear();
                }
            }
        });

        // Cleanup stale cookie files from previous runs
        if let Some(app_dir) = db_path.parent() {
            if let Ok(entries) = std::fs::read_dir(app_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                            if filename.starts_with("synclime_cookie_") && filename.ends_with(".txt") {
                                let _ = std::fs::remove_file(path);
                            }
                        }
                    }
                }
            }
        }

        let axum_app_handle = app.handle().clone();
        let axum_db_conn = Arc::clone(&db_conn);
        tauri::async_runtime::spawn(async move {
            start_axum_server(axum_app_handle, axum_db_conn).await;
        });

        app.manage(AppEngineState {
            pool_semaphore: Arc::new(parking_lot::RwLock::new(Arc::new(Semaphore::new(concurrency_limit)))),
            db_path,
            db_conn,
            active_processes: process_registry,
            signal_tx,
            progress_cache,
        });

        Ok(())
    });

    builder = builder.invoke_handler(tauri::generate_handler![
        commands::clipboard::process_clipboard_paste,
        commands::queue::trigger_job_start,
        commands::queue::request_job_pause,
        commands::queue::insert_job_record,
        commands::queue::delete_job_record,
        crate::commands::queue::clear_all_jobs_records,
        crate::commands::queue::get_all_jobs,
        crate::commands::queue::reveal_job_in_explorer,
        crate::commands::queue::reveal_folder_in_explorer,
        crate::commands::queue::update_concurrency_limit,
        crate::commands::queue::get_concurrency_limit,
        crate::commands::queue::update_download_chunks,
        crate::commands::queue::get_download_chunks,
        commands::discovery::discover_asset_metadata,
        commands::discovery::insert_parsed_file,
        commands::config::add_cookie_profile,
        commands::config::get_cookie_profiles,
        commands::config::update_cookie_data,
        commands::config::delete_cookie_profile,
        commands::config::batch_delete_cookie_profiles,
        commands::config::add_proxy_profile,
        commands::config::get_proxy_profiles,
        commands::config::update_proxy_data,
        commands::config::delete_proxy_profile,
        commands::config::batch_delete_proxy_profiles,
        commands::config::add_site_config,
        commands::config::get_site_configs,
        commands::config::update_site_config,
        commands::config::delete_site_config,
        commands::config::update_download_path,
        commands::config::get_download_path,
        commands::logs::get_error_logs,
        commands::logs::get_parse_logs,
        commands::logs::insert_error_log,
        commands::logs::insert_parse_log,
        commands::logs::clear_all_logs,
        commands::inbox::get_inbox_urls,
        commands::inbox::get_inbox_url_by_slug,
        commands::inbox::add_inbox_url,
        commands::inbox::update_inbox_status,
        commands::inbox::delete_inbox_url,
        commands::inbox::get_local_updates,
        commands::inbox::get_online_updates
    ]);

    match builder.run(tauri::generate_context!()) {
        Ok(_) => {}
        Err(err) => {
            eprintln!("error while running tauri application: {}", err);
        }
    }
}

async fn start_axum_server(
    app_handle: tauri::AppHandle,
    db_conn: Arc<parking_lot::Mutex<rusqlite::Connection>>,
) {
    use axum::{
        routing::{get, post},
        Json, Router,
    };
    use serde::Deserialize;
    use tower_http::cors::CorsLayer;
    use std::net::SocketAddr;

    #[derive(Deserialize)]
    struct AddUrlPayload {
        url: String,
    }

    let app = Router::new()
        .route("/health", get(|| async {
            Json(serde_json::json!({
                "status": "ok",
                "message": "Synclime Local API server is healthy and online",
                "version": "0.1.0"
            }))
        }))
        .route("/add", post({
            let app_handle = app_handle.clone();
            let db_conn = db_conn.clone();
            move |Json(payload): Json<AddUrlPayload>| {
                let app_handle = app_handle.clone();
                let db_conn = db_conn.clone();
                async move {
                    let url = payload.url.trim();
                    if url.is_empty() {
                        return (
                            axum::http::StatusCode::BAD_REQUEST,
                            Json(serde_json::json!({
                                "success": false,
                                "message": "URL cannot be empty"
                            })),
                        );
                    }

                    let slug = format!("inbox-{}", chrono::Utc::now().timestamp_millis());

                    let conn = db_conn.lock();

                    let query = "
                        INSERT OR IGNORE INTO inbox_urls (slug, url, status, created_at, updated_at)
                        VALUES (?1, ?2, 'pending', datetime('now'), datetime('now'));
                    ";

                    match conn.execute(query, rusqlite::params![slug, url]) {
                        Ok(rows) => {
                            if rows > 0 {
                                let _ = app_handle.emit("inbox-updated", ());
                                (
                                    axum::http::StatusCode::OK,
                                    Json(serde_json::json!({
                                        "success": true,
                                        "message": "URL successfully added to inbox",
                                        "slug": slug
                                    })),
                                )
                            } else {
                                (
                                    axum::http::StatusCode::OK,
                                    Json(serde_json::json!({
                                        "success": false,
                                        "message": "URL already exists in inbox"
                                    })),
                                )
                            }
                        }
                        Err(e) => (
                            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                            Json(serde_json::json!({
                                "success": false,
                                "message": format!("Database insert error: {}", e)
                            })),
                        ),
                    }
                }
            }
        }))
        .layer(CorsLayer::permissive());

    for port in 14221..=14230 {
        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(_) => {
                eprintln!("[Axum Server] Port {} is in use, trying next...", port);
                continue;
            }
        };

        println!("[Axum Server] Successfully bound to port {}", port);
        if let Err(e) = axum::serve(listener, app).await {
            eprintln!("[Axum Server] Error serving axum: {}", e);
        }
        return;
    }

    eprintln!("[Axum Server] Critical: Could not bind to any port in range 14221 to 14230!");
}
