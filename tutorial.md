# Synclime Complete User Guide & System Tutorial

Welcome to **Synclime**, a state-of-the-art native desktop media downloader, URL parameter extractor, and multithreaded network writer powered by a high-speed Rust core engine, SQLite caches, SolidJS reactive front-ends, `yt-dlp` metadata probes, and `aria2c` multi-threaded engines.

This guide provides everything you need to leverage the full power of Synclime's native desktop layer.

---

## 1. Quick Start: Setting Up a Download Task

Under the **Task Controller** dashboard (Home screen), you can initialize new asset downloads using two core strategies:

### A. Metadata Analysis Mode (Recommended)
1. Paste your target media resource URL (e.g. YouTube video, playlist, or web stream).
2. Choose **Metadata Extract** (default mode).
3. Click **Analyze Resource Parameters**.
4. The system will analyze format definitions, resolution qualities, audio streams, chapters, and available subtitle tracks, directing you to the **Resolution Detail Catalog** where you can custom-select your assets.

### B. Direct Downloader Mode
1. Choose **Direct Queue** mode.
2. Click **Initialize Direct Download**.
3. This skips the analysis layer, immediately building a SQLite download queue job, and routes it directly to the multi-threaded `aria2` engine. Best for direct document links, PDF assets, or raw file URLs.

---

## 2. Setting Up Browser Companion Extensions

Automate link transfers directly from your web browser with our companion browser extension:

1. **Download the Bundle**: Navigate to our official [GitHub Extensions Catalog](https://github.com/AhmedTrooper/Synclime/blob/main/extentions.md) and download the unpacked zip extension.
2. **Developer Mode**: In Chrome, Firefox, or Brave, open `Extensions` and enable **Developer Mode**.
3. **Load Unpacked**: Select the extracted folder containing the extension.
4. **Daemon Sync**: The extension automatically binds to the local Synclime Axum background server on port:
   ```
   127.0.0.1:14221
   ```
5. Any right-clicked media asset or page URL matched by the extension will instantly stream to your local **Inbox Queue**, complete with green active indicators!

---

## 3. Network Prefs: Vaults, Proxies, and Domain Routing

Secure credential overrides and proxy bypasses globally or on a per-domain basis under **Network Preferences**:

### Cookie Vault
* Import raw credentials using the **Netscape Cookie format** (JSON or other plain-text parameters are rejected by standard yt-dlp parsers). 
* Helpful browser extensions like *Get cookies.txt LOCALLY* can export Netscape formats in one click.

### Proxy Networks
* Save custom HTTPS or SOCKS5 proxies:
  ```
  socks5://username:password@proxy-server-address:port
  ```

### Domain Router matching
* Create a Domain Match Rule (e.g., matching `youtube.com`) and link it to a specific Cookie Profile or Proxy Profile.
* Any download starting under matching domains will automatically inject the designated proxy/credentials!

---

* Check active system parameters, kernel platforms, and SQLite indexing caches inside the **System Diagnostics** tab.
* In case of connection faults or download errors, check **Console Diagnostics** to inspect full stdout/stderr streams.
* Use the **Copy Command** and **Copy Payload** quick-action buttons to copy logs to your clipboard instantly.

---

## 5. Core Dependencies & AI Installation Assistance

To unlock all of Synclime's native engines, ensure you have the required CLI utilities installed on your operating system:

1. **yt-dlp** (Mandatory): Powers all video, playlist, and stream parameter extractions.
2. **ffmpeg** (Mandatory): Handles merging separate high-definition video and audio tracks.
3. **Deno** (Mandatory): Powers local background Axum port stream listeners.
4. **aria2** / **aria2c** (Optional, but **Strongly Recommended**): The multithreaded network writer daemon that accelerates downloads.

> [!TIP]
> **Need help installing these utilities?**
> Installing command-line packages differs depending on your OS (Windows, macOS, or Linux). If you are unsure of the commands, you can copy the prompt below and ask AI assistants like **Gemini** or **ChatGPT** to guide you:
> 
> *"How do I install the command-line dependencies yt-dlp, ffmpeg, Deno, and aria2 on [Ubuntu / Arch / macOS / Windows]?"*
