import { useEffect, useState } from "react";
import { useUIStore } from "../store/useUIStore";
import * as Switch from "@radix-ui/react-switch";
import { Settings as SettingsIcon, RefreshCw, CheckCircle2, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";

export default function Settings() {
  const { setActivePath, downloadPath, setDownloadPath, theme, toggleTheme } = useUIStore();
  const [tempPath, setTempPath] = useState(downloadPath);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setActivePath("/settings");
  }, [setActivePath]);

  useEffect(() => {
    setTempPath(downloadPath);
  }, [downloadPath]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setDownloadPath(tempPath);
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
        <div className="flex flex-col gap-4">
          <form onSubmit={handleSave} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Download Directory Path</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="/home/user/Downloads"
                  value={tempPath}
                  onChange={(e) => setTempPath(e.target.value)}
                  className="flex-grow px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-sm text-zinc-900 dark:text-white shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-md text-[13px] font-medium transition-colors shadow-sm"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Browse
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-md text-[13px] font-medium transition-colors shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">Dark Mode</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Toggle dark UI theme</span>
              </div>
              <Switch.Root
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 data-[state=checked]:bg-blue-500 rounded-full relative outline-none cursor-default shadow-inner transition-colors"
              >
                <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow-sm transition-transform translate-x-[2px] data-[state=checked]:translate-x-[18px]" />
              </Switch.Root>
            </div>

            <div className="flex items-center gap-4 justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
              {savedSuccess && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved successfully
                </span>
              )}
              <button
                type="submit"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-md transition-colors text-[13px] shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
