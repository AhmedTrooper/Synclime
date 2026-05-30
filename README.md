# 🚀 SyncLime (OSGUI)

[![Tauri v2](https://img.shields.io/badge/Tauri-v2-FFC107?logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-2021-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A desktop media downloader built with Tauri v2, React 18, Rust, and SQLite. SyncLime is designed to manage many downloads at the same time without crashing.

---

## 📌 What is this?
SyncLime is a desktop application for downloading videos and music. 
Many downloader apps freeze when you download too many files. SyncLime solves this by separating the background work from the user screen. 

### Core Features
*   **Fast Parsing:** Reads big playlists (100+ videos) quickly.
*   **Custom Profiles:** You can use specific cookies and proxies for different websites.
*   **Safe Memory:** Limits how many downloads run at once to protect your computer.
*   **Native Window:** Custom dark mode UI that handles thousands of items smoothly.

---

## 🏛️ System Architecture

The application uses an event-driven design to connect the React UI with the Rust backend.

```mermaid
graph TD
    subgraph Frontend_Layer [React Frontend Layer]
        UI[React Components] <--> Zustand[Zustand State Store]
        Zustand <--> TA_IPC[Tauri IPC Bridge]
    end

    subgraph Tauri_IPC_Boundary [Tauri IPC Boundary]
        TA_IPC <--> |invoke / emit| Rust_IPC[Tauri Command Handlers]
    end

    subgraph Rust_Backend_Layer [Native Rust Backend Layer]
        Rust_IPC <--> Engine[AppEngineState]
        Engine <--> Db[SQLite Database]
        Engine <--> Registry[ActiveProcessRegistry]
        Registry <--> |Tokio Spawn| Worker[execute_download_worker]
        Worker <--> |fork/exec| Subprocess[yt-dlp Subprocess]
    end

    subgraph System_Background_Tasks [System Async Workers]
        FlushWorker[1-Second Flush Worker]
        CancelWorker[Cancellation Worker]
        
        FlushWorker <--> Db
        FlushWorker --> |Emit Progress| TA_IPC
        CancelWorker <--> Registry
    end
```

---

## 🗄️ Database Map (SQLite)

We use a relational database to save all downloads safely. Here is how the tables connect:

```mermaid
erDiagram
    cookie_profiles {
        string slug PK
        string title
        string domain
        string cookie_data
    }
    proxy_profiles {
        string slug PK
        string title
        string proxy_string
    }
    site_configs {
        string slug PK
        string title
        string domain
        string cookie_profile_slug FK
        string proxy_profile_slug FK
        int is_default
    }
    parsed_files {
        string slug PK
        string url
        string title
        string sanitized_title
        int is_playlist
        string parent_playlist_slug FK
        string playlist_name
        string json_metadata
        string site_config_slug FK
    }
    download_jobs {
        string slug PK
        string parsed_file_slug FK
        string file_type
        string associated_media_job_slug FK
        int is_direct_url
        string direct_url
        int is_from_playlist
        int current_part
        int total_parts
        string base_download_path
        string custom_download_path
        string cookie_profile_slug FK
        string proxy_profile_slug FK
        string status
        float progress
        string tracking_message
        string format_string
        string audio_format
        string video_format
        string selected_subtitles
        int last_pid
    }
    parse_logs {
        string slug PK
        string parsed_file_slug FK
        string status
        string started_at
        string finished_at
        string command_executed
        int exit_code
    }
    error_logs {
        string slug PK
        string download_job_slug FK
        string command_executed
        string error_message
        int is_resolved
    }

    site_configs }|--o| cookie_profiles : "uses"
    site_configs }|--o| proxy_profiles : "uses"
    parsed_files }|--o| site_configs : "uses profile"
    parsed_files }|--o| parsed_files : "parent playlist"
    download_jobs }|--o| parsed_files : "belongs to"
    download_jobs }|--o| download_jobs : "links to parent"
    download_jobs }|--o| cookie_profiles : "uses cookie"
    download_jobs }|--o| proxy_profiles : "uses proxy"
    parse_logs }|--|| parsed_files : "logs"
    error_logs }|--|| download_jobs : "errors"
```

---

## 🧠 Core Engineering (Who Handles What)

### 1. Stopping Screen Freezes (The Rust Backend)
*   **Problem:** Downloads send progress text thousands of times per second. Saving this to the database instantly freezes the app.
*   **Solution:** We catch the text in memory. A background worker wakes up every 1 second, saves everything to SQLite at once, and sends one small message to the React UI.
*   **Code in `src-tauri/src/lib.rs` (Rust):**
```rust
// We run this loop in the background forever
tauri::async_runtime::spawn(async move {
    loop {
        // Sleep for exactly 1 second
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        
        // Grab the bucket of recent progress updates
        let mut cache = flush_cache.lock();
        if !cache.is_empty() {
            if let Ok(conn) = rusqlite::Connection::open(&flush_db_path) {
                for (slug, snapshot) in cache.iter() {
                    // Update SQLite once per second per file
                    let _ = conn.execute(
                        "UPDATE download_jobs SET progress = ?1 WHERE slug = ?2;",
                        rusqlite::params![snapshot.progress, slug]
                    );
                    
                    // Tell the React frontend to redraw the progress bar
                    let _ = tic_emitter.emit("download-progress-token", serde_json::json!({
                        "slug": slug,
                        "progress": snapshot.progress
                    }));
                }
                cache.clear(); // Empty the bucket for the next second
            }
        }
    }
});
```

### 2. Safe Process Management (The IPC Bridge)
*   **Problem:** If a user clicks "Pause" very fast, it can create ghost processes that never stop.
*   **Solution:** The frontend sends a clean pause signal to Rust, which kills the active download safely.
*   **Code in `src/routes/Downloads.tsx` (React/Frontend):**
```typescript
// When the user clicks pause in the UI...
const handlePauseToggle = async (job: DownloadJob) => {
    // We instantly update the UI state so it feels snappy
    updateJobStatus(job.slug, "paused");

    // Then we tell the Rust backend to stop the actual OS process
    await invoke("request_job_pause", { jobSlug: job.slug });
};
```
*   **Code in `src-tauri/src/commands/queue.rs` (Rust/Backend):**
```rust
#[tauri::command]
pub async fn request_job_pause(
    job_slug: String,
    state: tauri::State<'_, AppEngineState>,
) -> Result<Response, String> {
    // We safely lock the active processes list
    let mut registry = state.active_processes.write().await;
    
    // If the process is running, we rip it out and kill it instantly
    if let Some(mut child) = registry.remove(&job_slug) {
        let _ = child.kill().await;
    }
    
    Ok(Response { success: true })
}
```

### 3. Database Safety (SQLite)
*   **Problem:** JSON files can corrupt if the app crashes.
*   **Solution:** We use SQLite with foreign keys. If a download uses a custom proxy, it is strongly linked in the database so it never breaks.

---

## ⚡ Installation

You need `yt-dlp`, `ffmpeg`, and `Deno` installed on your computer.

### 1. Check Dependencies
```bash
yt-dlp --version
ffmpeg -version
deno --version
```

### 2. Download
*   Go to [GitHub Releases](https://github.com/AhmedTrooper/OSGUI/releases).
*   Download the installer for your OS (Windows `.exe`, macOS `.dmg`, or Linux `.deb`).

---

## 🛠️ Local Development

For developers who want to run the code:

### Requirements
*   **Bun:** `v1.x` or later. This is **strictly mandatory** for local development to ensure the `bun.lock` file is maintained perfectly. Do NOT use NodeJS, NPM, or Deno.
*   **Rust:** Stable `cargo` and `rustc`.
*   **C++ Build Tools:** Required for your specific OS (Visual Studio, Xcode, or Ubuntu `build-essential`).

### Setup
1.  **Clone and switch to dev branch:**
    ```bash
    git clone -b dev https://github.com/AhmedTrooper/OSGUI.git
    cd OSGUI
    ```

2.  **Install node modules:**
    ```bash
    bun install
    ```

3.  **Run the app:**
    ```bash
    bun run tauri dev
    ```

---

## 🚀 Build for Production

To create the final installer file:

```bash
bun run tauri build
```
The final files will be saved in: `src-tauri/target/release/bundle/`

---

## 🤝 Contributing

We welcome help from developers! 
1.  Fork the project and branch from `dev`.
    ```bash
    git checkout -b feature/your-feature dev
    ```
2.  Make sure your code is clean (`tsc` and `cargo fmt`).
3.  Open a Pull Request pointing to the `dev` branch.

---

## 📄 License
This project is dual-licensed under the **[MIT License](LICENCE)** and the **[Apache 2.0 License](LICENCE_APACHE%202.0)**.
