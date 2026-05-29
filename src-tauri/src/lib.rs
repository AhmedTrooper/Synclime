use parking_lot::RwLock;
use rusqlite::Connection;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
use std::collections::HashMap;
use std::fs;
use std::sync::Arc;
use tauri::Manager; // Cleaned: Only imported once right here
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
}

pub struct AppEngineState {
    pub pool_semaphore: Arc<Semaphore>,
    pub db_path: std::path::PathBuf,
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
    created_at TEXT NOT NULL
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
                    Some(mut child_process) => {
                        let _ = child_process.kill().await;
                    }
                    None => {}
                }
            }
        }
    }
}

pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(
            |_app_handle, _argv, _cwd| {},
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
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

        let flush_db_path = db_path.clone();
        let flush_cache = Arc::clone(&progress_cache);
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                let mut cache = flush_cache.lock();
                if !cache.is_empty() {
                    if let Ok(conn) = rusqlite::Connection::open(&flush_db_path) {
                        for (slug, snapshot) in cache.iter() {
                            let _ = conn.execute(
                                "UPDATE download_jobs SET progress = ?1, tracking_message = ?2, updated_at = datetime('now') WHERE slug = ?3;",
                                rusqlite::params![snapshot.progress, snapshot.status_message, slug]
                            );
                        }
                        cache.clear();
                    }
                }
            }
        });

        app.manage(AppEngineState {
            pool_semaphore: Arc::new(Semaphore::new(3)),
            db_path,
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
        commands::queue::clear_all_jobs_records,
        commands::discovery::discover_asset_metadata,
        commands::config::add_cookie_profile,
        commands::config::get_cookie_profiles,
        commands::config::update_cookie_data,
        commands::config::delete_cookie_profile,
        commands::config::batch_delete_cookie_profiles
    ]);

    match builder.run(tauri::generate_context!()) {
        Ok(_) => {}
        Err(err) => {
            eprintln!("error while running tauri application: {}", err);
        }
    }
}
