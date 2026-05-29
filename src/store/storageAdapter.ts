import { load, Store } from "@tauri-apps/plugin-store";

// Detect if we are running inside the Tauri native OS shell
const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;

// Create a single unified binary store file in the OS AppData directory
let storePromise: Promise<Store> | null = null;
if (isTauri) {
  storePromise = load("synclime_state.bin", { autoSave: false });
}

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
        await tauriStore.save();
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
        await tauriStore.save();
      } catch (e) {
        console.warn(`[Tauri Store] Failed to remove ${name}:`, e);
      }
    } else {
      localStorage.removeItem(name);
    }
  },
};
