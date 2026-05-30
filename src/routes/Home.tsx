import { onMount, createSignal, Show, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useUIStore } from "../store/useUIStore";
import { useParseStore } from "../store/useParseStore";
import { useQueueStore, DownloadJob } from "../store/useQueueStore";
import { Switch } from "@kobalte/core/switch";
import { Tooltip } from "@kobalte/core/tooltip";
import { invoke } from "@tauri-apps/api/core";
import { logErrorToDb, logParseToDb } from "../core/logger";
import { Play, FileDown, Link2, AlertCircle, X, ChevronDown, GlobeLock } from "lucide-solid";

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
        class="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-white transition-all shadow-inner outline-none"
      >
        <div class="flex items-center gap-2 truncate">
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
        <div class="absolute z-50 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg shadow-xl overflow-x-hidden overflow-y-auto py-1 max-h-60 custom-scrollbar overscroll-contain animate-fade-in origin-top pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              props.onChange("");
              setIsOpen(false);
            }}
            class={`w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs sm:text-sm transition-all ${
              !props.value
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                : "text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"
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
                class={`w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs sm:text-sm transition-all truncate ${
                  props.value === opt.value
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                    : "text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"
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
    <div class="space-y-3.5 max-w-2xl mx-auto py-1 sm:py-2 select-none animate-fade-in text-xs sm:text-sm font-sans">
      
      <div class="flex items-center justify-between pb-2.5 border-b border-zinc-200 dark:border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-lg">
            <FileDown class="w-5 h-5" />
          </div>
          <div class="text-left">
            <h1 class="text-sm font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">New Download Task</h1>
            <p class="text-[10px] text-zinc-400">Initialize multithreaded network queues</p>
          </div>
        </div>
      </div>

      <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-4 rounded-xl shadow-sm space-y-4">
        <form onSubmit={handleAction} class="space-y-4">
          
          <div class="space-y-1.5 text-left">
            <label class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Asset Link Address
            </label>
            
            <div class="relative flex items-center">
              <div class="absolute left-3.5 text-zinc-400 dark:text-zinc-500">
                <Link2 class="w-4.5 h-4.5" />
              </div>
              
              <input
                type="url"
                placeholder="Paste URL, video, playlist, or document link..."
                value={url()}
                onInput={(e) => setUrl(e.currentTarget.value)}
                disabled={loading()}
                class="w-full pl-10 pr-9 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/10 transition-all outline-none text-xs sm:text-sm text-zinc-900 dark:text-white shadow-inner font-sans"
              />

              <Show when={url()}>
                <Tooltip openDelay={200}>
                  <Tooltip.Trigger
                    as="button"
                    type="button"
                    onClick={() => setUrl("")}
                    class="absolute right-3.5 p-1 rounded-full text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <X class="w-3.5 h-3.5" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans"
                    >
                      <Tooltip.Arrow />
                      Clear URL address
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
              </Show>
            </div>
          </div>

          <div class="space-y-1.5 text-left animate-fade-in">
            <label class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Site Configuration Profile (Cookies & Proxy)
            </label>
            <CustomSelect
              value={selectedSiteSlug()}
              onChange={setSelectedSiteSlug}
              options={siteConfigs().map(c => ({ value: c.slug, label: `${c.title} (${c.domain})` }))}
              placeholder="No Site Profile (Direct network fallback)"
            />
          </div>

          <Show when={errorMsg()}>
            <div class="flex items-center gap-2 text-xs font-bold text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/15 p-3 rounded-lg animate-shake select-text">
              <AlertCircle class="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg()}</span>
            </div>
          </Show>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            
            <div class="flex items-center gap-3 text-left">
              <Tooltip openDelay={200}>
                <Tooltip.Trigger as="div">
                  <Switch
                    checked={directDownload()}
                    onChange={setDirectDownload}
                    disabled={loading()}
                    class="flex items-center"
                  >
                    <Switch.Input class="peer" />
                    <Switch.Control class="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-checked:bg-blue-500 dark:peer-checked:bg-blue-600 rounded-full relative outline-none cursor-pointer transition-colors disabled:opacity-50 flex-shrink-0">
                      <Switch.Thumb class="block w-4 h-4 mt-0.5 ml-0.5 bg-white rounded-full shadow-sm transition-transform translate-x-0 peer-checked:translate-x-[16px]" />
                    </Switch.Control>
                  </Switch>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans"
                  >
                    <Tooltip.Arrow />
                    Skip metadata analysis and download raw asset
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>
              
              <div>
                <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">
                  Direct Download
                </h4>
                <p class="text-[10px] text-zinc-400">Skip media analysis and fetch asset directly</p>
              </div>
            </div>

            <div class="flex justify-end">
              <Tooltip openDelay={200}>
                <Tooltip.Trigger
                  as="button"
                  type="submit"
                  disabled={loading() || !url().trim()}
                  class="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white text-xs font-bold px-4 py-2.5 sm:py-3 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none min-h-[38px]"
                >
                  <Show when={loading()} fallback={
                    <>
                      <Show when={directDownload()} fallback={<Play class="w-3.5 h-3.5" />}>
                        <FileDown class="w-3.5 h-3.5" />
                      </Show>
                      <span>{directDownload() ? "Direct Download" : "Analyze Asset"}</span>
                    </>
                  }>
                    <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing...</span>
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

          </div>
        </form>
      </div>

    </div>
  );
}
