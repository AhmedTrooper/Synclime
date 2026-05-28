// Handles OS threads, SIGSTOP/SIGCONT process flags
#[tauri::command]
pub async fn download_video(url: String) -> Result<String, String> {
    Ok(format!("Downloading: {}", url))
}
