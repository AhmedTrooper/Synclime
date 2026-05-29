Synclime Frontend Architecture Blueprint & IPC Contract

This document provides absolute structural context and interface contracts for writing the frontend layer of Synclime. The backend is written in Rust using Tauri v2 and SQLite. Follow these rules exactly to avoid IPC mismatches or state synchronization failures.
1. Core Tauri v2 IPC Command Contracts

The backend exposes four core native commands via Tauri's invoke handler. All payload models are unmixed and strict.
Command 1: Clipboard Ingestion Gateway

    Rust Method Name: process_clipboard_paste

    Purpose: Validates raw text data from the OS clipboard and strips analytical tracking metadata (such as &si= or &utm_source=). It supports both http:// and https:// URLs.

    Payload Argument Key: rawInput (string)

    Expected Return Object Shape: An object containing "success" (boolean), "sanitized_url" (string), and "message" (string).

    Invocator Example: Call invoke("process_clipboard_paste", { rawInput: clipText }) from the Tauri core API package.

Command 2: High-Speed Asset Discovery

    Rust Method Name: discover_asset_metadata

    Purpose: Executes a non-blocking yt-dlp json dump memory buffer stream, resolves proxy/cookie configurations automatically from SQLite, and runs a property prober to identify the payload type.

    Payload Argument Key: targetUrl (string)

    Expected Return Object Shape: An object containing "success" (boolean), "payload" (which matches either VideoMetadata or GenericPlaylistMetadata structures, or null), and "error_message" (string or null).

    Invocator Example: Call invoke("discover_asset_metadata", { targetUrl: cleanUrl }).

Command 3: Trigger Active Extraction Queue Task

    Rust Method Name: trigger_job_start

    Purpose: Marks a job record as downloading in SQLite and spawns a thread-safe worker process bounded by a global concurrency limit of 3 concurrent jobs.

    Payload Argument Key: jobSlug (string)

    Expected Return Object Shape: An object containing "success" (boolean) and "message" (string).

    Invocator Example: Call invoke("trigger_job_start", { jobSlug: slug }).

Command 4: Interruption & Cancellation Token Dispatcher

    Rust Method Name: request_job_pause

    Purpose: Dispatches an execution kill signal to the active OS process ID registry and safely updates the job's transactional record to paused in SQLite.

    Payload Argument Key: jobSlug (string)

    Expected Return Object Shape: An object containing "success" (boolean) and "message" (string).

    Invocator Example: Call invoke("request_job_pause", { jobSlug: slug }).

2. Strong Structural Typings (Data Models)

The data payloads returned from the metadata discovery command map strictly to these distinct structures. Do not mix or merge video and playlist definitions.
Format Structure

Tracks individual stream format options. Properties include:

    format_id (string)

    format_note (optional string)

    ext (optional string)

    protocol (optional string)

    acodec (optional string)

    vcodec (optional string)

    url (optional string)

    width, height, fps (optional numbers or null)

    audio_ext, video_ext (optional strings)

    vbr, abr, tbr (optional numbers or null)

    resolution (optional string or null)

    aspect_ratio (optional number or null)

    filesize, filesize_approx (optional numbers or null)

    format (optional string)

    asr, audio_channels (optional numbers or null)

Thumbnail Structure

Tracks video image frames. Properties include:

    url (optional string)

    id (optional string)

    preference, height, width (optional numbers)

    resolution (optional string)

Chapter Structure

Tracks timeline markers. Properties include:

    start_time, end_time (numbers)

    title (string)

VideoMetadata Structure

The primary contract for single video targets. Properties include:

    id, title (strings)

    formats (array of Format objects)

    thumbnails (array of Thumbnail objects)

    thumbnail, description, channel_id, channel_url (optional strings)

    duration, view_count (optional numbers)

    webpage_url, uploader, upload_date, original_url, extractor (optional strings)

    subtitles, automatic_captions (Record mapping strings to any metadata format)

    chapters (array of Chapter objects)

    _type (optional string)

PlaylistThumbnail Structure

Dedicated layout for index views. Properties include:

    url (string)

    height, width, id, resolution (optional properties)

PlaylistEntry Structure

Represents an individual entry row inside an extraction list. Properties include:

    _type, ie_key (optional strings)

    id, url, title (strings)

    description (optional string or null)

    duration (number)

    channel_id, channel, channel_url, uploader, uploader_id, uploader_url (optional strings or null)

    thumbnails (array of PlaylistThumbnail objects)

    view_count (optional number or null)

GenericPlaylistMetadata Structure

The primary contract for playlist targets. Properties include:

    id, title (strings)

    description (optional string)

    playlist_count (optional number)

    entries (array of PlaylistEntry objects)

    webpage_url, original_url, extractor (strings)

    thumbnails (array of PlaylistThumbnail objects)

    channel, channel_id (optional strings)

3. High-Speed Progress Event System (Tauri Emitter)

The backend avoids database thrashing by routing active download progress out of an in-memory RAM cache map directly through a global Tauri event emission pipe. Do not poll the database for real-time progress updates.
Event Payload Channel

    Event Address Label: download-progress-token

    Payload Object Properties:

        slug (string): Unique identifier of the download job.

        progress (number): Floating point number from 0.00 to 100.00.

        message (string): Compiled status text, such as "10.51MiB/s ETA 00:08".

Zustand Global Event Listener Setup

Implement a global listener subscription immediately when the store instantiates. Import the "listen" function from @tauri-apps/api/event. Listen for the "download-progress-token" address label.

Inside the trigger callback handler, extract slug, progress, and message from event.payload. Locate the matching task row in your local state store map using the slug, then update its progress, tracking message, and status ("downloading") directly in memory to keep rendering lines smooth without creating deep garbage collection object clones.
4. Architectural Rules for UI Code Generation

    Differentiate Asset Views Immediately: When handling a discovery result object, evaluate if the payload contains an "entries" array property. If it is present, route the interface layout to render a Multi-Track Playlist Grid View. If it is missing, render a Single Video Media Info Card.

    Defensive Status UI Handling: Active download tasks track five specific state strings managed by the SQLite schema: pending, downloading, paused, completed, and error. Bind UI control components directly to these values (for example, make sure to completely disable the start/download button if the task status equals "downloading").

    Respect System Boundaries: The backend native layer automatically handles local network proxy route strings and browser authentication session cookies. The frontend code does not need to handle credentials directly; it only needs to pass clean, unmutated target validation string labels down across the IPC bridge channels.
