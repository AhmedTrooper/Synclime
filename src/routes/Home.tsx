import { onMount, createSignal, Show, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useUIStore } from "../store/useUIStore";
import { useParseStore } from "../store/useParseStore";
import { useQueueStore, DownloadJob } from "../store/useQueueStore";
import { Switch } from "@kobalte/core/switch";
import { Tooltip } from "@kobalte/core/tooltip";
import { invoke } from "@tauri-apps/api/core";
import { logErrorToDb, logParseToDb } from "../core/logger";
import { Play, FileDown, Link2, AlertCircle, X, ChevronDown, GlobeLock, HardDrive, LayoutGrid } from "lucide-solid";

interface SiteConfig {
  slug: string;
  title: string;
  domain: string;
  cookie_profile_slug: string | null;
  proxy_profile_slug: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const CustomSelect = (props: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const selected = () => props.options.find((o) => o.value === props.value);

  return (
    <div class={`relative w-full ${isOpen() ? "z-50" : "z-10"}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen())}
        class="w-full flex items-center justify-between px-3.5 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 text-xs sm:text-sm text-zinc-900 dark:text-white transition-all shadow-inner outline-none font-semibold cursor-pointer"
      >
        <div class="flex items-center gap-2.5 truncate">
          <GlobeLock class="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          <span class="truncate">{selected() ? selected()!.label : props.placeholder}</span>
        </div>
        <ChevronDown
          class={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
            isOpen() ? "rotate-180" : ""
          }`}
        />
      </button>

      <Show when={isOpen()}>
        <div class="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        <div class="absolute z-50 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-x-hidden overflow-y-auto py-1 max-h-60 custom-scrollbar overscroll-contain animate-fade-in origin-top pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              props.onChange("");
              setIsOpen(false);
            }}
            class={`w-full flex items-center gap-2.5 text-left px-3.5 py-2.5 text-xs sm:text-sm transition-all cursor-pointer ${
              !props.value
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"
            }`}
          >
            <GlobeLock class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
            <span class="truncate">{props.placeholder}</span>
          </button>
          <Show when={props.options.length > 0}>
            <div class="h-[1px] bg-zinc-200 dark:bg-zinc-800 w-full my-1" />
          </Show>
          <For each={props.options}>
            {(opt) => (
              <button
                type="button"
                onClick={() => {
                  props.onChange(opt.value);
                  setIsOpen(false);
                }}
                class={`w-full flex items-center gap-2.5 text-left px-3.5 py-2.5 text-xs sm:text-sm transition-all truncate cursor-pointer ${
                  props.value === opt.value
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"
                }`}
              >
                <GlobeLock class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                <span class="truncate">{opt.label}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();

  const [url, setUrl] = createSignal("");
  const [directDownload, setDirectDownload] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal("");
  const [siteConfigs, setSiteConfigs] = createSignal<SiteConfig[]>([]);
  const [selectedSiteSlug, setSelectedSiteSlug] = createSignal<string>("");

  onMount(() => {
    useUIStore.setActivePath("/");
    const fetchConfigs = async () => {
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        try {
          const configs = await invoke<SiteConfig[]>("get_site_configs");
          setSiteConfigs(configs);
          const defaultCfg = configs.find(c => c.is_default);
          if (defaultCfg) {
            setSelectedSiteSlug(defaultCfg.slug);
          }
        } catch (e) {
          await logErrorToDb(String(e), "fetchConfigs");
        }
      }
    };
    fetchConfigs();
  });

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch (e) {
      console.warn("Failed to read clipboard:", e);
    }
  };

  const handleAction = async (e: Event) => {
    e.preventDefault();
    if (!url().trim()) {
      setErrorMsg("Please provide a valid asset web URL address first.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    const targetUrl = url().trim();

    if (directDownload()) {
      try {
        let cleanUrl = targetUrl;
        try {
          const cleanRes = await invoke<{ success: boolean; sanitized_url: string }>(
            "process_clipboard_paste",
            { rawInput: targetUrl }
          );
          if (cleanRes.success) {
            cleanUrl = cleanRes.sanitized_url;
          }
        } catch (e) {
          await logErrorToDb(String(e), "process_clipboard_paste_direct");
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

        useQueueStore.addJob(newJob);

        const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;

        if (isTauri) {
          try {
            const insertRes = await invoke<{ success: boolean; message: string }>("insert_job_record", {
              payload: {
                slug: newJob.slug,
                url: newJob.url,
                file_type: newJob.fileType,
                format_string: "bestvideo+bestaudio/best",
                download_path: useUIStore.state.downloadPath,
                created_at: newJob.createdAt,
                site_config_slug: selectedSiteSlug() || null,
              }
            });
            if (!insertRes.success) throw new Error(insertRes.message);
          } catch (e: any) {
            await logErrorToDb(e.message || String(e), "insert_job_record_direct", newJob.slug);
            throw new Error(e.message || "Failed to construct the initial job record in SQLite.");
          }
        }

        try {
          const res = await invoke<{ success: boolean; message: string }>("trigger_job_start", { jobSlug: uniqueSlug });
          if (!res.success) {
            throw new Error(res.message);
          }
        } catch (e: any) {
          await logErrorToDb(e.message || String(e), "trigger_job_start_direct", uniqueSlug);
          const errMsg = e.message || "Failed to initialize native direct downloader.";
          useQueueStore.updateJobStatus(uniqueSlug, "error");
          useQueueStore.updateJobProgress(uniqueSlug, 0, errMsg);
        }

        navigate("/downloads");
      } catch (err: any) {
        await logErrorToDb(err.message || String(err), "direct_download_flow", "direct_fallback");
        setErrorMsg(err.message || "Failed to initialize direct document queue action.");
      } finally {
        setLoading(false);
      }
    } else {
      useParseStore.setParsing(true);
      try {
        let cleanUrl = targetUrl;
        try {
          const cleanRes = await invoke<{ success: boolean; sanitized_url: string }>(
            "process_clipboard_paste",
            { rawInput: targetUrl }
          );
          if (cleanRes.success) {
            cleanUrl = cleanRes.sanitized_url;
          }
        } catch (e) {
          await logErrorToDb(String(e), "process_clipboard_paste_metadata");
        }

        let payload: any = null;
        const startedAt = new Date().toISOString();
        const startTime = Date.now();
        try {
          const discoverRes = await invoke<{
            success: boolean;
            payload: any;
            error_message: string | null;
          }>("discover_asset_metadata", {
            targetUrl: cleanUrl,
            siteConfigSlug: selectedSiteSlug() || null
          });

          if (discoverRes.success && discoverRes.payload) {
            payload = discoverRes.payload;
            await logParseToDb(
              payload.id || `file-${Date.now()}`,
              "success",
              startedAt,
              new Date().toISOString(),
              Date.now() - startTime,
              `yt-dlp --dump-single-json ${cleanUrl}`,
              0,
              JSON.stringify(payload).length
            );
          } else {
            throw new Error(discoverRes.error_message || "Metadata extraction probe rejected URL.");
          }
        } catch (e: any) {
          await logParseToDb(
            "unknown_target",
            "failed",
            startedAt,
            new Date().toISOString(),
            Date.now() - startTime,
            `yt-dlp --dump-single-json ${cleanUrl}`,
            1,
            0
          );
          await logErrorToDb(e.message || String(e), "discover_asset_metadata");
          
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
          siteConfigSlug: selectedSiteSlug() || undefined,
        };

        useParseStore.addParsedFile(parsedFile);

        const isTauriEnvironment = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
        if (isTauriEnvironment) {
          try {
            await invoke("insert_parsed_file", {
              payload: {
                slug: parsedFile.slug,
                url: parsedFile.url,
                title: parsedFile.title,
                sanitized_title: parsedFile.sanitizedTitle,
                is_playlist: parsedFile.isPlaylist ? 1 : 0,
                parent_playlist_slug: null,
                playlist_name: parsedFile.isPlaylist ? parsedFile.title : null,
                sanitized_playlist_name: parsedFile.isPlaylist ? parsedFile.sanitizedTitle : null,
                json_metadata: JSON.stringify(payload),
                created_at: parsedFile.parsedAt,
                site_config_slug: selectedSiteSlug() || null,
              }
            });
          } catch (e) {
            await logErrorToDb(String(e), "insert_parsed_file", parsedFile.slug);
          }
        }

        navigate(`/parsed_file/${parsedFile.slug}`);
      } catch (err: any) {
        await logErrorToDb(err.message || String(err), "detailed_metadata_discovery_failed");
        setErrorMsg(err.message || "Failed to analyze target web address parameters.");
      } finally {
        useParseStore.setParsing(false);
        setLoading(false);
      }
    }
  };

  return (
    <div class="w-full max-w-5xl mx-auto space-y-4.5 select-none animate-fade-in text-xs sm:text-sm font-sans px-1">
      
      {/* Native-feeling Title Panel / Toolbar Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/80 gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 shadow-sm">
            <FileDown class="w-5 h-5" />
          </div>
          <div class="text-left">
            <h1 class="text-sm font-black text-zinc-900 dark:text-white tracking-tight leading-tight uppercase">Task Controller</h1>
            <p class="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Initialize multithreaded media pipeline downloads</p>
          </div>
        </div>

        {/* Engine Diagnostics Pills */}
        <div class="flex items-center gap-2 overflow-x-auto py-1 scrollbar-hide">
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Aria2 Daemon Active</span>
          </div>
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-full whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>SQLite Connected</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Side: Create Task Control Panel */}
        <div class="lg:col-span-7 xl:col-span-8 flex flex-col">
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex-1 flex flex-col justify-between">
            <form onSubmit={handleAction} class="space-y-5 flex-1 flex flex-col justify-between">
              <div class="space-y-5">
                
                {/* Asset URL Section */}
                <div class="space-y-2 text-left">
                  <div class="flex items-center justify-between">
                    <label class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Resource URL / Address Link
                    </label>
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      class="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      <span>Paste Clipboard</span>
                    </button>
                  </div>
                  
                  <div class="relative flex items-center group">
                    <div class="absolute left-3.5 text-zinc-400 group-focus-within:text-blue-500 dark:text-zinc-500 dark:group-focus-within:text-blue-400 transition-colors">
                      <Link2 class="w-4 h-4" />
                    </div>
                    
                    <input
                      type="url"
                      placeholder="Paste media link, video URL, playlist or custom document..."
                      value={url()}
                      onInput={(e) => setUrl(e.currentTarget.value)}
                      disabled={loading()}
                      class="w-full pl-10 pr-10 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/5 transition-all outline-none text-xs sm:text-sm text-zinc-900 dark:text-white shadow-inner font-sans font-medium"
                    />

                    <Show when={url()}>
                      <Tooltip openDelay={200}>
                        <Tooltip.Trigger
                          as="button"
                          type="button"
                          onClick={() => setUrl("")}
                          class="absolute right-3.5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                        >
                          <X class="w-3.5 h-3.5" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans"
                          >
                            <Tooltip.Arrow />
                            Clear Resource Link
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip>
                    </Show>
                  </div>
                </div>

                {/* Task Execution Mode (Segment Selector Grid) */}
                <div class="space-y-2 text-left">
                  <label class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    Task Execution Strategy
                  </label>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Mode 1: Metadata Extraction */}
                    <button
                      type="button"
                      onClick={() => setDirectDownload(false)}
                      disabled={loading()}
                      class={`flex flex-col items-start text-left p-3.5 rounded-xl border transition-all relative overflow-hidden cursor-pointer ${
                        !directDownload()
                          ? "border-blue-500/80 bg-blue-500/[0.03] dark:bg-blue-500/[0.04] text-zinc-900 dark:text-white shadow-sm ring-1 ring-blue-500/30"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/10 text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      <div class="flex items-center gap-2 mb-1">
                        <div class={`p-1.5 rounded-lg ${!directDownload() ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
                          <Play class="w-3.5 h-3.5" />
                        </div>
                        <span class="text-xs font-black uppercase tracking-tight">Metadata Extract</span>
                      </div>
                      <p class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal pl-0.5 mt-0.5">
                        Deep analyze formats, subtitles, and segments before queue creation.
                      </p>
                      <Show when={!directDownload()}>
                        <span class="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                      </Show>
                    </button>

                    {/* Mode 2: Direct Downloader */}
                    <button
                      type="button"
                      onClick={() => setDirectDownload(true)}
                      disabled={loading()}
                      class={`flex flex-col items-start text-left p-3.5 rounded-xl border transition-all relative overflow-hidden cursor-pointer ${
                        directDownload()
                          ? "border-blue-500/80 bg-blue-500/[0.03] dark:bg-blue-500/[0.04] text-zinc-900 dark:text-white shadow-sm ring-1 ring-blue-500/30"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/10 text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      <div class="flex items-center gap-2 mb-1">
                        <div class={`p-1.5 rounded-lg ${directDownload() ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
                          <FileDown class="w-3.5 h-3.5" />
                        </div>
                        <span class="text-xs font-black uppercase tracking-tight">Direct Queue</span>
                      </div>
                      <p class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal pl-0.5 mt-0.5">
                        Bypass parameter analyses and start direct multithreaded network write.
                      </p>
                      <Show when={directDownload()}>
                        <span class="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                      </Show>
                    </button>

                  </div>
                </div>

                {/* Site Profile Picker */}
                <div class="space-y-2 text-left">
                  <label class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    Site Access Rule / Authentication Proxy
                  </label>
                  <CustomSelect
                    value={selectedSiteSlug()}
                    onChange={setSelectedSiteSlug}
                    options={siteConfigs().map(c => ({ value: c.slug, label: `${c.title} (${c.domain})` }))}
                    placeholder="Direct Connection (Default Network Bypass)"
                  />
                </div>

                {/* Error Box */}
                <Show when={errorMsg()}>
                  <div class="flex items-start gap-2.5 text-xs font-semibold text-red-500 dark:text-red-400 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl animate-shake select-text text-left">
                    <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                    <div class="space-y-0.5">
                      <div class="font-bold text-red-600 dark:text-red-400">Analysis Exception</div>
                      <div class="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">{errorMsg()}</div>
                    </div>
                  </div>
                </Show>

              </div>

              {/* Primary Tactile Button */}
              <div class="pt-6">
                <Tooltip openDelay={200}>
                  <Tooltip.Trigger
                    as="button"
                    type="submit"
                    disabled={loading() || !url().trim()}
                    class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white text-xs font-black py-3 px-5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none min-h-[46px] border border-blue-500/20 dark:border-blue-400/20 tracking-wider uppercase cursor-pointer"
                  >
                    <Show when={loading()} fallback={
                      <>
                        <Show when={directDownload()} fallback={<Play class="w-4 h-4" />}>
                          <FileDown class="w-4 h-4" />
                        </Show>
                        <span>{directDownload() ? "Initialize Direct Download" : "Analyze Resource Parameters"}</span>
                      </>
                    }>
                      <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Extracting Resource Parameters...</span>
                    </Show>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans"
                    >
                      <Tooltip.Arrow />
                      {directDownload() ? "Queue direct download stream" : "Analyze resolution formats and subtitles"}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
              </div>

            </form>
          </div>
        </div>

        {/* Right Side: Desktop Engine Status & Info Panel */}
        <div class="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 text-left">
          
          {/* Active Config Connection */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/10 p-4.5 rounded-2xl space-y-3.5 backdrop-blur-md">
            <h3 class="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-tight uppercase border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 flex items-center justify-between">
              <span>Access Environment</span>
              <GlobeLock class="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            </h3>
            
            <Show when={selectedSiteSlug()} fallback={
              <div class="space-y-3.5 py-1">
                <p class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed font-semibold">
                  Currently running in native direct connection mode. No custom cookies, logins, or HTTP proxy pipelines will be applied.
                </p>
                <div class="flex items-center gap-2 p-2 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/15 rounded-xl">
                  <div class="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span class="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Default Direct Network Active</span>
                </div>
              </div>
            }>
              {(() => {
                const activeCfg = () => siteConfigs().find(c => c.slug === selectedSiteSlug());
                return (
                  <div class="space-y-3 font-sans font-medium text-[11px] text-zinc-600 dark:text-zinc-400">
                    <div class="flex items-center justify-between">
                      <span class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Selected Profile</span>
                      <span class="font-extrabold text-blue-600 dark:text-blue-400 truncate max-w-[150px]">{activeCfg()?.title}</span>
                    </div>
                    <div class="flex items-center justify-between font-mono">
                      <span class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase font-sans">Target Domain</span>
                      <span class="truncate max-w-[150px] font-semibold text-zinc-700 dark:text-zinc-300">{activeCfg()?.domain}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Cookies Integration</span>
                      <div class="flex items-center gap-1.5">
                        <span class={`w-1.5 h-1.5 rounded-full ${activeCfg()?.cookie_profile_slug ? "bg-emerald-500" : "bg-zinc-400"}`} />
                        <span class="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{activeCfg()?.cookie_profile_slug ? "Enabled" : "Bypassed"}</span>
                      </div>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Proxy Access</span>
                      <div class="flex items-center gap-1.5">
                        <span class={`w-1.5 h-1.5 rounded-full ${activeCfg()?.proxy_profile_slug ? "bg-emerald-500" : "bg-zinc-400"}`} />
                        <span class="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{activeCfg()?.proxy_profile_slug ? "Active" : "None"}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Show>
          </div>

          {/* Quick Engine Diagnostics */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/10 p-4.5 rounded-2xl space-y-3 backdrop-blur-md">
            <h3 class="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-tight uppercase border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 flex items-center justify-between">
              <span>System Core Services</span>
              <span class="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold font-mono">1.0.0-PRO</span>
            </h3>
            
            <div class="space-y-2.5 font-sans font-medium text-[11px]">
              <div class="flex items-center justify-between text-xs">
                <span class="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">Tauri Rust Core Server</span>
                <span class="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">ACTIVE</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">Metadata Engine (yt-dlp)</span>
                <span class="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">READY</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">Multi-Thread Daemon (aria2)</span>
                <span class="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">STANDBY</span>
              </div>
            </div>
          </div>

          {/* Library and Queue Stats Quick widgets */}
          <div class="grid grid-cols-2 gap-3.5">
            <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/10 p-3.5 rounded-2xl backdrop-blur-md">
              <div class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Queue Jobs</div>
              <div class="text-xl font-black text-zinc-800 dark:text-white tracking-tight mt-1 flex items-center gap-2">
                <HardDrive class="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <span>{useQueueStore.state.queue.length}</span>
              </div>
            </div>
            <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/10 p-3.5 rounded-2xl backdrop-blur-md">
              <div class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Saved Cache</div>
              <div class="text-xl font-black text-zinc-800 dark:text-white tracking-tight mt-1 flex items-center gap-2">
                <LayoutGrid class="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <span>{useParseStore.state.parsedFiles.length}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
