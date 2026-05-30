import { useParams, Link, useNavigate } from "react-router-dom";
import { useParseStore } from "../store/useParseStore";
import { useQueueStore } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";
import * as Tooltip from "@radix-ui/react-tooltip";
import { logErrorToDb } from "../core/logger";

import {
  ArrowLeft,
  Download,
  Film,
  Music,
  Globe,
  List,
  Clock,
  PlayCircle,
  CheckCircle2,
  Sliders,
  ToggleLeft,
  CheckSquare,
  Square,
  X,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function ParsedFileDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { parsedFiles, addParsedFile } = useParseStore();

  const file = parsedFiles.find((f) => f.slug === slug);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);

  // Layer Switch State: "custom" (Layer 1) vs "fallback" (Layer 2)
  const [selectionMode, setSelectionMode] = useState<"custom" | "fallback">("custom");

  // Custom Selection State (Layer 1)
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [selectedAudio, setSelectedAudio] = useState<string>("");

  // Preset Selection State (Layer 2)
  const [selectedPreset, setSelectedPreset] = useState<string>("bestvideo+bestaudio/best");

  // Playlist Bulk Selection State
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);

  // ==========================================
  // NEW STATES FOR RECURSIVE TRACK PARSING & MODAL
  // ==========================================
  const [parsingTracks, setParsingTracks] = useState<Record<string, boolean>>({});
  const [activeTrackPayload, setActiveTrackPayload] = useState<any>(null);
  const [activeTrackFile, setActiveTrackFile] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const [modalSelectedVideo, setModalSelectedVideo] = useState("");
  const [modalSelectedAudio, setModalSelectedAudio] = useState("");
  const [modalSelectedPreset, setModalSelectedPreset] = useState("bestvideo+bestaudio/best");
  const [modalSelectedSubs, setModalSelectedSubs] = useState<string[]>([]);
  const [modalSelectionMode, setModalSelectionMode] = useState<"custom" | "fallback">("custom");

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6 w-full max-w-md mx-auto px-4 font-sans select-none">
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl">
          <PlayCircle className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Metadata Not Found</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            The requested parsed asset cache profile is either invalid or was recently cleared.
          </p>
        </div>
        <Link
          to="/parsed_files"
          className="inline-flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 px-5 py-2 rounded-xl transition-all duration-300 text-sm"
        >
          Return to Repository
        </Link>
      </div>
    );
  }

  const payload = file.payload;

  // Formatter helpers
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

  // Unified Backend Dispatcher
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
      // Browser fallback - simulate backend
      console.log(`[Browser Preview] Job ${jobPayload.slug} dispatched to backend mock.`);
    }
  };

  // Triggers the download queue addition
  const startDownload = async (formatString: string, isAudio = false, _customName?: string) => {
    const uniqueSlug = `dl-${Date.now()}`;
    
    await dispatchDownloadJob({
      slug: uniqueSlug,
      url: file.url,
      parsed_file_slug: file.slug,
      file_type: isAudio ? "audio" : "video",
      associated_media_job_slug: null,
      is_from_playlist: file.isPlaylist,
      format_string: formatString || "bestvideo+bestaudio/best",
      download_path: useUIStore.getState().downloadPath,
      created_at: new Date().toISOString(),
      custom_title: _customName || file.title,
    });

    if (selectedSubs.length > 0) {
      const subSlug = `dl-sub-${Date.now()}`;
      const joinedSubs = selectedSubs.includes("all") ? "all" : selectedSubs.join(",");
      await dispatchDownloadJob({
        slug: subSlug,
        url: file.url,
        parsed_file_slug: file.slug,
        file_type: "subtitle",
        associated_media_job_slug: uniqueSlug, // PARENT IS THE VIDEO!
        is_from_playlist: file.isPlaylist,
        format_string: "bestvideo+bestaudio/best",
        download_path: useUIStore.getState().downloadPath,
        created_at: new Date().toISOString(),
        selected_subtitles: joinedSubs,
        custom_title: `[sub_${joinedSubs}]_${_customName || file.title}`,
      });
    }

    navigate("/downloads");
  };

  // ==========================================
  // HANDLERS FOR INDIVIDUAL PLAYLIST TRACK PARSING
  // ==========================================
  const handleParseTrack = async (track: any) => {
    // 1. Pre-parsing Cache Scanner: Check if this track is already parsed in Zustand
    const existingFile = parsedFiles.find(
      (f) => f.parentPlaylistSlug === file.slug && f.title === track.title
    );

    if (existingFile) {
      // Instantly show the modal!
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
      // Clean telemetry tracker parameters via Tauri API
      try {
        const cleanRes = await invoke<{ success: boolean; sanitized_url: string }>(
          "process_clipboard_paste",
          { rawInput: track.url }
        );
        if (cleanRes.success) {
          cleanUrl = cleanRes.sanitized_url;
        }
      } catch (e) {
        console.warn("Track clipboard paste cleaning failed (browser fallback):", e);
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
        console.warn("discover_asset_metadata track failed (browser fallback simulation):", e);
        
        // Premium high-fidelity mock data for single track formats & subtitles
        trackPayload = {
          id: track.id || `vid-${Date.now()}`,
          title: track.title || "Introduction to Tauri & React - Premium Development Guide",
          uploader: file.author || "Synclime Platform",
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

      // Structurize parsed track as its own ParsedFile record (self-referential structure!)
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
        parentPlaylistSlug: file.slug,
        siteConfigSlug: file.siteConfigSlug,
      };

      // Add to local Zustand store
      addParsedFile(parsedTrackFile);

      // Save to SQLite backend database, mapping to parent playlist (self-referencing mother slug!)
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
              parent_playlist_slug: file.slug, // MOTHER LINK BRIDGE!
              playlist_name: file.title,
              sanitized_playlist_name: file.sanitizedTitle,
              json_metadata: JSON.stringify(trackPayload),
              created_at: parsedTrackFile.parsedAt,
              site_config_slug: file.siteConfigSlug,
            }
          });
        } catch (e: any) {
          await logErrorToDb(e.message || String(e), "insert_parsed_track", parsedTrackFile.slug);
        }
      }

      // Open custom Radix-styled modal with track formats & subtitles
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

  // Submits custom queued download from inside the Modal
  const startModalDownload = async () => {
    if (!activeTrackFile) return;

    let formatString = "";
    if (modalSelectionMode === "fallback") {
      formatString = modalSelectedPreset;
    } else {
      if (modalSelectedVideo && modalSelectedAudio) {
        formatString = `${modalSelectedVideo}+${modalSelectedAudio}`;
      } else if (modalSelectedVideo) {
        formatString = modalSelectedVideo;
      } else if (modalSelectedAudio) {
        formatString = modalSelectedAudio;
      } else {
        formatString = "bestvideo+bestaudio/best";
      }
    }

    const isAudio = formatString.includes("bestaudio") && !formatString.includes("bestvideo");
    const uniqueSlug = `dl-${Date.now()}`;
    const joinedSubs = modalSelectedSubs.includes("all") ? "all" : modalSelectedSubs.join(",");

    await dispatchDownloadJob({
      slug: uniqueSlug,
      url: activeTrackFile.url,
      parsed_file_slug: activeTrackFile.slug,
      file_type: isAudio ? "audio" : "video",
      associated_media_job_slug: null,
      is_from_playlist: activeTrackFile.isPlaylist || false,
      format_string: formatString,
      download_path: useUIStore.getState().downloadPath,
      created_at: new Date().toISOString(),
      custom_title: activeTrackFile.title,
      selected_subtitles: joinedSubs || null,
    });

    if (modalSelectedSubs.length > 0) {
      const subSlug = `dl-sub-${Date.now()}`;
      await dispatchDownloadJob({
        slug: subSlug,
        url: activeTrackFile.url,
        parsed_file_slug: activeTrackFile.slug,
        file_type: "subtitle",
        associated_media_job_slug: uniqueSlug, // PARENT IS THE VIDEO!
        is_from_playlist: activeTrackFile.isPlaylist || false,
        format_string: "bestvideo+bestaudio/best",
        download_path: useUIStore.getState().downloadPath,
        created_at: new Date().toISOString(),
        selected_subtitles: joinedSubs,
        custom_title: `[sub_${joinedSubs}]_${activeTrackFile.title}`,
      });
    }

    setShowModal(false);
    navigate("/downloads");
  };

  // Bulk downloads all playlist tracks using the selected fallback rule
  const downloadAllPlaylist = async () => {
    let targetTracks = payload.entries || [];
    if (selectedTracks.length > 0) {
      targetTracks = targetTracks.filter((t: any) => selectedTracks.includes(t.id));
    }
    if (targetTracks.length === 0) return;
    
    const playlistFormatString = selectedPreset;

    for (const track of targetTracks) {
      const trackSlug = `track-${track.id}-${Date.now()}`;
      
      await dispatchDownloadJob({
        slug: trackSlug,
        url: track.url,
        parsed_file_slug: file.slug,
        file_type: "video",
        associated_media_job_slug: null,
        is_from_playlist: file.isPlaylist,
        format_string: playlistFormatString || "bestvideo+bestaudio/best",
        download_path: useUIStore.getState().downloadPath,
        created_at: new Date().toISOString(),
        custom_title: track.title,
      });
    }

    navigate("/downloads");
  };

  const downloadSubtitle = async (targetUrl: string, _trackTitle: string) => {
    if (selectedSubs.length === 0) {
      alert("Please select at least one subtitle language from the checkbox list first!");
      return;
    }

    // 1. Auto-Pairing Scanner: Find if the video is already in the queue
    const queue = useQueueStore.getState().queue;
    const parentJob = queue.find(j => j.url === targetUrl && j.fileType !== "subtitle");
    
    const uniqueSlug = `dl-sub-${Date.now()}`;
    const joinedSubs = selectedSubs.includes("all") ? "all" : selectedSubs.join(",");
    
    await dispatchDownloadJob({
      slug: uniqueSlug,
      url: targetUrl,
      parsed_file_slug: file.slug,
      file_type: "subtitle",
      associated_media_job_slug: parentJob ? parentJob.slug : null,
      is_from_playlist: file.isPlaylist,
      format_string: "bestvideo+bestaudio/best",
      download_path: useUIStore.getState().downloadPath,
      created_at: new Date().toISOString(),
      selected_subtitles: joinedSubs,
      custom_title: `[sub_${joinedSubs}]_${_trackTitle}`,
    });
    
    navigate("/downloads");
  };

  const subOptions = payload.subtitles
    ? Object.keys(payload.subtitles).map((lang) => ({
        lang,
        name: payload.subtitles[lang][0]?.name || lang.toUpperCase(),
      }))
    : [];

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

  const displaySubOptions = subOptions.length > 0 ? subOptions : PREDEFINED_SUBS;

  const modalSubOptions = activeTrackPayload?.subtitles
    ? Object.keys(activeTrackPayload.subtitles).map((lang) => ({
        lang,
        name: activeTrackPayload.subtitles[lang][0]?.name || lang.toUpperCase(),
      }))
    : [];

  const modalDisplaySubOptions = modalSubOptions.length > 0 ? modalSubOptions : PREDEFINED_SUBS;

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

  // Filtering clean streams for Layer 1 Selection Grid
  const formats = payload.formats || [];
  const videoStreams = formats.filter(
    (f: any) => f.vcodec !== "none" && (f.format_note || f.resolution)
  );
  const audioStreams = formats.filter(
    (f: any) => f.acodec !== "none" && f.vcodec === "none"
  );

  const getGeneratedFormatString = () => {
    if (selectionMode === "fallback") {
      return selectedPreset;
    }
    if (selectedVideo && selectedAudio) {
      return `${selectedVideo}+${selectedAudio}`;
    } else if (selectedVideo) {
      return selectedVideo;
    } else if (selectedAudio) {
      return selectedAudio;
    }
    return "bestvideo+bestaudio/best";
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-4xl mx-auto px-1 sm:px-4 py-1 sm:py-2 text-zinc-955 dark:text-white transition-colors duration-300 font-sans select-none">
        
        {/* Back Header Nav */}
        <div className="flex justify-between items-center w-full">
          <Link
            to="/parsed_files"
            className="flex items-center justify-center sm:justify-start gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 w-full sm:w-auto px-3 py-3 sm:py-1.5 rounded-lg transition-all duration-300 text-[12px] sm:text-sm overflow-hidden"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Back to Repository</span>
          </Link>
        </div>

        {/* Asset Hero Section Card */}
        <div className="w-full bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-xl sm:rounded-3xl shadow-lg p-2 sm:p-5">
          <div className="flex flex-row gap-2 sm:gap-6 items-start text-left">
            {file.thumbnail && (
              <img
                src={file.thumbnail}
                alt={file.title}
                className="w-24 sm:w-48 md:w-80 aspect-video object-cover rounded-lg sm:rounded-2xl border border-zinc-200 dark:border-white/5 shadow-md flex-shrink-0"
              />
            )}

            <div className="flex flex-col justify-start sm:justify-between h-full py-0 sm:py-1 min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:gap-2">
                <h2 className="text-xs sm:text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-white leading-tight line-clamp-2">
                  {file.title}
                </h2>
                
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium w-full">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-white/5 truncate max-w-full">
                    {file.author}
                  </span>
                  <span>•</span>
                  {file.isPlaylist ? (
                    <span className="text-purple-500 font-semibold">Playlist</span>
                  ) : (
                    <span className="text-blue-500 font-semibold">Single Video</span>
                  )}
                  {!file.isPlaylist && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(file.duration)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {payload.description && (
                <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400 mt-4 leading-relaxed line-clamp-3 select-text">
                  {payload.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Conditional Detailed Lists */}
        {file.isPlaylist ? (
          // ==========================================
          // 1. PLAYLIST LAYOUT VIEW WITH LAYER 2 ADAPTIVE RULES
          // ==========================================
          <div className="flex flex-col gap-4 sm:gap-6 text-left">
            {/* Playlist Controls & Fallback Selector */}
            <div className="w-full bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-lg p-3 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-5">
                <div className="flex flex-col gap-2 max-w-md">
                  <div className="flex items-center gap-2 text-purple-500">
                    <Sliders className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                      Playlist Fallback Preferences
                    </h3>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Select a fallback preset below. This adaptive quality rule will be mapped sequentially as the format target to all tracks inside this batch queue download.
                  </p>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 sm:gap-3.5 min-w-0 w-full md:w-auto">
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl min-h-[40px] px-3 outline-none text-xs sm:text-sm font-semibold w-full max-w-full overflow-hidden text-ellipsis"
                  >
                    {presetList.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={downloadAllPlaylist}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 sm:px-6 py-2 rounded-lg shadow-sm transition-all duration-300 overflow-hidden min-h-[40px]"
                  >
                    <Download className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-[12px] sm:text-sm">
                      {selectedTracks.length > 0 ? `Download Selected (${selectedTracks.length})` : "Download All Tracks"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Subtitle Selector for Playlist Mode */}
            <div className="w-full bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-lg p-3 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {subOptions.length > 0 ? "Global Subtitle Selection" : "Global Subtitle Selection (Pre-Given List)"}
                </h3>
              </div>
              {displaySubOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto py-1">
                  {displaySubOptions.map((opt) => (
                    <label key={opt.lang} className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer transition-colors shadow-sm ${selectedSubs.includes(opt.lang) ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-300 hover:border-purple-500"}`}>
                      <input
                        type="checkbox"
                        checked={selectedSubs.includes(opt.lang)}
                        onChange={() => setSelectedSubs(prev => prev.includes(opt.lang) ? prev.filter(l => l !== opt.lang) : [...prev, opt.lang])}
                        className="accent-purple-500 w-4 h-4 cursor-pointer"
                      />
                      {opt.name} {opt.lang !== "all" && `(${opt.lang.toUpperCase()})`}
                    </label>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-zinc-500 italic">No subtitles available</span>
              )}
            </div>

            {/* Playlist Tracks Listing */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4 text-purple-500" />
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                    Playlist Tracks ({payload.entries?.length || 0})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    if (selectedTracks.length === (payload.entries?.length || 0)) {
                      setSelectedTracks([]);
                    } else {
                      setSelectedTracks(payload.entries?.map((t: any) => t.id) || []);
                    }
                  }}
                  className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-bold hover:underline select-none"
                >
                  {selectedTracks.length === (payload.entries?.length || 0) ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 w-full">
                {payload.entries?.map((track: any, index: number) => (
                  <div
                    key={track.id}
                    className="border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 rounded-lg"
                  >
                    <div className="p-1.5 sm:p-3 flex flex-row items-center justify-between gap-1.5 sm:gap-4">
                      
                      <button
                        onClick={() => setSelectedTracks(prev => prev.includes(track.id) ? prev.filter(id => id !== track.id) : [...prev, track.id])}
                        className="p-1 text-zinc-400 hover:text-purple-500 transition-colors flex-shrink-0"
                      >
                        {selectedTracks.includes(track.id) ? (
                          <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                        ) : (
                          <Square className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </button>

                      <div className="flex items-center gap-1.5 sm:gap-3 flex-grow text-left min-w-0">
                        <span className="text-[9px] sm:text-xs font-bold text-zinc-400 font-mono w-4 sm:w-5">
                          {(index + 1).toString().padStart(2, "0")}
                        </span>
                        {track.thumbnails?.[0]?.url && (
                          <img
                            src={track.thumbnails[0].url}
                            alt={track.title}
                            className="w-10 sm:w-14 aspect-video object-cover rounded-md sm:rounded-lg border border-zinc-200 dark:border-white/5 flex-shrink-0"
                          />
                        )}
                        <div className="flex flex-col gap-0 min-w-0">
                          <span className="text-[10px] sm:text-xs font-bold text-zinc-900 dark:text-white line-clamp-1 leading-tight">
                            {track.title}
                          </span>
                          <span className="text-[8px] sm:text-[10px] text-zinc-500 dark:text-zinc-400">
                            {formatDuration(track.duration)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Interactive Parse Button - Triggers deep yt-dlp discovery of track! */}
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <button
                              onClick={() => handleParseTrack(track)}
                              disabled={parsingTracks[track.id]}
                              className="p-1.5 sm:p-2 bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 min-h-[32px] flex items-center justify-center"
                            >
                              {parsingTracks[track.id] ? (
                                <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              )}
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              sideOffset={5}
                              className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] font-sans"
                            >
                              Configure custom track streams
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>

                        {displaySubOptions.length > 0 && (
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <button
                                onClick={() => downloadSubtitle(track.url, track.title)}
                                className="p-1.5 sm:p-2 bg-purple-500/10 hover:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-lg sm:rounded-xl transition-colors min-h-[32px]"
                              >
                                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                sideOffset={5}
                                className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] font-sans"
                              >
                                Download track captions
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        )}
                        
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <button
                              onClick={() => startDownload(selectedPreset, false, track.title)}
                              className="p-1.5 sm:p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 rounded-lg sm:rounded-xl transition-colors min-h-[32px]"
                            >
                              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              sideOffset={5}
                              className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] font-sans"
                            >
                              Queue standard track download
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // ==========================================
          // 2. VIDEO DETAIL LAYOUT WITH LAYER 1 & 2 SELECTORS
          // ==========================================
          <div className="flex flex-col-reverse md:grid md:grid-cols-3 gap-4 sm:gap-6 text-left min-w-0">
            {/* Main Selectors (Layers 1 & 2) */}
            <div className="md:col-span-2 flex flex-col gap-4 sm:gap-6 min-w-0">
              {/* Explicit Switcher Interface Tab bar */}
              <div className="flex flex-col sm:flex-row bg-zinc-100/80 dark:bg-white/5 border border-zinc-200 dark:border-white/5 p-1 rounded-2xl w-full sm:self-start shadow-inner gap-1 sm:gap-0">
                <button
                  type="button"
                  onClick={() => setSelectionMode("custom")}
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 sm:py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-wider transition-all select-none ${
                    selectionMode === "custom"
                      ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-white/5"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Custom Formats (Layer 1)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode("fallback")}
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 sm:py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-wider transition-all select-none ${
                    selectionMode === "fallback"
                      ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-white/5"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  <ToggleLeft className="w-3.5 h-3.5" />
                  Adaptive Presets (Layer 2)
                </button>
              </div>

              {selectionMode === "custom" ? (
                // ------------------------------------------
                // LAYER 1: USER SELECTED SPECIFIC STREAM FORMATS
                // ------------------------------------------
                <div className="flex flex-col gap-6 min-w-0">
                  {/* Video Streams selection */}
                  <div className="flex flex-col gap-3 min-w-0">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Film className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Select Video Stream
                      </span>
                    </div>

                    <div className="hidden sm:grid sm:grid-cols-2 gap-3 min-w-0">
                      {videoStreams.map((v: any) => {
                        const isSelected = selectedVideo === v.format_id;
                        return (
                          <div
                            key={v.format_id}
                            className={`border cursor-pointer select-none transition-colors rounded-lg p-3 flex flex-row items-center justify-between gap-2 text-left min-w-0 ${
                              isSelected
                                ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/10"
                                : "border-zinc-200 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                            }`}
                            onClick={() => setSelectedVideo(isSelected ? "" : v.format_id)}
                          >
                            <div className="flex flex-col gap-0.5 min-w-0 text-left">
                              <span className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight block truncate">
                                {v.format_note || `${v.height}p`} ({v.ext})
                              </span>
                              <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
                                {v.resolution || `${v.width}x${v.height}`} • {formatSize(v.filesize || v.filesize_approx)}
                              </span>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                          </div>
                        );
                      })}

                      {videoStreams.length === 0 && (
                        <span className="text-xs italic text-zinc-500 dark:text-zinc-400">
                          No separate video-only streams discovered.
                        </span>
                      )}
                    </div>
                    
                    {/* Native Mobile Dropdown for mobile screens */}
                    <div className="block sm:hidden w-full">
                      <select
                        value={selectedVideo}
                        onChange={(e) => setSelectedVideo(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-lg px-2 py-2 outline-none text-[10px] font-semibold max-w-full text-ellipsis overflow-hidden"
                      >
                        <option value="">(None) Deselect Video Stream</option>
                        {videoStreams.map((v: any) => (
                          <option key={v.format_id} value={v.format_id}>
                            {v.format_note || `${v.height}p`} ({v.ext}) - {formatSize(v.filesize || v.filesize_approx)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Audio Streams selection */}
                  <div className="flex flex-col gap-3 min-w-0">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Music className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Select Audio Stream
                      </span>
                    </div>

                    <div className="hidden sm:grid sm:grid-cols-2 gap-3 min-w-0">
                      {audioStreams.map((a: any) => {
                        const isSelected = selectedAudio === a.format_id;
                        return (
                          <div
                            key={a.format_id}
                            className={`border cursor-pointer select-none transition-colors rounded-lg p-3 flex flex-row items-center justify-between gap-2 text-left min-w-0 ${
                              isSelected
                                ? "border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                                : "border-zinc-200 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                            }`}
                            onClick={() => setSelectedAudio(isSelected ? "" : a.format_id)}
                          >
                            <div className="flex flex-col gap-0.5 min-w-0 text-left">
                              <span className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight block truncate">
                                {a.format_note || "Audio Only"} ({a.ext})
                              </span>
                              <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
                                {a.abr ? `${a.abr.toFixed(0)}kbps` : "HQ"} • {formatSize(a.filesize || a.filesize_approx)}
                              </span>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                          </div>
                        );
                      })}

                      {audioStreams.length === 0 && (
                        <span className="text-xs italic text-zinc-500 dark:text-zinc-400">
                          No separate audio-only streams discovered.
                        </span>
                      )}
                    </div>

                    {/* Native Mobile Dropdown for Audio */}
                    <div className="block sm:hidden w-full">
                      <select
                        value={selectedAudio}
                        onChange={(e) => setSelectedAudio(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-lg px-2 py-2 outline-none text-[10px] font-semibold max-w-full text-ellipsis overflow-hidden"
                      >
                        <option value="">(None) Deselect Audio Stream</option>
                        {audioStreams.map((a: any) => (
                          <option key={a.format_id} value={a.format_id}>
                            {a.format_note || "Audio Only"} ({a.ext}) - {formatSize(a.filesize || a.filesize_approx)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                // ------------------------------------------
                // LAYER 2: FALLBACK PREFERENCE TOGGLE SELECTOR
                // ------------------------------------------
                <div className="flex flex-col gap-4 min-w-0">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Sliders className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Select Fallback Preference Preset
                    </span>
                  </div>

                  <div className="hidden sm:grid sm:grid-cols-1 gap-3 min-w-0">
                    {presetList.map((preset) => {
                      const isSelected = selectedPreset === preset.value;
                      return (
                        <div
                          key={preset.value}
                          className={`border cursor-pointer select-none transition-colors rounded-lg p-3 flex flex-row items-center justify-between gap-2 text-left min-w-0 ${
                            isSelected
                              ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/10"
                              : "border-zinc-200 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                          }`}
                          onClick={() => setSelectedPreset(preset.value)}
                        >
                          <div className="flex flex-col gap-1 min-w-0 text-left">
                            <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white leading-tight block">
                              {preset.label}
                            </span>
                            <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
                              {preset.value}
                            </span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="block sm:hidden w-full">
                    <select
                      value={selectedPreset}
                      onChange={(e) => setSelectedPreset(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-lg px-2 py-2 outline-none text-[10px] font-semibold max-w-full text-ellipsis overflow-hidden"
                    >
                      {presetList.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Action & Sidebar Details Panel */}
            <div className="flex flex-col gap-6 min-w-0">
              {/* Generate & Download Panel */}
              <div className="flex flex-col gap-4 min-w-0">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                    Download Manager
                  </h3>
                </div>

                <div className="border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 rounded-lg p-3 sm:p-4 min-w-0">
                  <div className="flex flex-col gap-3 sm:gap-5 min-w-0">
                    {/* Generated Monospace Format String Preview */}
                    <div className="flex flex-col gap-2 text-left min-w-0">
                      <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Generated Format String
                      </label>
                      <div className="bg-zinc-900 text-zinc-200 dark:bg-black border border-zinc-800 p-3 rounded-2xl font-mono text-[10px] break-all select-text shadow-inner">
                        {getGeneratedFormatString()}
                      </div>
                    </div>

                    {/* Primary Download trigger */}
                    <button
                      onClick={() => startDownload(getGeneratedFormatString(), getGeneratedFormatString().includes("bestaudio") && !getGeneratedFormatString().includes("bestvideo"))}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium w-full py-2.5 rounded-lg shadow-sm transition-all duration-300 overflow-hidden px-2 min-h-[38px]"
                    >
                      <Download className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate text-xs sm:text-sm font-bold">Download Media</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Subtitles Panel */}
              <div className="flex flex-col gap-4 min-w-0">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                    Language Subtitles
                  </h3>
                </div>

                <div className="border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 rounded-lg p-3 min-w-0">
                  <div className="flex flex-col gap-4 min-w-0">
                    {displaySubOptions.length > 0 ? (
                      <>
                        <div className="flex flex-col gap-2 text-left min-w-0">
                          <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Select Languages {subOptions.length === 0 && "(Pre-Given List)"}
                          </label>
                          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl min-w-0">
                            {displaySubOptions.map((opt) => (
                              <label key={opt.lang} className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors shadow-sm ${selectedSubs.includes(opt.lang) ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400 font-extrabold" : "bg-white dark:bg-zinc-850 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-300 hover:border-purple-500"}`}>
                                <input
                                  type="checkbox"
                                  checked={selectedSubs.includes(opt.lang)}
                                  onChange={() => setSelectedSubs(prev => prev.includes(opt.lang) ? prev.filter(l => l !== opt.lang) : [...prev, opt.lang])}
                                  className="accent-purple-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                {opt.name} {opt.lang !== "all" && `(${opt.lang.toUpperCase()})`}
                              </label>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => downloadSubtitle(file.url, file.title)}
                          disabled={selectedSubs.length === 0}
                          className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium border border-zinc-200 dark:border-zinc-700 w-full py-2.5 rounded-lg transition-all duration-300 disabled:opacity-50 min-h-[38px] px-2 text-xs font-bold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Subtitle
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-6 flex flex-col items-center gap-2">
                        <Globe className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                          No subtitles found in this file extraction.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            DYNAMIC NATIVE RADIX FORMAT MODAL
           ========================================== */}
        {showModal && activeTrackPayload && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 select-none animate-fade-in font-sans">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl max-h-[85vh] shadow-2xl p-5 sm:p-6 relative flex flex-col font-sans text-left overflow-hidden">
              
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-4 pr-8">
                {/* Tactile Native Icon Bubble */}
                <div className="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-lg flex-shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white leading-tight">Configure Custom Track</h3>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5" title={activeTrackFile?.title}>
                    {activeTrackFile?.title}
                  </p>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex bg-zinc-100 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 p-0.5 rounded-xl w-full shadow-inner mb-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModalSelectionMode("custom")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] sm:text-xs font-bold tracking-wider transition-all ${
                    modalSelectionMode === "custom"
                      ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  Custom Formats
                </button>
                <button
                  type="button"
                  onClick={() => setModalSelectionMode("fallback")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] sm:text-xs font-bold tracking-wider transition-all ${
                    modalSelectionMode === "fallback"
                      ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  <ToggleLeft className="w-3.5 h-3.5" />
                  Adaptive Presets
                </button>
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar pb-2">
                {modalSelectionMode === "custom" ? (
                  <div className="space-y-4">
                    {/* Video Streams */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Film className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Video Format</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-850 rounded-xl custom-scrollbar">
                        {activeTrackPayload.formats?.filter((f: any) => f.vcodec !== "none" && (f.format_note || f.resolution)).map((v: any) => {
                          const isSelected = modalSelectedVideo === v.format_id;
                          return (
                            <div
                              key={v.format_id}
                              onClick={() => setModalSelectedVideo(isSelected ? "" : v.format_id)}
                              className={`border cursor-pointer select-none p-2.5 rounded-lg flex items-center justify-between gap-2 text-left min-w-0 transition-colors ${
                                isSelected
                                  ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-500/10"
                                  : "border-zinc-200/60 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight block truncate">
                                  {v.format_note || `${v.height}p`} ({v.ext})
                                </span>
                                <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-mono block mt-0.5">
                                  {v.resolution || `${v.width}x${v.height}`} • {formatSize(v.filesize || v.filesize_approx)}
                                </span>
                              </div>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Audio Streams */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Music className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Audio Format</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-850 rounded-xl custom-scrollbar">
                        {activeTrackPayload.formats?.filter((f: any) => f.acodec !== "none" && f.vcodec === "none").map((a: any) => {
                          const isSelected = modalSelectedAudio === a.format_id;
                          return (
                            <div
                              key={a.format_id}
                              onClick={() => setModalSelectedAudio(isSelected ? "" : a.format_id)}
                              className={`border cursor-pointer select-none p-2.5 rounded-lg flex items-center justify-between gap-2 text-left min-w-0 transition-colors ${
                                isSelected
                                  ? "border-emerald-500 dark:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10"
                                  : "border-zinc-200/60 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight block truncate">
                                  {a.format_note || "Audio Only"} ({a.ext})
                                </span>
                                <span className="text-[9px] text-zinc-455 dark:text-zinc-500 font-mono block mt-0.5">
                                  {a.abr ? `${a.abr.toFixed(0)}kbps` : "HQ"} • {formatSize(a.filesize || a.filesize_approx)}
                                </span>
                              </div>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Sliders className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Fallback Quality Preset</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto p-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-850 rounded-xl custom-scrollbar">
                      {presetList.map((preset) => {
                        const isSelected = modalSelectedPreset === preset.value;
                        return (
                          <div
                            key={preset.value}
                            onClick={() => setModalSelectedPreset(preset.value)}
                            className={`border cursor-pointer select-none p-2.5 rounded-lg flex items-center justify-between gap-3 text-left min-w-0 transition-colors ${
                              isSelected
                                ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-500/10"
                                : "border-zinc-200/60 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-zinc-900 dark:text-white block">
                                {preset.label}
                              </span>
                              <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-mono block mt-0.5 truncate">
                                {preset.value}
                              </span>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4.5 h-4.5 text-blue-500 flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Subtitles Checklist */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Globe className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Download Subtitles</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-850 rounded-xl max-h-36 overflow-y-auto custom-scrollbar">
                    {modalDisplaySubOptions.map((opt) => (
                      <label key={opt.lang} className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors shadow-sm ${modalSelectedSubs.includes(opt.lang) ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400 font-extrabold" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-300 hover:border-purple-500"}`}>
                        <input
                          type="checkbox"
                          checked={modalSelectedSubs.includes(opt.lang)}
                          onChange={() => setModalSelectedSubs(prev => prev.includes(opt.lang) ? prev.filter(l => l !== opt.lang) : [...prev, opt.lang])}
                          className="accent-purple-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        {opt.name} {opt.lang !== "all" && `(${opt.lang.toUpperCase()})`}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Action Footer */}
              <div className="pt-3.5 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-850 dark:text-zinc-200 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-xs min-h-[34px]"
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  onClick={startModalDownload}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] min-h-[34px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  Add to Queue
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Tooltip.Provider>
  );
}
