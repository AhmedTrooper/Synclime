import { create } from "zustand";

interface QueueState {
  progressUpdates: Record<string, number>;
  setProgress: (id: string, progress: number) => void;
  clearProgress: (id: string) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  progressUpdates: {},
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
}));
