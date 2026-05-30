import { createStore } from "solid-js/store";

export interface DownloadJob {
  slug: string;
  name: string;
  url: string;
  progress: number;
  status: "pending" | "downloading" | "paused" | "completed" | "error";
  message: string;
  fileType: "video" | "audio" | "subtitle" | "direct_document";
  formatString?: string;
  createdAt: string;
  associatedMediaJobSlug?: string;
  parsedFileSlug?: string;
  isPlaylist?: boolean;
  playlistName?: string;
  parentPlaylistSlug?: string;
}

interface QueueState {
  queue: DownloadJob[];
  progressUpdates: Record<string, number>;
}

const [queueState, setQueueState] = createStore<QueueState>({
  queue: [],
  progressUpdates: {},
});

export const useQueueStore = {
  get state() {
    return queueState;
  },
  setQueue: (jobs: DownloadJob[]) => setQueueState("queue", jobs),
  addJob: (job: DownloadJob) =>
    setQueueState("queue", (queue) => [job, ...queue.filter((j) => j.slug !== job.slug)]),
  updateJobStatus: (slug: string, status: DownloadJob["status"]) =>
    setQueueState("queue", (j) => j.slug === slug, "status", status),
  updateJobProgress: (slug: string, progress: number, message?: string) =>
    setQueueState(
      "queue",
      (j) => j.slug === slug,
      (j) => ({
        ...j,
        progress,
        message: message !== undefined ? message : j.message,
        status: progress >= 100 ? "completed" : j.status,
      })
    ),
  removeJob: (slug: string) => setQueueState("queue", (q) => q.filter((j) => j.slug !== slug)),
  setProgress: (id: string, progress: number) => setQueueState("progressUpdates", id, progress),
  clearProgress: (id: string) => setQueueState("progressUpdates", id, undefined as any),
  clearQueue: () =>
    setQueueState("queue", (q) => q.filter((j) => j.status !== "completed" && j.status !== "error")),
};

// High-speed Progress Event System (Tauri Emitter)
if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
  import("@tauri-apps/api/event")
    .then(({ listen }) => {
      listen("download-progress-token", (event: any) => {
        const { slug, progress, message, status } = event.payload as {
          slug: string;
          progress: number;
          message: string;
          status?: string;
        };
        useQueueStore.updateJobProgress(slug, progress, message);
        if (status) {
          useQueueStore.updateJobStatus(slug, status as any);
        } else {
          useQueueStore.updateJobStatus(slug, progress >= 100 ? "completed" : "downloading");
        }
      });
    })
    .catch((err) => {
      console.error("Failed to load Tauri event listener in queue store:", err);
    });
}
