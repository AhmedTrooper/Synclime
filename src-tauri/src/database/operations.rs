use rusqlite::{params, Connection};

#[derive(Debug)]
pub struct DbError(pub String);

impl From<rusqlite::Error> for DbError {
    fn from(err: rusqlite::Error) -> Self {
        DbError(err.to_string())
    }
}

/// Structural representation of a parsed asset entry row
pub struct ParsedFileRow {
    pub slug: String,
    pub url: String,
    pub title: String,
    pub sanitized_title: String,
    pub is_playlist: i32,
    pub parent_playlist_slug: Option<String>,
    pub playlist_name: Option<String>,
    pub sanitized_playlist_name: Option<String>,
    pub json_metadata: Option<String>,
    pub created_at: String,
    pub site_config_slug: Option<String>,
}

/// Structural representation of a queue item row
pub struct DownloadJobRow {
    pub slug: String,
    pub parsed_file_slug: Option<String>,
    pub file_type: String,
    pub associated_media_job_slug: Option<String>,
    pub is_direct_url: i32,
    pub direct_url: Option<String>,
    pub is_from_playlist: i32,
    pub current_part: i32,
    pub total_parts: i32,
    pub base_download_path: String,
    pub custom_download_path: Option<String>,
    pub cookie_profile_slug: Option<String>,
    pub proxy_profile_slug: Option<String>,
    pub status: String,
    pub format_string: String,
    pub audio_format: Option<String>,
    pub video_format: Option<String>,
    pub selected_subtitles: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Secure Database Gateway: Saves an analytical file tracking manifest to SQLite safely
pub fn save_parsed_file(conn: &Connection, row: &ParsedFileRow) -> Result<(), DbError> {
    let query = "
        INSERT OR REPLACE INTO parsed_files (
            slug, url, title, sanitized_title, is_playlist,
            parent_playlist_slug, playlist_name, sanitized_playlist_name,
            json_metadata, created_at, site_config_slug
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11);
    ";

    match conn.execute(
        query,
        params![
            row.slug,
            row.url,
            row.title,
            row.sanitized_title,
            row.is_playlist,
            row.parent_playlist_slug,
            row.playlist_name,
            row.sanitized_playlist_name,
            row.json_metadata,
            row.created_at,
            row.site_config_slug
        ],
    ) {
        Ok(_) => Ok(()),
        Err(e) => Err(DbError(e.to_string())),
    }
}

/// Transactional Queue Handler: Injects a brand new download execution thread line to SQLite
pub fn create_download_job(conn: &Connection, job: &DownloadJobRow) -> Result<(), DbError> {
    let query = "
        INSERT OR IGNORE INTO download_jobs (
            slug, parsed_file_slug, file_type, associated_media_job_slug,
            is_direct_url, direct_url, is_from_playlist, current_part, total_parts,
            base_download_path, custom_download_path, cookie_profile_slug, proxy_profile_slug,
            status, format_string, audio_format, video_format, selected_subtitles,
            created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20);
    ";

    match conn.execute(
        query,
        params![
            job.slug,
            job.parsed_file_slug,
            job.file_type,
            job.associated_media_job_slug,
            job.is_direct_url,
            job.direct_url,
            job.is_from_playlist,
            job.current_part,
            job.total_parts,
            job.base_download_path,
            job.custom_download_path,
            job.cookie_profile_slug,
            job.proxy_profile_slug,
            job.status,
            job.format_string,
            job.audio_format,
            job.video_format,
            job.selected_subtitles,
            job.created_at,
            job.updated_at
        ],
    ) {
        Ok(_) => Ok(()),
        Err(e) => Err(DbError(e.to_string())),
    }
}

/// Queue Scheduling Token Lookup: Pulls the absolute highest-priority pending task lines out of SQLite
pub fn get_next_pending_job(conn: &Connection) -> Result<Option<DownloadJobRow>, DbError> {
    let query = "
        SELECT
            slug, parsed_file_slug, file_type, associated_media_job_slug,
            is_direct_url, direct_url, is_from_playlist, current_part, total_parts,
            base_download_path, custom_download_path, cookie_profile_slug, proxy_profile_slug,
            status, format_string, audio_format, video_format, selected_subtitles,
            created_at, updated_at
        FROM download_jobs
        WHERE status = 'pending'
        ORDER BY priority_index DESC, created_at ASC
        LIMIT 1;
    ";

    let mut stmt = match conn.prepare(query) {
        Ok(s) => s,
        Err(e) => return Err(DbError(e.to_string())),
    };

    let mut rows = match stmt.query([]) {
        Ok(r) => r,
        Err(e) => return Err(DbError(e.to_string())),
    };

    match rows.next() {
        Ok(Some(row)) => {
            let fetched_job = DownloadJobRow {
                slug: match row.get(0) {
                    Ok(val) => val,
                    Err(e) => return Err(DbError(e.to_string())),
                },
                parsed_file_slug: row.get(1).ok(),
                file_type: match row.get(2) {
                    Ok(val) => val,
                    Err(e) => return Err(DbError(e.to_string())),
                },
                associated_media_job_slug: row.get(3).ok(),
                is_direct_url: match row.get(4) {
                    Ok(val) => val,
                    Err(e) => return Err(DbError(e.to_string())),
                },
                direct_url: row.get(5).ok(),
                is_from_playlist: match row.get(6) {
                    Ok(val) => val,
                    Err(e) => return Err(DbError(e.to_string())),
                },
                current_part: match row.get(7) {
                    Ok(val) => val,
                    Err(e) => return Err(DbError(e.to_string())),
                },
                total_parts: match row.get(8) {
                    Ok(val) => val,
                    Err(e) => return Err(DbError(e.to_string())),
                },
                base_download_path: match row.get(9) {
                    Ok(val) => val,
                    Err(e) => return Err(DbError(e.to_string())),
                },
                custom_download_path: row.get(10).ok(),
                cookie_profile_slug: row.get(11).ok(),
                proxy_profile_slug: row.get(12).ok(),
                status: match row.get(13) {
                    Ok(val) => val,
                    Err(e) => return Err(DbError(e.to_string())),
                },
                format_string: match row.get(14) {
                    Ok(val) => val,
                    Err(e) => return Err(DbError(e.to_string())),
                },
                audio_format: row.get(15).ok(),
                video_format: row.get(16).ok(),
                selected_subtitles: row.get(17).ok(),
                created_at: match row.get(18) {
                    Ok(val) => val,
                    Err(e) => return Err(DbError(e.to_string())),
                },
                updated_at: match row.get(19) {
                    Ok(val) => val,
                    Err(e) => return Err(DbError(e.to_string())),
                },
            };
            Ok(Some(fetched_job))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(DbError(e.to_string())),
    }
}

/// Secure Queue Operation: Drops a single download job tracker from SQLite
pub fn delete_download_job(conn: &Connection, job_slug: &str) -> Result<(), DbError> {
    match conn.execute(
        "DELETE FROM download_jobs WHERE slug = ?1;",
        params![job_slug],
    ) {
        Ok(_) => Ok(()),
        Err(e) => Err(DbError(e.to_string())),
    }
}

/// Secure Queue Operation: Drops all download tracker jobs completely
pub fn clear_all_download_jobs(conn: &Connection) -> Result<(), DbError> {
    match conn.execute("DELETE FROM download_jobs WHERE status IN ('completed', 'error');", []) {
        Ok(_) => Ok(()),
        Err(e) => Err(DbError(e.to_string())),
    }
}
