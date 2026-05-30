use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ==========================================
// 1. PURE VIDEO ONLY DATA MODELS
// ==========================================

#[derive(Debug, Serialize, Deserialize)]
pub struct Format {
    pub format_id: String,
    pub format_note: Option<String>,
    pub ext: Option<String>,
    pub protocol: Option<String>,
    pub acodec: Option<String>,
    pub vcodec: Option<String>,
    pub url: Option<String>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub fps: Option<f64>,
    pub audio_ext: Option<String>,
    pub video_ext: Option<String>,
    pub vbr: Option<f64>,
    pub abr: Option<f64>,
    pub tbr: Option<f64>,
    pub resolution: Option<String>,
    pub aspect_ratio: Option<f64>,
    pub filesize: Option<i64>,
    pub filesize_approx: Option<i64>,
    pub format: Option<String>,
    pub asr: Option<f64>,
    pub audio_channels: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Thumbnail {
    pub url: Option<String>,
    pub id: Option<String>,
    pub preference: Option<i32>,
    pub height: Option<i32>,
    pub width: Option<i32>,
    pub resolution: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Chapter {
    pub start_time: f64,
    pub end_time: f64,
    pub title: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub id: String,
    pub title: String,
    pub formats: Vec<Format>,
    pub thumbnails: Vec<Thumbnail>,
    pub thumbnail: Option<String>,
    pub description: Option<String>,
    pub channel_id: Option<String>,
    pub channel_url: Option<String>,
    pub duration: Option<f64>,
    pub view_count: Option<i64>,
    pub webpage_url: Option<String>,
    pub uploader: Option<String>,
    pub upload_date: Option<String>,
    pub original_url: Option<String>,
    pub extractor: Option<String>,
    pub subtitles: Option<HashMap<String, serde_json::Value>>,
    pub automatic_captions: Option<HashMap<String, serde_json::Value>>,
    pub chapters: Option<Vec<Chapter>>,
    pub _type: Option<String>,
}

// ==========================================
// 2. PURE PLAYLIST ONLY DATA MODELS
// ==========================================

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaylistThumbnail {
    pub url: String,
    pub height: Option<i32>,
    pub width: Option<i32>,
    pub id: Option<String>,
    pub resolution: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaylistEntry {
    pub _type: Option<String>,
    pub ie_key: Option<String>,
    pub id: String,
    pub url: String,
    pub title: String,
    pub description: Option<String>,
    pub duration: Option<f64>,
    pub channel_id: Option<String>,
    pub channel: Option<String>,
    pub channel_url: Option<String>,
    pub uploader: Option<String>,
    pub uploader_id: Option<String>,
    pub uploader_url: Option<String>,
    pub thumbnails: Option<Vec<PlaylistThumbnail>>,
    pub view_count: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenericPlaylistMetadata {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub playlist_count: Option<i64>,
    pub entries: Vec<PlaylistEntry>,
    pub webpage_url: Option<String>,
    pub original_url: Option<String>,
    pub extractor: Option<String>,
    pub thumbnails: Option<Vec<PlaylistThumbnail>>,
    pub channel: Option<String>,
    pub channel_id: Option<String>,
}

// ==========================================
// 3. RESILIENT PROPERTY PROBER ENGINE
// ==========================================

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum DiscoveryResult {
    SingleVideo(VideoMetadata),
    MultiTrackPlaylist(GenericPlaylistMetadata),
}

pub fn parse_extraction_payload(raw_json: &str) -> Result<DiscoveryResult, String> {
    let probed_value: serde_json::Value = match serde_json::from_str(raw_json) {
        Ok(parsed_map) => parsed_map,
        Err(err) => {
            return Err(format!(
                "Invalid JSON payload stream structural layout: {}",
                err
            ))
        }
    };

    // --- PLAYLIST OR CHECK CONDITIONS ---
    let is_playlist_tag = probed_value
        .get("_type")
        .and_then(|t| t.as_str())
        .map(|s| s == "playlist")
        .unwrap_or(false);

    let has_entries_array = probed_value
        .get("entries")
        .and_then(|e| e.as_array())
        .is_some();

    let has_playlist_count = probed_value.get("playlist_count").is_some();

    // --- VIDEO OR CHECK CONDITIONS ---
    let is_video_tag = probed_value
        .get("_type")
        .and_then(|t| t.as_str())
        .map(|s| s == "video")
        .unwrap_or(false);

    let has_formats_array = probed_value
        .get("formats")
        .and_then(|f| f.as_array())
        .is_some();

    // --- EVALUATION INTERPRETER ROUTER ---
    // If any playlist property returns true, evaluate it as a multi-track structure line immediately
    if is_playlist_tag || has_entries_array || has_playlist_count {
        match serde_json::from_str::<GenericPlaylistMetadata>(raw_json) {
            Ok(playlist_struct) => Ok(DiscoveryResult::MultiTrackPlaylist(playlist_struct)),
            Err(err) => Err(format!(
                "Resilient parsing rejected playlist model mapping: {}",
                err
            )),
        }
    }
    // Otherwise, check if it contains explicit video parameters
    else if is_video_tag || has_formats_array {
        match serde_json::from_str::<VideoMetadata>(raw_json) {
            Ok(video_struct) => Ok(DiscoveryResult::SingleVideo(video_struct)),
            Err(err) => Err(format!(
                "Resilient parsing rejected video model mapping: {}",
                err
            )),
        }
    }
    // Ultimate Fallback: Try decoding as a direct video asset
    else {
        match serde_json::from_str::<VideoMetadata>(raw_json) {
            Ok(video_struct) => Ok(DiscoveryResult::SingleVideo(video_struct)),
            Err(_) => Err(
                "Unrecognized yt-dlp structural scheme. Unable to safely map data definitions."
                    .to_string(),
            ),
        }
    }
}
