import { load, Store } from "@tauri-apps/plugin-store";

const isTauri =
  typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;

let storePromise: Promise<Store> | null = null;
if (isTauri) {
  storePromise = load("synclime_state.bin", { autoSave: false });
}

let saveTimeout: any = null;

const debounceSave = (tauriStore: Store) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(async () => {
    try {
      await tauriStore.save();
    } catch (e) {
      console.warn("[Tauri Store] Failed to save store to disk:", e);
    }
  }, 1000); // Throttle physical writes to 1 second of inactivity
};

export const nativeStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    if (isTauri && storePromise) {
      try {
        const tauriStore = await storePromise;
        const value = await tauriStore.get(name);
        return value ? (value as string) : null;
      } catch (e) {
        console.warn(`[Tauri Store] Failed to read ${name}:`, e);
        return null;
      }
    } else {
      return localStorage.getItem(name);
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (isTauri && storePromise) {
      try {
        const tauriStore = await storePromise;
        await tauriStore.set(name, value);
        debounceSave(tauriStore); // Optimized debounced disk flush
      } catch (e) {
        console.warn(`[Tauri Store] Failed to write ${name}:`, e);
      }
    } else {
      localStorage.setItem(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (isTauri && storePromise) {
      try {
        const tauriStore = await storePromise;
        await tauriStore.delete(name);
        debounceSave(tauriStore); // Optimized debounced disk flush
      } catch (e) {
        console.warn(`[Tauri Store] Failed to remove ${name}:`, e);
      }
    } else {
      localStorage.removeItem(name);
    }
  },
};
