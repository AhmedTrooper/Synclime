import { useEffect, useState } from "react";
import { useUIStore } from "../store/useUIStore";
import { Settings as SettingsIcon, RefreshCw, CheckCircle2, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export default function Settings() {
  const { setActivePath, downloadPath, setDownloadPath } = useUIStore();
  const [tempPath, setTempPath] = useState(downloadPath);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [concurrency, setConcurrency] = useState<number>(3);
  const [needsRelaunch, setNeedsRelaunch] = useState(false);

  useEffect(() => {
    const fetchLimit = async () => {
      try {
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
          const limit = await invoke<number>("get_concurrency_limit");
          setConcurrency(limit);
        }
      } catch (err) {
        console.error("Failed to fetch concurrency limit:", err);
      }
    };
    fetchLimit();
    setActivePath("/settings");
  }, [setActivePath]);

  useEffect(() => {
    setTempPath(downloadPath);
  }, [downloadPath]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setDownloadPath(tempPath);
    
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        await invoke("update_concurrency_limit", { limit: concurrency });
        await invoke("update_download_path", { path: tempPath });
        setNeedsRelaunch(true);
      }
    } catch(err) {
       console.error("Failed to update preferences:", err);
    }
    
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  const handleBrowse = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const selected = await open({
          directory: true,
          multiple: false,
          defaultPath: tempPath || undefined,
        });
        if (selected && typeof selected === "string") {
          setTempPath(selected);
        }
      } else {
        alert("Native folder picker is only available in the desktop app.");
      }
    } catch (err) {
      console.error("Failed to open dialog:", err);
    }
  };

  const handleResetToDefault = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const { downloadDir } = await import("@tauri-apps/api/path");
        const dir = await downloadDir();
        setDownloadPath(dir);
        setTempPath(dir);
        await invoke("update_download_path", { path: dir });
      } else {
        setDownloadPath("/home/user/Downloads");
        setTempPath("/home/user/Downloads");
      }
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to reset downloads path directory:", err);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl h-full py-2">
      {/* Top Toolbar / Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-zinc-500 rounded-md text-white shadow-sm">
            <SettingsIcon className="w-4 h-4" />
          </div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Preferences</h1>
        </div>
      </div>

      <div className="w-full">
        <form onSubmit={handleSave} className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
            
            {/* Setting Item 1: Download Path */}
            <div className="flex flex-col gap-2.5 p-3 sm:p-4">
              <label className="text-[10px] sm:text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Download Directory Path
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="/home/user/Downloads"
                  value={tempPath}
                  onChange={(e) => setTempPath(e.target.value)}
                  className="w-full sm:flex-grow px-3 py-2.5 sm:py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-xs sm:text-sm text-zinc-900 dark:text-white"
                />
                <div className="flex flex-row gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleBrowse}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs sm:text-[13px] font-bold sm:font-medium transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">Browse</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs sm:text-[13px] font-bold sm:font-medium transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">Reset</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="h-[1px] w-full bg-zinc-200 dark:bg-zinc-800" />

            {/* Setting Item 1.5: Concurrency Limit */}
            <div className="flex flex-col gap-3 p-3 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <span className="text-[12px] sm:text-[13px] font-bold text-zinc-900 dark:text-zinc-100">Simultaneous Extractions</span>
                  <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">Maximum concurrent background downloads</span>
                </div>
                <div className="w-10 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                  {concurrency}
                </div>
              </div>
              <div className="w-full flex items-center gap-4 px-1">
                <span className="text-[10px] font-bold text-zinc-400">1</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-[10px] font-bold text-zinc-400">10</span>
              </div>
            </div>

            <div className="h-[1px] w-full bg-zinc-200 dark:bg-zinc-800" />

          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center gap-4 justify-end pt-2">
            {savedSuccess && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-fade-in w-full sm:w-auto justify-center sm:justify-start">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configuration Applied
              </span>
            )}
            {needsRelaunch && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { relaunch } = await import("@tauri-apps/plugin-process");
                    await relaunch();
                  } catch (e) {
                    console.error("Failed to relaunch app:", e);
                  }
                }}
                className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-3 sm:py-2 rounded-xl sm:rounded-lg transition-colors text-xs sm:text-[13px] w-full sm:w-auto shadow-md shadow-rose-500/20"
              >
                Relaunch to Apply
              </button>
            )}
            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 sm:py-2 rounded-xl sm:rounded-lg transition-colors text-xs sm:text-[13px] w-full sm:w-auto shadow-md shadow-blue-500/20"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
