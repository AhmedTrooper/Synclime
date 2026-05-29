import { useParams, Link, useNavigate } from "react-router-dom";
import { useParseStore } from "../store/useParseStore";
import { useQueueStore, DownloadJob } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";

import { ArrowLeft, Download, Film, Music, Globe, List, Clock, PlayCircle, Settings, CheckCircle2, Sliders, ToggleLeft } from "lucide-react";
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
    if (!payload.entries || payload.entries.length === 0) return;
    
    // Pass the active adaptive format string preset selected by the user
    const playlistFormatString = selectedPreset;
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;

    for (const track of payload.entries) {
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
    { label: "Best Quality Available", value: "bestvideo+bestaudio/best" },
    { label: "Prefer 1080p or Lower", value: "bestvideo[height<=1080]+bestaudio/best" },
    { label: "Prefer 720p or Lower", value: "bestvideo[height<=720]+bestaudio/best" },
    { label: "Extract Audio Only", value: "bestaudio/best" },
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
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto px-4 py-2 text-zinc-950 dark:text-white transition-colors duration-300">
      {/* Back Header Nav */}
      <div className="flex justify-between items-center w-full">
        <Link
          to="/parsed_files"
          className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 px-3 py-1.5 rounded-lg transition-all duration-300 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Repository
        </Link>
      </div>

      {/* Asset Hero Section Card */}
      <div className="w-full bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-3xl shadow-lg p-5">
        <div className="flex flex-col md:flex-row gap-6 items-start text-left">
          {file.thumbnail && (
            <img
              src={file.thumbnail}
              alt={file.title}
              className="w-full md:w-80 aspect-video object-cover rounded-2xl border border-zinc-200 dark:border-white/5 shadow-md flex-shrink-0"
            />
          )}

          <div className="flex flex-col justify-between h-full py-1">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-white leading-snug">
                {file.title}
              </h2>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-white/5">
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4 leading-relaxed line-clamp-3 select-text">
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
        <div className="flex flex-col gap-6 text-left">
          {/* Playlist Controls & Fallback Selector */}
          <div className="w-full bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-3xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
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

              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3.5 min-w-[280px]">
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl min-h-[40px] px-3 outline-none text-sm font-semibold"
                >
                  {presetList.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={downloadAllPlaylist}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-purple-500/10 transition-all duration-300"
                >
                  <Download className="w-4 h-4" />
                  Download All Tracks
                </button>
              </div>
            </div>
          </div>

          {/* Playlist Tracks Listing */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-purple-500" />
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                Playlist Tracks ({payload.entries?.length || 0})
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full">
              {payload.entries?.map((track: any, index: number) => (
                <div
                  key={track.id}
                  className="border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-2xl"
                >
                  <div className="p-3 md:p-4 flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-grow text-left">
                      <span className="text-xs font-bold text-zinc-400 font-mono w-5">
                        {(index + 1).toString().padStart(2, "0")}
                      </span>
                      {track.thumbnails?.[0]?.url && (
                        <img
                          src={track.thumbnails[0].url}
                          alt={track.title}
                          className="w-14 aspect-video object-cover rounded-lg border border-zinc-200 dark:border-white/5 flex-shrink-0"
                        />
                      )}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1 leading-snug">
                          {track.title}
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {formatDuration(track.duration)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => startDownload(selectedPreset, false, track.title)}
                      className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 rounded-xl"
                    >
                      <Download className="w-4 h-4" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Main Selectors (Layers 1 & 2) */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Explicit Switcher Interface Tab bar */}
            <div className="flex bg-zinc-100/80 dark:bg-white/5 border border-zinc-200 dark:border-white/5 p-1 rounded-2xl self-start shadow-inner">
              <button
                type="button"
                onClick={() => setSelectionMode("custom")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all select-none ${
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {videoStreams.map((v: any) => {
                      const isSelected = selectedVideo === v.format_id;
                      return (
                        <div
                          key={v.format_id}
                          className={`border cursor-pointer select-none transition-all duration-300 rounded-2xl p-4 flex flex-row items-center justify-between gap-3 text-left hover:scale-[1.01] active:scale-[0.99] shadow-sm ${
                            isSelected
                              ? "border-blue-500 dark:border-blue-400 bg-blue-500/5 dark:bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                              : "border-zinc-200 dark:border-white/5 bg-white/70 dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                          }`}
                          onClick={() => setSelectedVideo(isSelected ? "" : v.format_id)}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">
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
                </div>

                {/* Audio Streams selection */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Music className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Select Audio Stream
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {audioStreams.map((a: any) => {
                      const isSelected = selectedAudio === a.format_id;
                      return (
                        <div
                          key={a.format_id}
                          className={`border cursor-pointer select-none transition-all duration-300 rounded-2xl p-4 flex flex-row items-center justify-between gap-3 text-left hover:scale-[1.01] active:scale-[0.99] shadow-sm ${
                            isSelected
                              ? "border-emerald-500 dark:border-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                              : "border-zinc-200 dark:border-white/5 bg-white/70 dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                          }`}
                          onClick={() => setSelectedAudio(isSelected ? "" : a.format_id)}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white font-semibold">
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

                <div className="grid grid-cols-1 gap-3">
                  {presetList.map((preset) => {
                    const isSelected = selectedPreset === preset.value;
                    return (
                      <div
                        key={preset.value}
                        className={`border cursor-pointer select-none transition-all duration-300 rounded-2xl p-4 flex flex-row items-center justify-between gap-4 text-left hover:scale-[1.005] active:scale-[0.995] shadow-sm ${
                          isSelected
                            ? "border-blue-500 dark:border-blue-400 bg-blue-500/5 dark:bg-blue-500/10 shadow-md"
                            : "border-zinc-200 dark:border-white/5 bg-white/70 dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                        }`}
                        onClick={() => setSelectedPreset(preset.value)}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-zinc-900 dark:text-white">
                            {preset.label}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            RULE FORMAT: {preset.value}
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                      </div>
                    );
                  })}
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

              <div className="border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-3xl p-4">
                <div className="flex flex-col gap-5">
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
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold w-full py-4 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all duration-300"
                  >
                    <Download className="w-4 h-4" />
                    Initialize Extraction Download
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

              <div className="border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-3xl p-3">
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
                          className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-2 outline-none text-sm font-semibold"
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


