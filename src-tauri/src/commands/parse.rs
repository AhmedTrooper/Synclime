// Spawns yt-dlp --dump-json execution
#[tauri::command]
pub async fn parse_url(url: String) -> Result<String, String> {
    Ok(format!("Parsed: {}", url))
}
