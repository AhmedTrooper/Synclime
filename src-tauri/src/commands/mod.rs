pub mod clipboard;
pub mod config;
pub mod discovery;
pub mod queue;
pub mod logs;
pub mod inbox;

// Re-export all commands cleanly for our main execution router mapping
pub use clipboard::process_clipboard_paste;
pub use discovery::discover_asset_metadata;
pub use queue::{request_job_pause, trigger_job_start};
pub use logs::{get_error_logs, get_parse_logs, insert_error_log, insert_parse_log, clear_all_logs};
pub use inbox::{get_inbox_urls, get_inbox_url_by_slug, add_inbox_url, update_inbox_status, delete_inbox_url, get_online_updates};
