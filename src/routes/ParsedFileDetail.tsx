import { createSignal, createMemo, Show } from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import { useParseStore } from "../store/useParseStore";
import { useQueueStore } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";
import { logErrorToDb } from "../core/logger";

import {
  ArrowLeft,
  PlayCircle,
} from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";

// Modular feature components
import { HeroCard } from "../features/parser/components/HeroCard";
import { SingleVideoView } from "../features/parser/components/SingleVideoView";
import { PlaylistView } from "../features/parser/components/PlaylistView";
import { ConfigureTrackModal } from "../features/parser/components/ConfigureTrackModal";

export default function ParsedFileDetail() {
  const params = useParams();
  const navigate = useNavigate();

  const file = createMemo(() => useParseStore.state.parsedFiles.find((f) => f.slug === params.slug));
  const payload = createMemo(() => file()?.payload || {});

  const [selectedSubs, setSelectedSubs] = createSignal<string[]>([]);
  const [selectionMode, setSelectionMode] = createSignal<"custom" | "fallback">("custom");
  const [selectedVideo, setSelectedVideo] = createSignal<string>("");
  const [selectedAudio, setSelectedAudio] = createSignal<string>("");
  const [selectedPreset, setSelectedPreset] = createSignal<string>("bestvideo+bestaudio/best");
  const [selectedTracks, setSelectedTracks] = createSignal<string[]>([]);

  // Modal specific state
  const [parsingTracks, setParsingTracks] = createSignal<Record<string, boolean>>({});
  const [activeTrackPayload, setActiveTrackPayload] = createSignal<any>(null);
  const [activeTrackFile, setActiveTrackFile] = createSignal<any>(null);
  const [showModal, setShowModal] = createSignal(false);
  const [modalSelectedVideo, setModalSelectedVideo] = createSignal("");
  const [modalSelectedAudio, setModalSelectedAudio] = createSignal("");
  const [modalSelectedPreset, setModalSelectedPreset] = createSignal("bestvideo+bestaudio/best");
  const [modalSelectedSubs, setModalSelectedSubs] = createSignal<string[]>([]);
  const [modalSelectionMode, setModalSelectionMode] = createSignal<"custom" | "fallback">("custom");

  const formatDuration = (secs: number) => {
    if (!secs) return "0:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatSize = (bytes: number | null | undefined) => {
    if (!bytes) return "Unknown Size";
    const sizes = ["B", "KB", "MB", "GB"];
    let i = 0;
    let count = bytes;
    while (count >= 1024 && i < sizes.length - 1) {
      count /= 1024;
      i++;
    }
    return `${count.toFixed(1)} ${sizes[i]}`;
  };

  const dispatchDownloadJob = async (jobPayload: any) => {
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        const insertRes = await invoke<{ success: boolean; message: string }>("insert_job_record", { payload: jobPayload });
        if (!insertRes.success) throw new Error(insertRes.message);
        
        const startRes = await invoke<{ success: boolean; message: string }>("trigger_job_start", { jobSlug: jobPayload.slug });
        if (!startRes.success) throw new Error(startRes.message);
      } catch (e: any) {
        await logErrorToDb(e.message || String(e), "dispatch_download_job", jobPayload.slug);
      }
    } else {
      console.log(`[Browser Preview] Job ${jobPayload.slug} dispatched to backend mock.`);
    }
  };

  const startDownload = async (formatString: string, isAudio = false, _customName?: string, targetUrl?: string) => {
    const f = file();
    if (!f) return;

    const uniqueSlug = `dl-${Date.now()}`;
    const urlToUse = targetUrl || f.url;

    const fmt = formatString || "bestvideo+bestaudio/best";
    const safeFmt = fmt.replace(/\//g, "_");
    const baseTitle = _customName || f.title;
    
    await dispatchDownloadJob({
      slug: uniqueSlug,
      url: urlToUse,
      parsed_file_slug: f.slug,
      file_type: isAudio ? "audio" : "video",
      associated_media_job_slug: null,
      is_from_playlist: f.isPlaylist,
      format_string: fmt,
      download_path: useUIStore.state.downloadPath,
      created_at: new Date().toISOString(),
      custom_title: `[${safeFmt}]_${baseTitle}`,
    });

    if (selectedSubs().length > 0) {
      const subsToDispatch = selectedSubs().includes("all") ? ["all"] : selectedSubs();
      const promises = subsToDispatch.map((sub, index) => {
        const subSlug = `dl-sub-${Date.now()}-${sub}-${index}`;
        return dispatchDownloadJob({
          slug: subSlug,
          url: urlToUse,
          parsed_file_slug: f.slug,
          file_type: "subtitle",
          associated_media_job_slug: uniqueSlug,
          is_from_playlist: f.isPlaylist,
          format_string: "bestvideo+bestaudio/best",
          download_path: useUIStore.state.downloadPath,
          created_at: new Date().toISOString(),
          selected_subtitles: sub,
          custom_title: `[sub_${sub}]_${_customName || f.title}`,
        });
      });
      await Promise.all(promises);
    }

    navigate("/downloads");
  };

  const handleParseTrack = async (track: any) => {
    const f = file();
    if (!f) return;

    const existingFile = useParseStore.state.parsedFiles.find(
      (pf) => pf.parentPlaylistSlug === f.slug && pf.title === track.title
    );

    if (existingFile) {
      setActiveTrackPayload(existingFile.payload);
      setActiveTrackFile(existingFile);
      setModalSelectedVideo("");
      setModalSelectedAudio("");
      setModalSelectedSubs([]);
      setModalSelectedPreset("bestvideo+bestaudio/best");
      setModalSelectionMode("custom");
      setShowModal(true);
      return;
    }

    setParsingTracks((prev) => ({ ...prev, [track.id]: true }));

    try {
      let cleanUrl = track.url;
      try {
        const cleanRes = await invoke<{ success: boolean; sanitized_url: string }>(
          "process_clipboard_paste",
          { rawInput: track.url }
        );
        if (cleanRes.success) {
          cleanUrl = cleanRes.sanitized_url;
        }
      } catch (e) {
        console.warn("Track clipboard paste cleaning failed:", e);
      }

      let trackPayload: any = null;
      try {
        const discoverRes = await invoke<{
          success: boolean;
          payload: any;
          error_message: string | null;
        }>("discover_asset_metadata", { targetUrl: cleanUrl });

        if (discoverRes.success && discoverRes.payload) {
          trackPayload = discoverRes.payload;
        } else {
          throw new Error(discoverRes.error_message || "Metadata extraction probe rejected track URL.");
        }
      } catch (e: any) {
        console.warn("discover_asset_metadata track failed (browser fallback):", e);
        trackPayload = {
          id: track.id || `vid-${Date.now()}`,
          title: track.title || "Introduction to Tauri & React - Premium Development Guide",
          uploader: f.author || "Synclime Platform",
          duration: track.duration || 185,
          view_count: 12500,
          thumbnail: track.thumbnails?.[0]?.url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480&auto=format&fit=crop&q=60",
          formats: [
            { format_id: "bestvideo", ext: "mp4", format_note: "1085p 60fps", width: 1920, height: 1080, fps: 60, filesize: 95000000 },
            { format_id: "720p", ext: "mp4", format_note: "720p 30fps", width: 1280, height: 720, fps: 30, filesize: 45000000 },
            { format_id: "bestaudio", ext: "m4a", format_note: "HQ Audio", acodec: "aac", abr: 256, filesize: 6000000 },
          ],
          subtitles: {
            en: [{ ext: "vtt", url: "", name: "English" }],
            es: [{ ext: "vtt", url: "", name: "Spanish" }]
          },
          chapters: [],
          _type: "video"
        };
      }

      const parsedTrackFile = {
        slug: trackPayload.id || `file-${Date.now()}`,
        url: cleanUrl,
        title: trackPayload.title || track.title,
        sanitizedTitle: (trackPayload.title || track.title)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")
          .replace(/_+/g, "_")
          .trim(),
        isPlaylist: false,
        thumbnail: trackPayload.thumbnail || track.thumbnails?.[0]?.url || "",
        duration: trackPayload.duration || track.duration || 0,
        author: trackPayload.uploader || "External Publisher",
        views: trackPayload.view_count || 0,
        payload: trackPayload,
        parsedAt: new Date().toISOString(),
        parentPlaylistSlug: f.slug,
        siteConfigSlug: f.siteConfigSlug,
      };

      useParseStore.addParsedFile(parsedTrackFile);

      const isTauriEnvironment = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      if (isTauriEnvironment) {
        try {
          await invoke("insert_parsed_file", {
            payload: {
              slug: parsedTrackFile.slug,
              url: parsedTrackFile.url,
              title: parsedTrackFile.title,
              sanitized_title: parsedTrackFile.sanitizedTitle,
              is_playlist: 0,
              parent_playlist_slug: f.slug, // MOTHER LINK BRIDGE!
              playlist_name: f.title,
              sanitized_playlist_name: f.sanitizedTitle,
              json_metadata: JSON.stringify(trackPayload),
              created_at: parsedTrackFile.parsedAt,
              site_config_slug: f.siteConfigSlug,
            }
          });
        } catch (e: any) {
          await logErrorToDb(e.message || String(e), "insert_parsed_track", parsedTrackFile.slug);
        }
      }

      setActiveTrackPayload(trackPayload);
      setActiveTrackFile(parsedTrackFile);
      setModalSelectedVideo("");
      setModalSelectedAudio("");
      setModalSelectedSubs([]);
      setModalSelectedPreset("bestvideo+bestaudio/best");
      setModalSelectionMode("custom");
      setShowModal(true);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to parse track metadata.");
    } finally {
      setParsingTracks((prev) => ({ ...prev, [track.id]: false }));
    }
  };

  const startModalDownload = async () => {
    const activeFile = activeTrackFile();
    if (!activeFile) return;

    let formatString = "";
    if (modalSelectionMode() === "fallback") {
      formatString = modalSelectedPreset();
    } else {
      if (modalSelectedVideo() && modalSelectedAudio()) {
        formatString = `${modalSelectedVideo()}+${modalSelectedAudio()}`;
      } else if (modalSelectedVideo()) {
        formatString = modalSelectedVideo();
      } else if (modalSelectedAudio()) {
        formatString = modalSelectedAudio();
      } else {
        formatString = "bestvideo+bestaudio/best";
      }
    }

    const isAudio = formatString.includes("bestaudio") && !formatString.includes("bestvideo");
    const uniqueSlug = `dl-${Date.now()}`;
    const joinedSubs = modalSelectedSubs().includes("all") ? "all" : modalSelectedSubs().join(",");
    const safeFmt = formatString.replace(/\//g, "_");
 
    await dispatchDownloadJob({
      slug: uniqueSlug,
      url: activeFile.url,
      parsed_file_slug: activeFile.slug,
      file_type: isAudio ? "audio" : "video",
      associated_media_job_slug: null,
      is_from_playlist: activeFile.isPlaylist || false,
      format_string: formatString,
      download_path: useUIStore.state.downloadPath,
      created_at: new Date().toISOString(),
      custom_title: `[${safeFmt}]_${activeFile.title}`,
      selected_subtitles: joinedSubs || null,
    });

    if (modalSelectedSubs().length > 0) {
      const subsToDispatch = modalSelectedSubs().includes("all") ? ["all"] : modalSelectedSubs();
      const promises = subsToDispatch.map((sub, index) => {
        const subSlug = `dl-sub-${Date.now()}-${sub}-${index}`;
        return dispatchDownloadJob({
          slug: subSlug,
          url: activeFile.url,
          parsed_file_slug: activeFile.slug,
          file_type: "subtitle",
          associated_media_job_slug: uniqueSlug,
          is_from_playlist: activeFile.isPlaylist || false,
          format_string: "bestvideo+bestaudio/best",
          download_path: useUIStore.state.downloadPath,
          created_at: new Date().toISOString(),
          selected_subtitles: sub,
          custom_title: `[sub_${sub}]_${activeFile.title}`,
        });
      });
      await Promise.all(promises);
    }

    setShowModal(false);
    navigate("/downloads");
  };

  const downloadAllPlaylist = async () => {
    const f = file();
    if (!f) return;
    
    let targetTracks = payload().entries || [];
    if (selectedTracks().length > 0) {
      targetTracks = targetTracks.filter((t: any) => selectedTracks().includes(t.id));
    }
    if (targetTracks.length === 0) return;
    
    const playlistFormatString = selectedPreset() || "bestvideo+bestaudio/best";
    const safeFmt = playlistFormatString.replace(/\//g, "_");
 
    const promises = targetTracks.map(async (track: any, index: number) => {
      const trackSlug = `track-${track.id}-${Date.now()}-${index}`;
      
      await dispatchDownloadJob({
        slug: trackSlug,
        url: track.url,
        parsed_file_slug: f.slug,
        file_type: "video",
        associated_media_job_slug: null,
        is_from_playlist: f.isPlaylist,
        format_string: playlistFormatString,
        download_path: useUIStore.state.downloadPath,
        created_at: new Date().toISOString(),
        custom_title: `[${safeFmt}]_${track.title}`,
      });

      if (selectedSubs().length > 0) {
        const subsToDispatch = selectedSubs().includes("all") ? ["all"] : selectedSubs();
        const subPromises = subsToDispatch.map((sub, sIdx) => {
          const subSlug = `dl-sub-${Date.now()}-${sub}-${index}-${sIdx}`;
          return dispatchDownloadJob({
            slug: subSlug,
            url: track.url,
            parsed_file_slug: f.slug,
            file_type: "subtitle",
            associated_media_job_slug: trackSlug,
            is_from_playlist: f.isPlaylist,
            format_string: "bestvideo+bestaudio/best",
            download_path: useUIStore.state.downloadPath,
            created_at: new Date().toISOString(),
            selected_subtitles: sub,
            custom_title: `[sub_${sub}]_${track.title}`,
          });
        });
        await Promise.all(subPromises);
      }
    });

    await Promise.all(promises);

    navigate("/downloads");
  };

  const downloadSubtitle = async (targetUrl: string, _trackTitle: string) => {
    const f = file();
    if (!f) return;
    
    if (selectedSubs().length === 0) {
      alert("Please select at least one subtitle language from the checkbox list first!");
      return;
    }

    const queue = useQueueStore.state.queue;
    const parentJob = queue.find(j => j.url === targetUrl && j.fileType !== "subtitle");
    
    const subsToDispatch = selectedSubs().includes("all") ? ["all"] : selectedSubs();
    const promises = subsToDispatch.map((sub, index) => {
      const subSlug = `dl-sub-${Date.now()}-${sub}-${index}`;
      return dispatchDownloadJob({
        slug: subSlug,
        url: targetUrl,
        parsed_file_slug: f.slug,
        file_type: "subtitle",
        associated_media_job_slug: parentJob ? parentJob.slug : null,
        is_from_playlist: f.isPlaylist,
        format_string: "bestvideo+bestaudio/best",
        download_path: useUIStore.state.downloadPath,
        created_at: new Date().toISOString(),
        selected_subtitles: sub,
        custom_title: `[sub_${sub}]_${_trackTitle}`,
      });
    });
    
    await Promise.all(promises);
    navigate("/downloads");
  };

  const subOptions = createMemo(() => {
    const p = payload();
    return p.subtitles
      ? Object.keys(p.subtitles).map((lang) => ({
          lang,
          name: p.subtitles[lang][0]?.name || lang.toUpperCase(),
        }))
      : [];
  });

  const PREDEFINED_SUBS = [
    { lang: "all", name: "All Available Subtitles" },
    { lang: "en", name: "English" },
    { lang: "bn", name: "Bengali" },
    { lang: "es", name: "Spanish" },
    { lang: "hi", name: "Hindi" },
    { lang: "fr", name: "French" },
    { lang: "ar", name: "Arabic" },
    { lang: "ru", name: "Russian" },
    { lang: "pt", name: "Portuguese" },
    { lang: "de", name: "German" },
    { lang: "ja", name: "Japanese" },
  ];

  const displaySubOptions = createMemo(() => subOptions().length > 0 ? subOptions() : PREDEFINED_SUBS);

  const modalSubOptions = createMemo(() => {
    const active = activeTrackPayload();
    return active?.subtitles
      ? Object.keys(active.subtitles).map((lang) => ({
          lang,
          name: active.subtitles[lang][0]?.name || lang.toUpperCase(),
        }))
      : [];
  });

  const modalDisplaySubOptions = createMemo(() => modalSubOptions().length > 0 ? modalSubOptions() : PREDEFINED_SUBS);

  const presetList = [
    { label: "Best Quality (Unlimited / 4K+)", value: "bestvideo+bestaudio/best" },
    { label: "Best MP4 Format (Highly Compatible)", value: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" },
    { label: "Max 1440p (QHD)", value: "bestvideo[height<=1440]+bestaudio/best" },
    { label: "Max 1080p (FHD)", value: "bestvideo[height<=1080]+bestaudio/best" },
    { label: "Max 720p (HD)", value: "bestvideo[height<=720]+bestaudio/best" },
    { label: "Max 480p (SD - Data Saver)", value: "bestvideo[height<=480]+bestaudio/best" },
    { label: "Max 360p (Low - Feature Phone Saver)", value: "bestvideo[height<=360]+bestaudio/best" },
    { label: "Extract Audio Only (Highest)", value: "bestaudio/best" },
    { label: "Extract Audio Only (M4A Native)", value: "bestaudio[ext=m4a]/bestaudio/best" },
  ];

  const videoStreams = createMemo(() => {
    const formats = payload().formats || [];
    return formats.filter((f: any) => f.vcodec !== "none" && (f.format_note || f.resolution));
  });

  const audioStreams = createMemo(() => {
    const formats = payload().formats || [];
    return formats.filter((f: any) => f.acodec !== "none" && f.vcodec === "none");
  });

  const getGeneratedFormatString = () => {
    if (selectionMode() === "fallback") {
      return selectedPreset();
    }
    if (selectedVideo() && selectedAudio()) {
      return `${selectedVideo()}+${selectedAudio()}`;
    } else if (selectedVideo()) {
      return selectedVideo();
    } else if (selectedAudio()) {
      return selectedAudio();
    }
    return "bestvideo+bestaudio/best";
  };

  const toggleSub = (lang: string) => {
    setSelectedSubs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);
  };

  const toggleModalSub = (lang: string) => {
    setModalSelectedSubs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);
  };

  return (
    <Show
      when={file()}
      fallback={
        <div class="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6 w-full max-w-md mx-auto px-4 font-sans select-none">
          <div class="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl">
            <PlayCircle class="w-8 h-8" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="text-lg font-bold text-zinc-900 dark:text-white">Metadata Not Found</h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              The requested parsed asset cache profile is either invalid or was recently cleared.
            </p>
          </div>
          <A
            href="/parsed_files"
            class="inline-flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 px-5 py-2 rounded-xl transition-all duration-300 text-sm"
          >
            Return to Repository
          </A>
        </div>
      }
    >
      <div class="flex flex-col gap-4 sm:gap-6 w-full max-w-4xl mx-auto px-1 sm:px-4 py-1 sm:py-2 text-zinc-950 dark:text-white transition-colors duration-300 font-sans select-none">
        
        {/* Back Header Nav */}
        <div class="flex justify-between items-center w-full">
          <A
            href="/parsed_files"
            class="flex items-center justify-center sm:justify-start gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold border border-zinc-200 dark:border-zinc-700 w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded text-[10px] uppercase tracking-wider transition-all duration-150 overflow-hidden"
          >
            <ArrowLeft class="w-3.5 h-3.5 flex-shrink-0" />
            <span class="truncate">Back to Repository</span>
          </A>
        </div>

        {/* Asset Hero Section Card */}
        <HeroCard
          thumbnail={file()!.thumbnail}
          title={file()!.title}
          author={file()!.author}
          isPlaylist={file()!.isPlaylist}
          duration={file()!.duration}
          description={payload().description}
          formatDuration={formatDuration}
        />

        <Show
          when={file()!.isPlaylist}
          fallback={
            <SingleVideoView
              url={file()!.url}
              title={file()!.title}
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
              selectedVideo={selectedVideo}
              setSelectedVideo={setSelectedVideo}
              selectedAudio={selectedAudio}
              setSelectedAudio={setSelectedAudio}
              selectedPreset={selectedPreset}
              setSelectedPreset={setSelectedPreset}
              videoStreams={videoStreams()}
              audioStreams={audioStreams()}
              presetList={presetList}
              getGeneratedFormatString={getGeneratedFormatString}
              startDownload={startDownload}
              displaySubOptions={displaySubOptions()}
              selectedSubs={selectedSubs}
              toggleSub={toggleSub}
              downloadSubtitle={downloadSubtitle}
              formatSize={formatSize}
              subOptions={subOptions()}
            />
          }
        >
          <PlaylistView
            payload={payload}
            selectedPreset={selectedPreset}
            setSelectedPreset={setSelectedPreset}
            presetList={presetList}
            downloadAllPlaylist={downloadAllPlaylist}
            selectedTracks={selectedTracks}
            setSelectedTracks={setSelectedTracks}
            subOptions={subOptions()}
            displaySubOptions={displaySubOptions()}
            selectedSubs={selectedSubs}
            toggleSub={toggleSub}
            parsingTracks={parsingTracks}
            handleParseTrack={handleParseTrack}
            downloadSubtitle={downloadSubtitle}
            startDownload={startDownload}
            formatDuration={formatDuration}
          />
        </Show>

        <ConfigureTrackModal
          showModal={showModal}
          setShowModal={setShowModal}
          activeTrackPayload={activeTrackPayload}
          activeTrackFile={activeTrackFile}
          modalSelectionMode={modalSelectionMode}
          setModalSelectionMode={setModalSelectionMode}
          modalSelectedVideo={modalSelectedVideo}
          setModalSelectedVideo={setModalSelectedVideo}
          modalSelectedAudio={modalSelectedAudio}
          setModalSelectedAudio={setModalSelectedAudio}
          modalSelectedPreset={modalSelectedPreset}
          setModalSelectedPreset={setModalSelectedPreset}
          modalSelectedSubs={modalSelectedSubs}
          toggleModalSub={toggleModalSub}
          modalDisplaySubOptions={modalDisplaySubOptions()}
          presetList={presetList}
          formatSize={formatSize}
          startModalDownload={startModalDownload}
        />
      </div>
    </Show>
  );
}
