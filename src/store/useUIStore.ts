import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BadgeState {
  home: number;
  about: number;
  downloads: number;
  settings: number;
}

interface UIStore {
  activePath: string;
  badges: BadgeState;
  theme: "dark" | "light";
  setActivePath: (path: string) => void;
  incrementBadge: (tab: keyof BadgeState) => void;
  decrementBadge: (tab: keyof BadgeState) => void;
  clearBadge: (tab: keyof BadgeState) => void;
  setBadge: (tab: keyof BadgeState, count: number) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      activePath: "/",
      badges: {
        home: 0,
        about: 0,
        downloads: 0,
        settings: 0,
      },
      theme: "dark",
      setActivePath: (path) => set({ activePath: path }),
      incrementBadge: (tab) =>
        set((state) => ({
          badges: {
            ...state.badges,
            [tab]: state.badges[tab] + 1,
          },
        })),
      decrementBadge: (tab) =>
        set((state) => ({
          badges: {
            ...state.badges,
            [tab]: Math.max(0, state.badges[tab] - 1),
          },
        })),
      clearBadge: (tab) =>
        set((state) => ({
          badges: {
            ...state.badges,
            [tab]: 0,
          },
        })),
      setBadge: (tab, count) =>
        set((state) => ({
          badges: {
            ...state.badges,
            [tab]: Math.max(0, count),
          },
        })),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "dark" ? "light" : "dark",
        })),
    }),
    {
      name: "osgui-ui-storage",
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);


