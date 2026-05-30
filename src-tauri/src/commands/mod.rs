pub mod clipboard;
pub mod config;
pub mod discovery;
pub mod queue;
pub mod logs;

// Re-export all commands cleanly for our main execution router mapping
pub use clipboard::process_clipboard_paste;
pub use discovery::discover_asset_metadata;
pub use queue::{request_job_pause, trigger_job_start};
pub use logs::{get_error_logs, get_parse_logs, insert_error_log, insert_parse_log, clear_all_logs};
