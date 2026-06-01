import { createStore } from "solid-js/store";
import { createEffect, on, createRoot } from "solid-js";
import { nativeStorageAdapter } from "./storageAdapter";

interface BadgeState {
  home: number;
  about: number;
  downloads: number;
  parsedFiles: number;
  settings: number;
  sites: number;
  logs: number;
}

interface UIState {
  activePath: string;
  badges: BadgeState;
  theme: "dark" | "light" | "system";
  downloadPath: string;
  isSidebarExpanded: boolean;
  _hasHydrated: boolean;
}

const [uiState, setUIState] = createStore<UIState>({
  activePath: "/",
  badges: {
    home: 0,
    about: 0,
    downloads: 0,
    parsedFiles: 0,
    settings: 0,
    sites: 0,
    logs: 0,
  },
  theme: "system",
  downloadPath: "",
  isSidebarExpanded: true,
  _hasHydrated: false,
});

export const useUIStore = {
  get state() {
    return uiState;
  },
  setActivePath: (path: string) => setUIState("activePath", path),
  incrementBadge: (tab: keyof BadgeState) => setUIState("badges", tab, (c) => c + 1),
  decrementBadge: (tab: keyof BadgeState) => setUIState("badges", tab, (c) => Math.max(0, c - 1)),
  clearBadge: (tab: keyof BadgeState) => setUIState("badges", tab, 0),
  setBadge: (tab: keyof BadgeState, count: number) => setUIState("badges", tab, Math.max(0, count)),
  setTheme: (theme: "dark" | "light" | "system") => setUIState("theme", theme),
  toggleSidebar: () => setUIState("isSidebarExpanded", (s) => !s),
  setDownloadPath: (path: string) => setUIState("downloadPath", path),
  setHasHydrated: (state: boolean) => setUIState("_hasHydrated", state),
};

// Async Hydration
nativeStorageAdapter.getItem("synclime-ui-storage").then((data) => {
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.state) {
        setUIState(parsed.state);
      }
    } catch (e) {
      console.warn("Failed to parse hydrated UI state", e);
    }
  }
  useUIStore.setHasHydrated(true);
});

// Async Persistence (Syncs updates back to store automatically, bound to reactive root context)
createRoot(() => {
  createEffect(
    on(
      () => [uiState.theme, uiState.activePath, uiState.downloadPath, uiState.isSidebarExpanded],
      () => {
        if (!uiState._hasHydrated) return;
        const stateToSave = {
          state: {
            theme: uiState.theme,
            activePath: uiState.activePath,
            downloadPath: uiState.downloadPath,
            isSidebarExpanded: uiState.isSidebarExpanded,
          },
        };
        nativeStorageAdapter.setItem("synclime-ui-storage", JSON.stringify(stateToSave));
      },
      { defer: true }
    )
  );
});
