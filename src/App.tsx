import { createSignal, createEffect, onCleanup, onMount, Show } from "solid-js";
import { useUIStore } from "./store/useUIStore";
import SplashScreen from "./components/SplashScreen";

export default function App(props: any) {
  const [isLoaded, setIsLoaded] = createSignal(false);
  const ui = useUIStore.state;

  onMount(() => {
    // this stops you from pressing f5 or inspect element to break the app
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F5" ||
        ((e.metaKey || e.ctrlKey) && e.key === "r") ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "C" || e.key === "c" || e.key === "J" || e.key === "j"))
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  createEffect(() => {
    if (!ui._hasHydrated) return;
    
    // this function finds where to save downloaded files on your computer
    const resolveDefaultDirectory = async () => {
      try {
        const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
        let dbPath = "";
        
        if (isTauri) {
          const { invoke } = await import("@tauri-apps/api/core");
          dbPath = await invoke<string>("get_download_path");
        }

        if (dbPath && dbPath.trim().length > 0) {
          useUIStore.setDownloadPath(dbPath);
          // console.log("SyncLime: loaded persisted download path from SQLite settings:", dbPath);
        } else {
          let defaultDir = "";
          if (isTauri) {
            const { downloadDir } = await import("@tauri-apps/api/path");
            defaultDir = await downloadDir();
            const { invoke } = await import("@tauri-apps/api/core");
            await invoke("update_download_path", { path: defaultDir });
          } else {
            defaultDir = "/home/user/Downloads";
          }
          useUIStore.setDownloadPath(defaultDir);
          // console.log("SyncLime: initialized first-run default download path:", defaultDir);
        }
      } catch (err) {
        // console.error("Failed to resolve downloads path directory settings:", err);
        if (!ui.downloadPath) {
          useUIStore.setDownloadPath("/home/user/Downloads");
        }
      }
    };

    resolveDefaultDirectory();

    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 2000);

    onCleanup(() => clearTimeout(timer));
  });

  return (
    <>
      <Show when={!isLoaded()}>
        <SplashScreen />
      </Show>
      {props.children}
    </>
  );
}
