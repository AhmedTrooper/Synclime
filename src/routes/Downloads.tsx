import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useUIStore } from "../store/useUIStore";
import { useQueueStore, DownloadJob } from "../store/useQueueStore";
import { DownloadRow } from "../features/downloader/components/DownloadRow";
import { Button } from "@heroui/react";
import { ArrowLeft, DownloadCloud, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

export default function Downloads() {
  const { setActivePath } = useUIStore();
  const { queue, updateJobStatus, removeJob, clearQueue } = useQueueStore();

  useEffect(() => {
    setActivePath("/downloads");
  }, [setActivePath]);

  const handlePauseToggle = async (job: DownloadJob) => {
    const isDownloading = job.status === "downloading";
    
    // Optimistic state change
    const nextStatus = isDownloading ? "paused" : "downloading";
    updateJobStatus(job.slug, nextStatus);

    try {
      if (isDownloading) {
        // Call pause IPC route
        const res = await invoke<{ success: boolean; message: string }>("request_job_pause", { jobSlug: job.slug });
        if (!res.success) {
          throw new Error(res.message);
        }
      } else {
        // Call start IPC route
        const res = await invoke<{ success: boolean; message: string }>("trigger_job_start", { jobSlug: job.slug });
        if (!res.success) {
          throw new Error(res.message);
        }
      }
    } catch (e: any) {
      console.error(`Pause/Resume toggle failed for job ${job.slug}:`, e);
      const errMsg = e.message || "Failed to communicate with native downloader pipeline.";
      updateJobStatus(job.slug, "error");
      useQueueStore.getState().updateJobProgress(job.slug, job.progress, errMsg);
    }
  };

  const handleReveal = async (job: DownloadJob) => {
    try {
      // In native Tauri, we can open the folder using the opener plugin
      await invoke("tauri_plugin_opener", { path: job.url });
    } catch {
      alert(`Asset location: ${job.url}`);
    }
  };

  const handleDelete = async (slug: string) => {
    // 1. Instantly remove from UI store optimistically
    removeJob(slug);
    
    // 2. Drop the record from backend SQLite database
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        await invoke("delete_job_record", { jobSlug: slug });
      } catch (e) {
        console.error(`Failed to delete job ${slug} from SQLite backend:`, e);
      }
    }
  };

  const handleClearAll = async () => {
    // 1. Instantly drop everything from UI store
    clearQueue();

    // 2. Clear entire backend database table
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        await invoke("clear_all_jobs_records");
      } catch (e) {
        console.error("Failed to clear all jobs from SQLite backend:", e);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-4xl mx-auto px-4 py-4 text-zinc-950 dark:text-white transition-colors duration-300">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white transition-colors duration-300">
          Downloads <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Queue</span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed transition-colors duration-300">
          Monitor real-time progress, file download speeds, active statuses, and process actions for direct and extraction jobs.
        </p>
      </div>

      {/* Navigation Buttons Row */}
      <div className="flex justify-between items-center w-full mt-2">
        <Button
          as={Link}
          to="/"
          size="sm"
          className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300"
          startContent={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Analyzer
        </Button>
        {queue.length > 0 && (
          <Button
            size="sm"
            color="danger"
            variant="flat"
            className="font-semibold transition-all duration-300"
            startContent={<Trash2 className="w-4 h-4" />}
            onPress={handleClearAll}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Queue Listing */}
      <div className="grid grid-cols-1 gap-4 w-full">
        {queue.map((job) => (
          <DownloadRow
            key={job.slug}
            id={job.slug}
            name={job.name}
            progress={job.progress}
            status={job.status === "pending" ? "paused" : job.status}
            message={job.message}
            onPauseToggle={() => handlePauseToggle(job)}
            onReveal={() => handleReveal(job)}
            onDelete={() => handleDelete(job.slug)}
          />
        ))}

        {queue.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-3xl text-center gap-4">
            <div className="p-4 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl text-zinc-400 dark:text-zinc-400">
              <DownloadCloud className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Queue is Empty</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                There are currently no direct or extracted download jobs queued inside the core manager.
              </p>
            </div>
            <Button
              as={Link}
              to="/"
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-500/10 px-5 rounded-xl transition-all duration-300 mt-2"
            >
              Analyze a Link
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

