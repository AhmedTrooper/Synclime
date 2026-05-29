import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nativeStorageAdapter } from "./storageAdapter";

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
}

interface QueueState {
  queue: DownloadJob[];
  progressUpdates: Record<string, number>;
  addJob: (job: DownloadJob) => void;
  updateJobStatus: (slug: string, status: DownloadJob["status"]) => void;
  updateJobProgress: (slug: string, progress: number, message?: string) => void;
  removeJob: (slug: string) => void;
  setProgress: (id: string, progress: number) => void;
  clearProgress: (id: string) => void;
  clearQueue: () => void;
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set) => ({
      queue: [],
      progressUpdates: {},
      addJob: (job) =>
        set((state) => ({
          queue: [job, ...state.queue.filter((j) => j.slug !== job.slug)],
        })),
      updateJobStatus: (slug, status) =>
        set((state) => ({
          queue: state.queue.map((j) =>
            j.slug === slug ? { ...j, status } : j
          ),
        })),
      updateJobProgress: (slug, progress, message) =>
        set((state) => ({
          queue: state.queue.map((j) =>
            j.slug === slug
              ? {
                  ...j,
                  progress,
                  message: message !== undefined ? message : j.message,
                  status: progress >= 100 ? "completed" : j.status,
                }
              : j
          ),
        })),
      removeJob: (slug) =>
        set((state) => ({
          queue: state.queue.filter((j) => j.slug !== slug),
        })),
      setProgress: (id, progress) =>
        set((state) => ({
          progressUpdates: { ...state.progressUpdates, [id]: progress },
        })),
      clearProgress: (id) =>
        set((state) => {
          const updates = { ...state.progressUpdates };
          delete updates[id];
          return { progressUpdates: updates };
        }),
      clearQueue: () => set({ queue: [] }),
    }),
    {
      name: "synclime-queue-storage",
      storage: createJSONStorage(() => nativeStorageAdapter),
      partialize: (state) => ({ queue: state.queue }),
    }
  )
);

// High-speed Progress Event System (Tauri Emitter)
if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
  import("@tauri-apps/api/event").then(({ listen }) => {
    listen("download-progress-token", (event: any) => {
      const { slug, progress, message } = event.payload as {
        slug: string;
        progress: number;
        message: string;
      };
      useQueueStore.getState().updateJobProgress(slug, progress, message);
      useQueueStore.getState().updateJobStatus(slug, progress >= 100 ? "completed" : "downloading");
    });
  }).catch((err) => {
    console.error("Failed to load Tauri event listener in queue store:", err);
  });
}

