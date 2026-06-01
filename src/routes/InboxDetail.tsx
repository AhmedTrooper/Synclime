import { onMount, createSignal, Show, For } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { useUIStore } from "../store/useUIStore";
import { useParseStore } from "../store/useParseStore";
import { useQueueStore, DownloadJob } from "../store/useQueueStore";
import { Switch } from "@kobalte/core/switch";
import { Tooltip } from "@kobalte/core/tooltip";
import { invoke } from "@tauri-apps/api/core";
import { logErrorToDb, logParseToDb } from "../core/logger";
import { 
  Play, 
  FileDown, 
  Link2, 
  AlertCircle, 
  ChevronDown, 
  GlobeLock, 
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  Inbox
} from "lucide-solid";

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

interface InboxItem {
  slug: string;
  url: string;
  status: "pending" | "parsed" | "downloaded";
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
        <div class="absolute z-50 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-x-hidden overflow-y-auto py-1 max-h-60 custom-scrollbar overscroll-contain animate-fade-in origin-top pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              props.onChange("");
              setIsOpen(false);
            }}
            class={`w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs sm:text-sm transition-all ${
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
                class={`w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-xs sm:text-sm transition-all truncate ${
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

export default function InboxDetail() {
  const navigate = useNavigate();
  const params = useParams();

  const [inboxItem, setInboxItem] = createSignal<InboxItem | null>(null);
  const [url, setUrl] = createSignal("");
  const [directDownload, setDirectDownload] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [fetchingDetails, setFetchingDetails] = createSignal(true);
  const [errorMsg, setErrorMsg] = createSignal("");
  const [siteConfigs, setSiteConfigs] = createSignal<SiteConfig[]>([]);
  const [selectedSiteSlug, setSelectedSiteSlug] = createSignal<string>("");

  onMount(() => {
    useUIStore.setActivePath("/inbox");
    const fetchConfigsAndInbox = async () => {
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      
      // Fetch Site Configs
      if (isTauri) {
        try {
          const configs = await invoke<SiteConfig[]>("get_site_configs");
          setSiteConfigs(configs);
          const defaultCfg = configs.find(c => c.is_default);
          if (defaultCfg) {
            setSelectedSiteSlug(defaultCfg.slug);
          }
        } catch (e) {
          await logErrorToDb(String(e), "fetchConfigs_inbox_detail");
        }
      }

      // Fetch Inbox Details
      if (isTauri) {
        try {
          const item = await invoke<InboxItem | null>("get_inbox_url_by_slug", { slug: params.slug });
          if (item) {
            setInboxItem(item);
            setUrl(item.url);
          } else {
            setErrorMsg("Inbox link not found in database.");
          }
        } catch (e) {
          setErrorMsg("Failed to query inbox link details.");
        } finally {
          setFetchingDetails(false);
        }
      } else {
        // Mock fallback
        setTimeout(() => {
          setInboxItem({
            slug: params.slug,
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          setUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
          setFetchingDetails(false);
        }, 600);
      }
    };
    fetchConfigsAndInbox();
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
        const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
        if (isTauri) {
          try {
            const cleanRes = await invoke<{ success: boolean; sanitized_url: string }>(
              "process_clipboard_paste",
              { rawInput: targetUrl }
            );
            if (cleanRes.success) {
              cleanUrl = cleanRes.sanitized_url;
            }
          } catch (e) {
            await logErrorToDb(String(e), "process_clipboard_paste_direct_inbox");
          }
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
            await logErrorToDb(e.message || String(e), "insert_job_record_direct_inbox", newJob.slug);
            throw new Error(e.message || "Failed to construct the initial job record in SQLite.");
          }
        }

        try {
          const res = await invoke<{ success: boolean; message: string }>("trigger_job_start", { jobSlug: uniqueSlug });
          if (!res.success) {
            throw new Error(res.message);
          }

          // Update Inbox status to 'downloaded'
          if (isTauri) {
            await invoke("update_inbox_status", { slug: params.slug, status: "downloaded" });
          }
        } catch (e: any) {
          await logErrorToDb(e.message || String(e), "trigger_job_start_direct_inbox", uniqueSlug);
          const errMsg = e.message || "Failed to initialize native direct downloader.";
          useQueueStore.updateJobStatus(uniqueSlug, "error");
          useQueueStore.updateJobProgress(uniqueSlug, 0, errMsg);
        }

        navigate("/downloads");
      } catch (err: any) {
        await logErrorToDb(err.message || String(err), "direct_download_flow_inbox", "direct_fallback");
        setErrorMsg(err.message || "Failed to initialize direct document queue action.");
      } finally {
        setLoading(false);
      }
    } else {
      useParseStore.setParsing(true);
      try {
        let cleanUrl = targetUrl;
        const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
        if (isTauri) {
          try {
            const cleanRes = await invoke<{ success: boolean; sanitized_url: string }>(
              "process_clipboard_paste",
              { rawInput: targetUrl }
            );
            if (cleanRes.success) {
              cleanUrl = cleanRes.sanitized_url;
            }
          } catch (e) {
            await logErrorToDb(String(e), "process_clipboard_paste_metadata_inbox");
          }
        }

        let payload: any = null;
        const startedAt = new Date().toISOString();
        const startTime = Date.now();
        
        if (isTauri) {
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
            await logErrorToDb(e.message || String(e), "discover_asset_metadata_inbox");
            throw e;
          }
        } else {
          // Mock discovery
          payload = {
            id: `vid-${Date.now()}`,
            title: "Introduction to Tauri & SolidJS - Inbox Processed Guide",
            uploader: "Synclime Core Platform",
            duration: 185,
            view_count: 54200,
            thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480&auto=format&fit=crop&q=60",
            formats: [
              { format_id: "bestvideo", ext: "mp4", format_note: "1080p 60fps", width: 1920, height: 1080, fps: 60, filesize: 120000000 },
              { format_id: "720p", ext: "mp4", format_note: "720p 30fps", width: 1280, height: 720, fps: 30, filesize: 60000000 },
              { format_id: "bestaudio", ext: "m4a", format_note: "HQ Audio", acodec: "aac", abr: 256, filesize: 8000000 },
            ],
            subtitles: {},
            chapters: [],
            _type: "video"
          };
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

        if (isTauri) {
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

            // Update Inbox status to 'parsed'
            await invoke("update_inbox_status", { slug: params.slug, status: "parsed" });
          } catch (e) {
            await logErrorToDb(String(e), "insert_parsed_file_inbox", parsedFile.slug);
          }
        }

        navigate(`/parsed_file/${parsedFile.slug}`);
      } catch (err: any) {
        await logErrorToDb(err.message || String(err), "detailed_metadata_discovery_failed_inbox");
        setErrorMsg(err.message || "Failed to analyze target web address parameters.");
      } finally {
        useParseStore.setParsing(false);
        setLoading(false);
      }
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "n/a";
    }
  };

  return (
    <div class="space-y-4 max-w-2xl mx-auto py-2 select-none animate-fade-in text-xs sm:text-sm font-sans text-left">
      
      {/* Back button & title */}
      <div class="flex items-center gap-3">
        <button
          onClick={() => navigate("/inbox")}
          class="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Back to Inbox Queue"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <div>
          <h1 class="text-base font-bold text-zinc-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            Inbox Action Center
          </h1>
          <p class="text-[10px] text-zinc-400">Configure parameters to parse or directly download the queued link</p>
        </div>
      </div>

      <Show when={!fetchingDetails()} fallback={
        <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-zinc-400 text-xs font-semibold">Querying SQLite database details...</p>
        </div>
      }>
        <Show when={inboxItem()} fallback={
          <div class="border border-red-200/60 dark:border-red-900/40 bg-red-500/5 p-4 rounded-xl text-center text-red-500 font-semibold text-xs flex items-center justify-center gap-2">
            <span>{errorMsg()}</span>
          </div>
        }>
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-5 rounded-2xl shadow-sm space-y-5">
            {/* Link details box */}
            <div class="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
              <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <Inbox class="w-4.5 h-4.5" />
              </div>
              <div class="space-y-1 overflow-hidden min-w-0">
                <div class="flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
                  <span class="flex items-center gap-1"><Calendar class="w-3 h-3" />{formatDate(inboxItem()!.created_at)}</span>
                  <span>•</span>
                  <span>Status: <strong class="text-blue-500 capitalize">{inboxItem()!.status}</strong></span>
                </div>
                <p class="text-zinc-800 dark:text-zinc-100 font-semibold break-all text-xs">
                  {inboxItem()!.url}
                </p>
              </div>
            </div>

            <form onSubmit={handleAction} class="space-y-5">
              {/* Asset URL field - readonly for safety */}
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Target Link Address
                </label>
                <div class="relative flex items-center">
                  <div class="absolute left-3.5 text-zinc-400 dark:text-zinc-500">
                    <Link2 class="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="url"
                    value={url()}
                    onInput={(e) => setUrl(e.currentTarget.value)}
                    disabled={loading()}
                    class="w-full pl-10 pr-4 py-2.5 bg-zinc-100/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 cursor-not-allowed outline-none shadow-inner"
                    readonly
                  />
                </div>
              </div>

              {/* Toggle switch for direct download */}
              <div class="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-inner">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileDown class="w-4.5 h-4.5" />
                  </div>
                  <div class="text-left space-y-0.5 max-w-sm">
                    <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">
                      Direct Single File Download
                    </label>
                    <p class="text-[10px] text-zinc-400 leading-normal">
                      Bypass layout extraction to directly download raw document links (e.g. zip, pdf, dmg, binary)
                    </p>
                  </div>
                </div>

                <Switch
                  checked={directDownload()}
                  onChange={setDirectDownload}
                  disabled={loading()}
                  class="flex items-center"
                >
                  <Switch.Input class="sr-only" />
                  <Switch.Control class="w-10 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full transition-colors flex items-center cursor-pointer p-0.5 ui-checked:bg-emerald-500">
                    <Switch.Thumb class="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ui-checked:translate-x-4" />
                  </Switch.Control>
                </Switch>
              </div>

              {/* Site configs */}
              <Show when={!directDownload()}>
                <div class="space-y-1.5 animate-fade-in">
                  <label class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Site Configuration Profile</span>
                    <span class="text-[9px] lowercase text-zinc-400 font-semibold normal-case">
                      applied default credentials if domains match
                    </span>
                  </label>

                  <CustomSelect
                    value={selectedSiteSlug()}
                    onChange={setSelectedSiteSlug}
                    options={siteConfigs().map(c => ({ value: c.slug, label: `${c.title} (${c.domain})` }))}
                    placeholder="Auto-match configurations by link hostname"
                  />
                </div>
              </Show>

              {/* Error block */}
              <Show when={errorMsg()}>
                <div class="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 animate-fade-in text-xs">
                  <AlertCircle class="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                  <span class="font-medium text-left leading-normal">{errorMsg()}</span>
                </div>
              </Show>

              {/* Submit Buttons */}
              <div class="pt-2">
                <button
                  type="submit"
                  disabled={loading()}
                  class={`w-full flex items-center justify-center gap-2 py-3 px-4 font-bold text-white rounded-xl shadow-lg hover:shadow-xl transition-all outline-none ${
                    directDownload()
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/15"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/15"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Show when={loading()} fallback={
                    <>
                      <Show when={directDownload()} fallback={<Play class="w-4 h-4" />}>
                        <FileDown class="w-4 h-4" />
                      </Show>
                      <span>
                        {directDownload() ? "Begin Direct File Download" : "Analyze & Extract Video Metadata"}
                      </span>
                    </>
                  }>
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>
                      {directDownload() ? "Connecting to stream threads..." : "Polling manifest pipelines..."}
                    </span>
                  </Show>
                </button>
              </div>
            </form>
          </div>
        </Show>
      </Show>
    </div>
  );
}
