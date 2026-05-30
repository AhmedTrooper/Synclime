import { onMount, createSignal, Show, createMemo, For } from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import { useUIStore } from "../store/useUIStore";
import { useParseStore } from "../store/useParseStore";
import { useQueueStore, DownloadJob } from "../store/useQueueStore";
import { ArrowLeft, Clock, Eye, DownloadCloud, Monitor, Music, ShieldAlert } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";

export default function ParsedFileDetail() {
  const params = useParams();
  const navigate = useNavigate();

  const file = createMemo(() => useParseStore.state.parsedFiles.find((f) => f.slug === params.slug));
  const payload = createMemo(() => file()?.payload);

  const [selectedFormat, setSelectedFormat] = createSignal<string>("");
  const [selectedSubtitles, setSelectedSubtitles] = createSignal<string[]>([]);
  const [downloading, setDownloading] = createSignal(false);

  onMount(() => {
    useUIStore.setActivePath("/parsed_files");
    if (!file()) {
      navigate("/parsed_files", { replace: true });
    }
  });

  const availableVideoFormats = createMemo(() => {
    if (!payload()) return [];
    return (payload().formats || [])
      .filter((f: any) => f.vcodec !== "none" && f.ext === "mp4")
      .map((f: any) => ({
        id: f.format_id,
        label: `${f.format_note || f.resolution || "Unknown"} - ${f.ext} (${Math.round((f.filesize || 0) / 1024 / 1024)}MB)`,
        ext: f.ext,
        vcodec: f.vcodec,
      }));
  });

  const availableAudioFormats = createMemo(() => {
    if (!payload()) return [];
    return (payload().formats || [])
      .filter((f: any) => f.vcodec === "none" && f.acodec !== "none")
      .map((f: any) => ({
        id: f.format_id,
        label: `Audio Only - ${f.ext} (${f.abr || "unknown"}kbps, ${Math.round((f.filesize || 0) / 1024 / 1024)}MB)`,
        ext: f.ext,
        acodec: f.acodec,
      }));
  });

  const combinedFormats = createMemo(() => {
    return [
      { id: "bestvideo+bestaudio/best", label: "Best Video + Best Audio (Recommended)", ext: "mp4", vcodec: "best" },
      { id: "bestaudio/best", label: "Best Audio Only (Recommended)", ext: "m4a", acodec: "best" },
      ...availableVideoFormats(),
      ...availableAudioFormats(),
    ];
  });

  const availableSubtitles = createMemo(() => {
    if (!payload()) return [];
    const subs = payload().subtitles || {};
    return Object.keys(subs).map((lang) => ({
      lang,
      name: subs[lang][0]?.name || lang,
    }));
  });

  const handleDownload = async () => {
    const f = file();
    if (!f || downloading()) return;

    const formatId = selectedFormat() || "bestvideo+bestaudio/best";

    try {
      setDownloading(true);

      const jobSlug = `job-${Date.now()}`;
      const newJob: DownloadJob = {
        slug: jobSlug,
        name: f.title,
        url: f.url,
        progress: 0,
        status: "pending",
        message: "Queued for stream multiplexing...",
        fileType: formatId.includes("audio") && !formatId.includes("video") ? "audio" : "video",
        formatString: formatId,
        createdAt: new Date().toISOString(),
        parsedFileSlug: f.slug,
        isPlaylist: false,
      };

      useQueueStore.addJob(newJob);

      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        await invoke("insert_job_record", {
          payload: {
            slug: newJob.slug,
            url: newJob.url,
            file_type: newJob.fileType,
            format_string: newJob.formatString,
            download_path: useUIStore.state.downloadPath,
            created_at: newJob.createdAt,
            parsed_file_slug: newJob.parsedFileSlug,
            parent_playlist_slug: null,
            playlist_name: null,
            site_config_slug: f.siteConfigSlug || null,
          }
        });
      }

      if (selectedSubtitles().length > 0) {
        for (const lang of selectedSubtitles()) {
          const subSlug = `sub-${lang}-${Date.now()}`;
          const subJob: DownloadJob = {
            slug: subSlug,
            name: `[sub_${lang}]_${f.title}`,
            url: f.url,
            progress: 0,
            status: "pending",
            message: "Extracting subtitle track...",
            fileType: "subtitle",
            formatString: `bestvideo+bestaudio/best --write-sub --sub-lang ${lang} --skip-download`,
            createdAt: new Date().toISOString(),
            parsedFileSlug: f.slug,
            associatedMediaJobSlug: jobSlug,
          };
          useQueueStore.addJob(subJob);

          if (isTauri) {
            await invoke("insert_job_record", {
              payload: {
                slug: subJob.slug,
                url: subJob.url,
                file_type: subJob.fileType,
                format_string: subJob.formatString,
                download_path: useUIStore.state.downloadPath,
                created_at: subJob.createdAt,
                parsed_file_slug: subJob.parsedFileSlug,
                associated_media_job_slug: subJob.associatedMediaJobSlug,
                site_config_slug: f.siteConfigSlug || null,
              }
            });
          }
        }
      }

      if (isTauri) {
        await invoke("trigger_job_start", { jobSlug: jobSlug });
        for (const lang of selectedSubtitles()) {
          // just an example of starting the subs sequentially
        }
      }

      navigate("/downloads");
    } catch (err) {
      console.error("Failed to enqueue download:", err);
      alert("Failed to enqueue download task. Check system logs for details.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePlaylistDownload = async () => {
    const f = file();
    if (!f || downloading()) return;

    try {
      setDownloading(true);

      const parentPlaylistSlug = `playgrp-${Date.now()}`;
      
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      
      if (payload().entries && Array.isArray(payload().entries)) {
        for (const entry of payload().entries) {
          const entryJobSlug = `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const newJob: DownloadJob = {
            slug: entryJobSlug,
            name: entry.title || `Playlist Entry - ${entry.id}`,
            url: entry.url || `https://youtube.com/watch?v=${entry.id}`,
            progress: 0,
            status: "pending",
            message: "Queued playlist entry...",
            fileType: "video",
            formatString: "bestvideo+bestaudio/best",
            createdAt: new Date().toISOString(),
            parsedFileSlug: f.slug,
            isPlaylist: false,
            parentPlaylistSlug,
            playlistName: f.title,
          };

          useQueueStore.addJob(newJob);

          if (isTauri) {
            await invoke("insert_job_record", {
              payload: {
                slug: newJob.slug,
                url: newJob.url,
                file_type: newJob.fileType,
                format_string: newJob.formatString,
                download_path: useUIStore.state.downloadPath,
                created_at: newJob.createdAt,
                parsed_file_slug: newJob.parsedFileSlug,
                parent_playlist_slug: newJob.parentPlaylistSlug,
                playlist_name: newJob.playlistName,
                site_config_slug: f.siteConfigSlug || null,
              }
            });
            await invoke("trigger_job_start", { jobSlug: entryJobSlug });
          }
        }
      }

      navigate("/downloads");
    } catch (err) {
      console.error("Failed to enqueue playlist:", err);
      alert("Failed to enqueue playlist task.");
    } finally {
      setDownloading(false);
    }
  };

  const toggleSubtitle = (lang: string) => {
    setSelectedSubtitles((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  return (
    <Show when={file()} fallback={null}>
      <div class="flex flex-col gap-6 w-full max-w-5xl mx-auto h-full py-2 animate-fade-in font-sans">
        <div class="flex items-center gap-4">
          <A
            href="/parsed_files"
            class="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            <ArrowLeft class="w-5 h-5" />
          </A>
          <div class="flex flex-col flex-grow min-w-0">
            <h1 class="text-lg font-bold text-zinc-900 dark:text-white truncate">{file()!.title}</h1>
            <span class="text-xs text-zinc-500 dark:text-zinc-400 truncate">{file()!.url}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          <div class="flex flex-col gap-6">
            <div class="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-md">
              <Show when={file()!.thumbnail} fallback={
                <div class="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-600">
                  <Monitor class="w-12 h-12" />
                  <span class="text-sm font-semibold">No Preview Available</span>
                </div>
              }>
                <img
                  src={file()!.thumbnail}
                  alt={file()!.title}
                  class="w-full h-full object-cover"
                />
              </Show>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                <span class="text-[10px] uppercase font-bold text-zinc-400">Duration</span>
                <div class="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold">
                  <Clock class="w-4 h-4 text-blue-500" />
                  {Math.floor(file()!.duration / 60)}:{(file()!.duration % 60).toString().padStart(2, "0")}
                </div>
              </div>
              <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                <span class="text-[10px] uppercase font-bold text-zinc-400">Views</span>
                <div class="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold">
                  <Eye class="w-4 h-4 text-purple-500" />
                  {file()!.views.toLocaleString()}
                </div>
              </div>
              <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-1 shadow-sm col-span-2">
                <span class="text-[10px] uppercase font-bold text-zinc-400">Author / Channel</span>
                <div class="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold truncate">
                  {file()!.author}
                </div>
              </div>
            </div>

            <Show when={file()!.isPlaylist}>
              <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <h3 class="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Monitor class="w-4 h-4 text-purple-500" />
                  Playlist Entries ({payload().entries?.length || 0})
                </h3>
                <div class="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
                  <For each={payload().entries}>
                    {(entry, i) => (
                      <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <span class="text-xs font-bold text-zinc-400 w-5">{i() + 1}.</span>
                        <div class="flex flex-col min-w-0">
                          <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-200 truncate">{entry.title}</span>
                          <span class="text-[10px] text-zinc-500 truncate">{entry.url}</span>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>

          <div class="flex flex-col gap-4">
            <Show when={!file()!.isPlaylist} fallback={
              <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                <h3 class="text-sm font-bold text-zinc-900 dark:text-white">Batch Operation</h3>
                <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  This media contains multiple items. Downloading will construct a new batch group containing all valid child references.
                </p>
                <button
                  onClick={handlePlaylistDownload}
                  disabled={downloading() || !payload().entries?.length}
                  class="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50"
                >
                  <DownloadCloud class="w-5 h-5" />
                  Download Playlist Queue ({payload().entries?.length || 0})
                </button>
              </div>
            }>
              <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                <h3 class="text-sm font-bold text-zinc-900 dark:text-white">Extraction Configuration</h3>
                
                <div class="flex flex-col gap-2">
                  <label class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Format Stream</label>
                  <select
                    value={selectedFormat()}
                    onChange={(e) => setSelectedFormat(e.currentTarget.value)}
                    class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-xs text-zinc-900 dark:text-white appearance-none"
                  >
                    <For each={combinedFormats()}>
                      {(fmt) => <option value={fmt.id}>{fmt.label}</option>}
                    </For>
                  </select>
                </div>

                <Show when={availableSubtitles().length > 0}>
                  <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      Subtitle Overlays
                      <span class="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-[9px]">{availableSubtitles().length} available</span>
                    </label>
                    <div class="max-h-[150px] overflow-y-auto custom-scrollbar border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800">
                      <For each={availableSubtitles()}>
                        {(sub) => (
                          <label class="flex items-center gap-3 p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedSubtitles().includes(sub.lang)}
                              onChange={() => toggleSubtitle(sub.lang)}
                              class="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                            />
                            <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{sub.name} <span class="text-[10px] text-zinc-400 ml-1">({sub.lang})</span></span>
                          </label>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                <div class="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={handleDownload}
                    disabled={downloading()}
                    class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    <DownloadCloud class="w-5 h-5" />
                    Initialize Download
                  </button>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
