import { useParams, Link, useNavigate } from "react-router-dom";
import { useParseStore } from "../store/useParseStore";
import { useQueueStore, DownloadJob } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";

import { ArrowLeft, Download, Film, Music, Globe, List, Clock, PlayCircle, Settings, CheckCircle2, Sliders, ToggleLeft, CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function ParsedFileDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { parsedFiles } = useParseStore();
  const { addJob } = useQueueStore();

  const file = parsedFiles.find((f) => f.slug === slug);
  const [selectedSub, setSelectedSub] = useState<string>("");

  // Layer Switch State: "custom" (Layer 1) vs "fallback" (Layer 2)
  const [selectionMode, setSelectionMode] = useState<"custom" | "fallback">("custom");

  // Custom Selection State (Layer 1)
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [selectedAudio, setSelectedAudio] = useState<string>("");

  // Preset Selection State (Layer 2)
  const [selectedPreset, setSelectedPreset] = useState<string>("bestvideo+bestaudio/best");

  // Playlist Bulk Selection State
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6 w-full max-w-md mx-auto px-4">
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

  // Helper to dynamically calculate target format string
  const getGeneratedFormatString = () => {
    if (selectionMode === "fallback") {
      return selectedPreset;
    }
    
    // Custom selection mode (Layer 1)
    if (selectedVideo && selectedAudio) {
      return `${selectedVideo}+${selectedAudio}`;
    } else if (selectedVideo) {
      return selectedVideo;
    } else if (selectedAudio) {
      return selectedAudio;
    }
    return "bestvideo+bestaudio/best"; // Global fallback
  };

  // Triggers the download queue addition
  const startDownload = async (formatString: string, isAudio = false, customName?: string) => {
    try {
      const uniqueSlug = `dl-${Date.now()}`;
      const jobName = customName || file.title;
      
      const newJob: DownloadJob = {
        slug: uniqueSlug,
        name: jobName,
        url: file.url,
        progress: 0,
        status: "pending",
        message: "Queued for extraction download...",
        fileType: isAudio ? "audio" : "video",
        formatString: formatString,
        createdAt: new Date().toISOString(),
      };

      // Add to store
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
              format_string: newJob.formatString || "bestvideo+bestaudio/best",
              download_path: useUIStore.getState().downloadPath,
              created_at: newJob.createdAt,
            }
          });
          if (!insertRes.success) throw new Error(insertRes.message);
        } catch (e: any) {
          console.error("Database pre-registration error:", e);
          const errMsg = e.message || "Failed to construct the initial job record in SQLite.";
          useQueueStore.getState().updateJobStatus(uniqueSlug, "error");
          useQueueStore.getState().updateJobProgress(uniqueSlug, 0, errMsg);
          return;
        }

        // Attempt calling Tauri invoke start command
        try {
          const res = await invoke<{ success: boolean; message: string }>("trigger_job_start", { jobSlug: uniqueSlug });
          if (!res.success) {
            throw new Error(res.message);
          }
        } catch (e: any) {
          console.error("trigger_job_start invoke error:", e);
          const errMsg = e.message || "Failed to initialize native extraction downloader.";
          useQueueStore.getState().updateJobStatus(uniqueSlug, "error");
          useQueueStore.getState().updateJobProgress(uniqueSlug, 0, errMsg);
        }
      } else {
        // Simulate progress on web fallback (browser preview only)
        let currentProgress = 0;
        const interval = setInterval(() => {
          currentProgress += Math.floor(Math.random() * 15) + 5;
          if (currentProgress >= 100) {
            currentProgress = 100;
            useQueueStore.getState().updateJobProgress(uniqueSlug, 100, "Download task completed.");
            useQueueStore.getState().updateJobStatus(uniqueSlug, "completed");
            clearInterval(interval);
          } else {
            useQueueStore.getState().updateJobProgress(
              uniqueSlug,
              currentProgress,
              `${(Math.random() * 8 + 3).toFixed(2)}MB/s ETA 00:0${Math.floor((100 - currentProgress) / 10)}`
            );
            useQueueStore.getState().updateJobStatus(uniqueSlug, "downloading");
          }
        }, 1500);
      }

      // Redirect to downloads queue page
      navigate("/downloads");
    } catch (err: any) {
      console.error("Failed to inject job:", err);
    }
  };

  // Bulk downloads all playlist tracks using the selected fallback rule
  const downloadAllPlaylist = async () => {
    let targetTracks = payload.entries || [];
    if (selectedTracks.length > 0) {
      targetTracks = targetTracks.filter((t: any) => selectedTracks.includes(t.id));
    }
    if (targetTracks.length === 0) return;
    
    // Pass the active adaptive format string preset selected by the user
    const playlistFormatString = selectedPreset;
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;

    for (const track of targetTracks) {
      const trackSlug = `track-${track.id}-${Date.now()}`;
      const newJob: DownloadJob = {
        slug: trackSlug,
        name: track.title,
        url: track.url,
        progress: 0,
        status: "pending",
        message: "Playlist batch job initialized...",
        fileType: "video",
        formatString: playlistFormatString,
        createdAt: new Date().toISOString(),
      };

      addJob(newJob);

      if (isTauri) {
        // Pre-register job in the SQLite registry
        try {
          const insertRes = await invoke<{ success: boolean; message: string }>("insert_job_record", {
            payload: {
              slug: newJob.slug,
              url: newJob.url,
              file_type: newJob.fileType,
              format_string: newJob.formatString || "bestvideo+bestaudio/best",
              download_path: useUIStore.getState().downloadPath,
              created_at: newJob.createdAt,
            }
          });
          if (!insertRes.success) throw new Error(insertRes.message);
        } catch (e: any) {
          console.error(`Database pre-registration error for playlist item ${track.title}:`, e);
          const errMsg = e.message || "Failed to construct the initial job record in SQLite.";
          useQueueStore.getState().updateJobStatus(trackSlug, "error");
          useQueueStore.getState().updateJobProgress(trackSlug, 0, errMsg);
          continue;
        }

        try {
          const res = await invoke<{ success: boolean; message: string }>("trigger_job_start", { jobSlug: trackSlug });
          if (!res.success) {
            throw new Error(res.message);
          }
        } catch (e: any) {
          console.error(`trigger_job_start invoke error on playlist item ${track.title}:`, e);
          const errMsg = e.message || "Failed to initialize native extraction downloader.";
          useQueueStore.getState().updateJobStatus(trackSlug, "error");
          useQueueStore.getState().updateJobProgress(trackSlug, 0, errMsg);
        }
      } else {
        // Direct complete simulation (browser preview only)
        setTimeout(() => {
          useQueueStore.getState().updateJobProgress(trackSlug, 100, "Finished batch item.");
          useQueueStore.getState().updateJobStatus(trackSlug, "completed");
        }, 2000 + Math.random() * 3000);
      }
    }

    navigate("/downloads");
  };

  const subOptions = payload.subtitles
    ? Object.keys(payload.subtitles).map((lang) => ({
        lang,
        name: payload.subtitles[lang][0]?.name || lang.toUpperCase(),
      }))
    : [];

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

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-4xl mx-auto px-1 sm:px-4 py-1 sm:py-2 text-zinc-950 dark:text-white transition-colors duration-300">
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
          <div className="w-full bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-xl sm:rounded-3xl p-3 sm:p-5">
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
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-lg shadow-purple-500/10 transition-all duration-300 overflow-hidden"
                >
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-[12px] sm:text-sm">
                    {selectedTracks.length > 0 ? `Download Selected (${selectedTracks.length})` : "Download All Tracks"}
                  </span>
                </button>
              </div>
            </div>
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
                  className="border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-xl sm:rounded-2xl"
                >
                  <div className="p-1.5 sm:p-3 md:p-4 flex flex-row items-center justify-between gap-1.5 sm:gap-4">
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

                    <button
                      onClick={() => startDownload(selectedPreset, false, track.title)}
                      className="p-1.5 sm:p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 rounded-lg sm:rounded-xl"
                    >
                      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
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
        <div className="flex flex-col-reverse md:grid md:grid-cols-3 gap-4 sm:gap-6 text-left">
          {/* Main Selectors (Layers 1 & 2) */}
          <div className="md:col-span-2 flex flex-col gap-4 sm:gap-6">
            {/* Explicit Switcher Interface Tab bar */}
            <div className="flex flex-col sm:flex-row bg-zinc-100/80 dark:bg-white/5 border border-zinc-200 dark:border-white/5 p-1 rounded-2xl w-full sm:self-start shadow-inner gap-1 sm:gap-0">
              <button
                type="button"
                onClick={() => setSelectionMode("custom")}
                className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider transition-all select-none ${
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
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all select-none ${
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
              <div className="flex flex-col gap-6">
                {/* Video Streams selection */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Film className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Select Video Stream
                    </span>
                  </div>

                  <div className="hidden sm:grid sm:grid-cols-2 gap-3">
                    {videoStreams.map((v: any) => {
                      const isSelected = selectedVideo === v.format_id;
                      return (
                        <div
                          key={v.format_id}
                          className={`border cursor-pointer select-none transition-all duration-300 rounded-2xl p-3 sm:p-4 flex flex-row items-center justify-between gap-2 sm:gap-3 text-left hover:scale-[1.01] active:scale-[0.99] shadow-sm min-w-0 ${
                            isSelected
                              ? "border-blue-500 dark:border-blue-400 bg-blue-500/5 dark:bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                              : "border-zinc-200 dark:border-white/5 bg-white/70 dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                          }`}
                          onClick={() => setSelectedVideo(isSelected ? "" : v.format_id)}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0 break-words">
                            <span className="text-[11px] sm:text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                              {v.format_note || `${v.height}p`} ({v.ext})
                            </span>
                            <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono">
                              RESOLUTION: {v.resolution || `${v.width}x${v.height}`} • SIZE: {formatSize(v.filesize || v.filesize_approx)}
                            </span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4.5 h-4.5 text-blue-500 flex-shrink-0" />}
                        </div>
                      );
                    })}

                    {videoStreams.length === 0 && (
                      <span className="text-xs italic text-zinc-500 dark:text-zinc-400">
                        No separate video-only streams discovered.
                      </span>
                    )}
                  </div>
                  
                  {/* Native Mobile Dropdown for KaiOS D-PAD */}
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
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Music className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Select Audio Stream
                    </span>
                  </div>

                  <div className="hidden sm:grid sm:grid-cols-2 gap-3">
                    {audioStreams.map((a: any) => {
                      const isSelected = selectedAudio === a.format_id;
                      return (
                        <div
                          key={a.format_id}
                          className={`border cursor-pointer select-none transition-all duration-300 rounded-2xl p-3 sm:p-4 flex flex-row items-center justify-between gap-2 sm:gap-3 text-left hover:scale-[1.01] active:scale-[0.99] shadow-sm min-w-0 ${
                            isSelected
                              ? "border-emerald-500 dark:border-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                              : "border-zinc-200 dark:border-white/5 bg-white/70 dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                          }`}
                          onClick={() => setSelectedAudio(isSelected ? "" : a.format_id)}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0 break-words">
                            <span className="text-[11px] sm:text-xs font-bold text-zinc-900 dark:text-white font-semibold leading-tight">
                              {a.format_note || "Audio Only"} ({a.ext})
                            </span>
                            <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono">
                              BITRATE: {a.abr ? `${a.abr.toFixed(0)}kbps` : "HQ"} • SIZE: {formatSize(a.filesize || a.filesize_approx)}
                            </span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />}
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
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Sliders className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Select Fallback Preference Preset
                  </span>
                </div>

                <div className="hidden sm:grid sm:grid-cols-1 gap-3">
                  {presetList.map((preset) => {
                    const isSelected = selectedPreset === preset.value;
                    return (
                      <div
                        key={preset.value}
                        className={`border cursor-pointer select-none transition-all duration-300 rounded-2xl p-3 sm:p-4 flex flex-row items-center justify-between gap-2 sm:gap-4 text-left hover:scale-[1.005] active:scale-[0.995] shadow-sm min-w-0 ${
                          isSelected
                            ? "border-blue-500 dark:border-blue-400 bg-blue-500/5 dark:bg-blue-500/10 shadow-md"
                            : "border-zinc-200 dark:border-white/5 bg-white/70 dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                        }`}
                        onClick={() => setSelectedPreset(preset.value)}
                      >
                        <div className="flex flex-col gap-1 min-w-0 break-words">
                          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                            {preset.label}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            RULE FORMAT: {preset.value}
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />}
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
          <div className="flex flex-col gap-6">
            {/* Generate & Download Panel */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-500" />
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                  Download Manager
                </h3>
              </div>

              <div className="border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-xl sm:rounded-3xl p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:gap-5">
                  {/* Generated Monospace Format String Preview */}
                  <div className="flex flex-col gap-2 text-left">
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
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold w-full py-4 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all duration-300 overflow-hidden px-2"
                  >
                    <Download className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-xs sm:text-sm">Initialize Extraction Download</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Subtitles Panel */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" />
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                  Language Subtitles
                </h3>
              </div>

              <div className="border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-xl sm:rounded-3xl p-3">
                <div className="flex flex-col gap-4">
                  {subOptions.length > 0 ? (
                    <>
                      <div className="flex flex-col gap-2 text-left">
                        <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Select Language
                        </label>
                        <select
                          value={selectedSub}
                          onChange={(e) => setSelectedSub(e.target.value)}
                          className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-2 outline-none text-xs sm:text-sm font-semibold w-full max-w-full overflow-hidden text-ellipsis"
                        >
                          <option value="">Choose language option</option>
                          {subOptions.map((opt) => (
                            <option key={opt.lang} value={opt.lang}>
                              {opt.name} ({opt.lang.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => startDownload(`bestvideo+bestaudio/best`, false, `${file.title} (Subtitles - ${selectedSub.toUpperCase()})`)}
                        disabled={!selectedSub}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold w-full py-2 rounded-xl transition-all duration-300 disabled:opacity-50"
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
    </div>
  );
}


