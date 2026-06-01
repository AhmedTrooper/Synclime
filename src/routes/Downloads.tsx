import { onMount, createMemo, For } from "solid-js";
import { useUIStore } from "../store/useUIStore";
import { useQueueStore, DownloadJob } from "../store/useQueueStore";
import { DownloadRow } from "../features/downloader/components/DownloadRow";
import { DownloadCloud, Trash2, Folder } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";

type TreeNode = {
  id: string;
  type: "playlist" | "video" | "audio" | "subtitle" | "direct_document";
  name: string;
  isPlaylistGroup?: boolean;
  job?: DownloadJob;
  children: TreeNode[];
};

export default function Downloads() {
  onMount(() => {
    useUIStore.setActivePath("/downloads");
    
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      invoke<DownloadJob[]>("get_all_jobs")
        .then(jobs => useQueueStore.setQueue(jobs))
        .catch(err => console.error("Failed to fetch jobs from SQLite:", err));
    }
  });

  const handlePauseToggle = async (job: DownloadJob) => {
    const isDownloading = job.status === "downloading";
    
    const nextStatus = isDownloading ? "paused" : "downloading";
    useQueueStore.updateJobStatus(job.slug, nextStatus);
    if (!isDownloading) {
      // Clear any previous error/message when resuming/restarting
      useQueueStore.updateJobProgress(job.slug, job.progress, "Resuming...");
    }

    try {
      if (isDownloading) {
        const res = await invoke<{ success: boolean; message: string }>("request_job_pause", { jobSlug: job.slug });
        if (!res.success) {
          throw new Error(res.message);
        }
      } else {
        const res = await invoke<{ success: boolean; message: string }>("trigger_job_start", { jobSlug: job.slug });
        if (!res.success) {
          throw new Error(res.message);
        }
      }
    } catch (e: any) {
      console.error(`Pause/Resume toggle failed for job ${job.slug}:`, e);
      const errMsg = e.message || "Failed to communicate with native downloader pipeline.";
      useQueueStore.updateJobStatus(job.slug, "error");
      useQueueStore.updateJobProgress(job.slug, job.progress, errMsg);
    }
  };

  const treeNodes = createMemo(() => {
    const jobNodes: Record<string, TreeNode> = {};
    useQueueStore.state.queue.forEach(job => {
      jobNodes[job.slug] = {
        id: job.slug,
        type: job.fileType as any,
        name: job.name,
        job,
        children: []
      };
    });

    const rootNodes: TreeNode[] = [];
    const playlistGroups: Record<string, TreeNode> = {};
    const parentedJobs = new Set<string>();

    useQueueStore.state.queue.forEach(job => {
      if (job.fileType === "subtitle") {
        let parentSlug = job.associatedMediaJobSlug;
        if (!parentSlug) {
          const matchedParent = useQueueStore.state.queue.find(j => j.url === job.url && j.fileType !== "subtitle");
          if (matchedParent) {
            parentSlug = matchedParent.slug;
          }
        }

        if (parentSlug && jobNodes[parentSlug]) {
          jobNodes[parentSlug].children.push(jobNodes[job.slug]);
          parentedJobs.add(job.slug);
        }
      }
    });

    const virtualVideoNodes: Record<string, TreeNode> = {};

    useQueueStore.state.queue.forEach(job => {
      if (job.fileType === "subtitle" && !parentedJobs.has(job.slug)) {
        const urlKey = job.url;
        if (!virtualVideoNodes[urlKey]) {
          let cleanVideoTitle = job.name;
          if (job.name.startsWith("[sub_") && job.name.includes("]_")) {
            cleanVideoTitle = job.name.substring(job.name.indexOf("]_") + 2);
          }

          virtualVideoNodes[urlKey] = {
            id: `virtual-video-${urlKey}`,
            type: "video",
            name: cleanVideoTitle,
            children: []
          };
        }
        virtualVideoNodes[urlKey].children.push(jobNodes[job.slug]);
      }
    });

    useQueueStore.state.queue.forEach(job => {
      if (job.fileType === "subtitle") {
        return;
      }

      const node = jobNodes[job.slug];
      const groupSlug = job.parentPlaylistSlug || (job.isPlaylist ? job.parsedFileSlug : undefined);

      if (groupSlug) {
        if (!playlistGroups[groupSlug]) {
          playlistGroups[groupSlug] = {
            id: `playlist-${groupSlug}`,
            type: "playlist",
            name: job.playlistName || "Playlist Batch",
            isPlaylistGroup: true,
            children: []
          };
          rootNodes.push(playlistGroups[groupSlug]);
        }
        playlistGroups[groupSlug].children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    Object.keys(virtualVideoNodes).forEach(urlKey => {
      const virtualNode = virtualVideoNodes[urlKey];
      const firstChild = virtualNode.children[0]?.job;
      const groupSlug = firstChild?.parentPlaylistSlug;

      if (groupSlug && playlistGroups[groupSlug]) {
        playlistGroups[groupSlug].children.push(virtualNode);
      } else {
        rootNodes.push(virtualNode);
      }
    });

    return rootNodes;
  });

  const handleReveal = async (job: DownloadJob) => {
    try {
      const res = await invoke<{ success: boolean; message: string }>("reveal_job_in_explorer", { jobSlug: job.slug });
      if (!res.success) throw new Error(res.message);
    } catch (e: any) {
      console.error(e);
      alert(`Asset location could not be revealed: ${e.message || e}`);
    }
  };

  const renderTree = (nodes: TreeNode[], depth: number = 0): any => {
    return (
      <For each={nodes}>
        {(node) => (
          <div class={`flex flex-col min-w-0 ${depth > 0 ? "ml-4 sm:ml-8 border-l-2 border-zinc-200 dark:border-white/10 pl-4 py-1 w-auto" : "py-1 w-full"}`}>
            {node.isPlaylistGroup ? (
              <div class="flex items-center gap-3 bg-purple-500/10 dark:bg-purple-500/10 p-3 sm:p-4 rounded-xl border border-purple-500/20 w-full min-w-0 shadow-sm mb-2 mt-2">
                <div class="p-2 bg-purple-500 text-white rounded-lg shadow-sm flex-shrink-0">
                   <Folder class="w-4 h-4" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white leading-tight line-clamp-1">{node.name}</span>
                  <span class="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">Playlist Group ({node.children.length} items)</span>
                </div>
              </div>
            ) : !node.job ? (
              <div class="flex items-center gap-3 bg-blue-500/5 dark:bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 w-full min-w-0 shadow-sm mb-2 mt-1">
                <div class="p-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-lg flex-shrink-0">
                   <Folder class="w-4 h-4" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-semibold text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-tight line-clamp-1">{node.name}</span>
                  <span class="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">Video Subtitles ({node.children.length} active)</span>
                </div>
              </div>
            ) : (
              <div class="w-full min-w-0">
                <DownloadRow
                  id={node.job.slug}
                  onPauseToggle={() => handlePauseToggle(node.job!)}
                  onReveal={() => handleReveal(node.job!)}
                  onDelete={() => handleDelete(node.job.slug)}
                />
              </div>
            )}
            
            {node.children.length > 0 && (
              <div class="flex flex-col gap-1 mt-1 w-auto min-w-0">
                {renderTree(node.children, depth + 1)}
              </div>
            )}
          </div>
        )}
      </For>
    );
  };

  const handleDelete = async (slug: string) => {
    useQueueStore.removeJob(slug);
    
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
    useQueueStore.clearQueue();

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
    <div class="flex flex-col gap-6 w-full max-w-4xl mx-auto h-full py-2">
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 bg-indigo-500 rounded-md text-white shadow-sm">
            <DownloadCloud class="w-4 h-4" />
          </div>
          <h1 class="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Active Downloads</h1>
        </div>
        {useQueueStore.state.queue.length > 0 && (
          <button
            onClick={handleClearAll}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold transition-colors text-[11px] uppercase tracking-wider"
          >
            <Trash2 class="w-3.5 h-3.5" />
            Clear Finished
          </button>
        )}
      </div>

      <div class="flex flex-col w-full mt-2">
        {useQueueStore.state.queue.length === 0 ? (
          <div class="flex flex-col items-center justify-center py-20 text-center gap-2">
            <DownloadCloud class="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
            <h3 class="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">No active downloads</h3>
            <p class="text-[11px] text-zinc-400 max-w-xs">
              Downloads and extraction tasks will appear here.
            </p>
          </div>
        ) : (
          <div class="flex flex-col gap-2 w-full">
            {renderTree(treeNodes(), 0)}
          </div>
        )}
      </div>
    </div>
  );
}
