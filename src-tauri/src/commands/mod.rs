pub mod clipboard;
pub mod discovery;
pub mod queue;

// Re-export all commands cleanly for our main execution router mapping
pub use clipboard::process_clipboard_paste;
pub use discovery::discover_asset_metadata;
pub use queue::{request_job_pause, trigger_job_start};
