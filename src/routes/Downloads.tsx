import { useEffect } from "react";

import { useUIStore } from "../store/useUIStore";
import { useQueueStore, DownloadJob } from "../store/useQueueStore";
import { DownloadRow } from "../features/downloader/components/DownloadRow";
import { DownloadCloud, Trash2 } from "lucide-react";
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
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto h-full py-2">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-500 rounded-md text-white shadow-sm">
            <DownloadCloud className="w-4 h-4" />
          </div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Active Downloads</h1>
        </div>
        {queue.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold transition-colors text-[11px] uppercase tracking-wider"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Finished
          </button>
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
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <DownloadCloud className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
            <h3 className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">No active downloads</h3>
            <p className="text-[11px] text-zinc-400 max-w-xs">
              Downloads and extraction tasks will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

