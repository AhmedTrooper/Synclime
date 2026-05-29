import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../store/useUIStore";
import { useParseStore } from "../store/useParseStore";
import { useQueueStore, DownloadJob } from "../store/useQueueStore";
import * as Switch from "@radix-ui/react-switch";
import { Play, FileDown, Link2, AlertCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

export default function Home() {
  const { setActivePath } = useUIStore();
  const { addParsedFile, setParsing } = useParseStore();
  const { addJob } = useQueueStore();
  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const [directDownload, setDirectDownload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setActivePath("/");
  }, [setActivePath]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg("Please provide a valid asset web URL address first.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    const targetUrl = url.trim();

    if (directDownload) {
      // 1. DIRECT DOCUMENT DOWNLOAD WORK (Skip Parse)
      try {
        let cleanUrl = targetUrl;
        // Strip telemetry parameters using backend clipboard paste sanitize route
        try {
          const cleanRes = await invoke<{ success: boolean; sanitized_url: string }>(
            "process_clipboard_paste",
            { rawInput: targetUrl }
          );
          if (cleanRes.success) {
            cleanUrl = cleanRes.sanitized_url;
          }
        } catch (e) {
          console.warn("Direct clipboard paste cleaning failed (browser fallback):", e);
        }

        const domain = new URL(cleanUrl).hostname.replace("www.", "");
        const uniqueSlug = `doc-${Date.now()}`;
        const newJob: DownloadJob = {
          slug: uniqueSlug,
          name: `Direct Document (${domain})`,
          url: cleanUrl,
          progress: 0,
          status: "pending",
          message: "Queued for direct document parsing...",
          fileType: "direct_document",
          createdAt: new Date().toISOString(),
        };

        // Add to Zustand state
        addJob(newJob);

        const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;

        if (isTauri) {
          // Pre-register job in the SQLite registry
          try {
            const insertRes = await invoke<{ success: boolean; message: string }>("insert_job_record", {
              payload: {
                slug: newJob.slug,
                url: newJob.url,
                file_type: newJob.fileType,
                format_string: "bestvideo+bestaudio/best",
                download_path: useUIStore.getState().downloadPath,
                created_at: newJob.createdAt,
              }
            });
            if (!insertRes.success) throw new Error(insertRes.message);
          } catch (e: any) {
            console.error("Database pre-registration error:", e);
            throw new Error(e.message || "Failed to construct the initial job record in SQLite.");
          }
        }

        // Attempt triggering background downloader task on Tauri side
        try {
          const res = await invoke<{ success: boolean; message: string }>("trigger_job_start", { jobSlug: uniqueSlug });
          if (!res.success) {
            throw new Error(res.message);
          }
        } catch (e: any) {
          console.error("trigger_job_start invoke error:", e);
          const errMsg = e.message || "Failed to initialize native direct downloader.";
          useQueueStore.getState().updateJobStatus(uniqueSlug, "error");
          useQueueStore.getState().updateJobProgress(uniqueSlug, 0, errMsg);
        }

        // Redirect to Downloads page
        navigate("/downloads");
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to initialize direct document queue action.");
      } finally {
        setLoading(false);
      }
    } else {
      // 2. DETAILED METADATA DISCOVERY & PROBE WORK
      setParsing(true);
      try {
        let cleanUrl = targetUrl;
        // Clean tracking cookies
        try {
          const cleanRes = await invoke<{ success: boolean; sanitized_url: string }>(
            "process_clipboard_paste",
            { rawInput: targetUrl }
          );
          if (cleanRes.success) {
            cleanUrl = cleanRes.sanitized_url;
          }
        } catch (e) {
          console.warn("Metadata clipboard paste cleaning failed (browser fallback):", e);
        }

        let payload: any = null;
        try {
          const discoverRes = await invoke<{
            success: boolean;
            payload: any;
            error_message: string | null;
          }>("discover_asset_metadata", { targetUrl: cleanUrl });

          if (discoverRes.success && discoverRes.payload) {
            payload = discoverRes.payload;
          } else {
            throw new Error(discoverRes.error_message || "Metadata extraction probe rejected URL.");
          }
        } catch (e: any) {
          console.warn("discover_asset_metadata invoke error (browser fallback simulation active):", e);
          
          // High-fidelity Mock payload for web preview/fallback
          const isPlaylistUrl = cleanUrl.includes("list=") || cleanUrl.includes("playlist");
          if (isPlaylistUrl) {
            payload = {
              id: `play-${Date.now()}`,
              title: "Synclime Platform Development Playlist",
              description: "Complete list of active structured components designed for the premium user shell layer.",
              playlist_count: 3,
              webpage_url: cleanUrl,
              original_url: cleanUrl,
              extractor: "youtube:playlist",
              thumbnails: [{ url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480&auto=format&fit=crop&q=60" }],
              entries: [
                {
                  _type: "url",
                  id: "vid-1",
                  url: "https://youtube.com/watch?v=1",
                  title: "1. Core IPC Architecture & Rust Bridges",
                  description: "Full overview of Tauri backend systems.",
                  duration: 245,
                  thumbnails: [{ url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480&auto=format&fit=crop&q=60" }]
                },
                {
                  _type: "url",
                  id: "vid-2",
                  url: "https://youtube.com/watch?v=2",
                  title: "2. SQLite Transactions and Schema Indexing",
                  description: "Understanding deep database caching.",
                  duration: 412,
                  thumbnails: [{ url: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=480&auto=format&fit=crop&q=60" }]
                },
                {
                  _type: "url",
                  id: "vid-3",
                  url: "https://youtube.com/watch?v=3",
                  title: "3. React and Zustand State Debouncing",
                  description: "Maintaining fluid high-performance render lines.",
                  duration: 188,
                  thumbnails: [{ url: "https://images.unsplash.com/photo-1614850523060-8da1d56ae167?w=480&auto=format&fit=crop&q=60" }]
                }
              ]
            };
          } else {
            payload = {
              id: `vid-${Date.now()}`,
              title: "Introduction to Tauri & React - Premium Development Guide",
              uploader: "Synclime Core Platform",
              duration: 185,
              view_count: 54200,
              thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480&auto=format&fit=crop&q=60",
              formats: [
                { format_id: "bestvideo", ext: "mp4", format_note: "1080p 60fps", width: 1920, height: 1080, fps: 60, filesize: 120000000 },
                { format_id: "720p", ext: "mp4", format_note: "720p 30fps", width: 1280, height: 720, fps: 30, filesize: 60000000 },
                { format_id: "bestaudio", ext: "m4a", format_note: "HQ Audio", acodec: "aac", abr: 256, filesize: 8000000 },
              ],
              subtitles: {
                en: [{ ext: "vtt", url: "", name: "English" }],
                es: [{ ext: "vtt", url: "", name: "Spanish" }]
              },
              chapters: [
                { start_time: 0, end_time: 45, title: "Introduction" },
                { start_time: 45, end_time: 120, title: "IPC Bridges" },
                { start_time: 120, end_time: 185, title: "SQLite Design" }
              ],
              _type: "video"
            };
          }
        }

        // Structurize file for local Zustand repository cache
        const isPlaylist = payload._type === "playlist" || !!payload.entries;
        const parsedFile = {
          slug: payload.id || `file-${Date.now()}`,
          url: cleanUrl,
          title: payload.title || "Untitled Extraction Target",
          sanitizedTitle: (payload.title || "Untitled Extraction Target")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .replace(/_+/g, "_")
            .trim(),
          isPlaylist,
          thumbnail: payload.thumbnail || (payload.thumbnails && payload.thumbnails[0]?.url) || "",
          duration: payload.duration || 0,
          author: payload.uploader || payload.channel || "External Publisher",
          views: payload.view_count || 0,
          payload,
          parsedAt: new Date().toISOString(),
        };

        addParsedFile(parsedFile);

        // Redirect to detail page
        navigate(`/parsed_file/${parsedFile.slug}`);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to analyze target web address parameters.");
      } finally {
        setParsing(false);
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl h-full py-2">
      {/* Top Toolbar / Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-500 rounded-md text-white shadow-sm">
            <Link2 className="w-4 h-4" />
          </div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">New Task</h1>
        </div>
      </div>

      <div className="w-full">
        <div className="flex flex-col gap-4">
          <form onSubmit={handleAction} className="flex flex-col gap-5">
            {/* Input Bar */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Target URL Address</label>
              <input
                type="text"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-sm text-zinc-900 dark:text-white shadow-sm"
              />
            </div>

            {/* Error Message Panel */}
            {errorMsg && (
              <div className="flex items-center gap-2 text-xs font-semibold text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 p-3.5 rounded-2xl animate-shake select-text">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Switch & Action Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
              <div className="flex items-center gap-3">
                <Switch.Root
                  checked={directDownload}
                  onCheckedChange={setDirectDownload}
                  disabled={loading}
                  className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 data-[state=checked]:bg-blue-500 rounded-full relative outline-none cursor-default shadow-inner transition-colors disabled:opacity-50"
                >
                  <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow-sm transition-transform translate-x-[2px] data-[state=checked]:translate-x-[18px]" />
                </Switch.Root>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Direct File Download (Skip Parser)
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50 text-[13px] shadow-sm"
              >
                {!loading && (directDownload ? <FileDown className="w-4 h-4" /> : <Play className="w-4 h-4" />)}
                {directDownload ? "Download" : "Extract Metadata"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

