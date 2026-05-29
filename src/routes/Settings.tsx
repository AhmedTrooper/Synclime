import { useEffect, useState } from "react";
import { useUIStore } from "../store/useUIStore";
import * as Switch from "@radix-ui/react-switch";
import { Settings as SettingsIcon, Folder, Save, RefreshCw, CheckCircle2, Moon, Sun } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-2xl mx-auto px-4 py-4 text-zinc-950 dark:text-white transition-colors duration-300">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-2xl mb-1 shadow-[0_8px_30px_rgba(99,102,241,0.1)]">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white transition-colors duration-300">
          Core <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Preferences</span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed transition-colors duration-300">
          Configure native environment directories, system-wide themes, and local storage pipeline caching limits.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 w-full">
        {/* Settings Card */}
        <div className="w-full bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-3xl shadow-xl p-3 md:p-6 transition-all duration-300 text-left">
          <div className="flex flex-col gap-6 py-4">
            <form onSubmit={handleSave} className="flex flex-col gap-6">
              {/* Directory Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Folder className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Storage Directory Path
                  </span>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-grow w-full">
                    <div className="flex flex-col gap-2">
                      <label className="text-zinc-500 dark:text-zinc-400 font-medium text-xs uppercase">Download Folder Destination</label>
                      <input
                        type="text"
                        placeholder="e.g. /home/user/Downloads"
                        value={tempPath}
                        onChange={(e) => setTempPath(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/5 rounded-2xl focus-within:border-blue-500 transition-colors duration-300 outline-none text-sm text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 px-5 py-4 rounded-2xl transition-all duration-300 flex-shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
                
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed pl-1">
                  Default: resolved from Tauri path API. Used as destination folder for yt-dlp extractions.
                </p>
              </div>

              {/* Theme Selector Section */}
              <div className="flex flex-col gap-3 pt-2 border-t border-zinc-200 dark:border-white/5">
                <div className="flex items-center gap-2 text-zinc-500">
                  {theme === "dark" ? <Moon className="w-4 h-4 text-purple-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    System Visual Theme
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-zinc-100/50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Dark Mode Active
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Toggle dark theme skin for all routes
                    </span>
                  </div>
                  
                  <Switch.Root
                    checked={theme === "dark"}
                    onCheckedChange={toggleTheme}
                    className="w-[42px] h-[24px] bg-zinc-200 dark:bg-zinc-800 data-[state=checked]:bg-blue-500 rounded-full relative outline-none cursor-default shadow-inner transition-colors"
                  >
                    <Switch.Thumb className="block w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform translate-x-[3px] data-[state=checked]:translate-x-[21px]" />
                  </Switch.Root>
                </div>
              </div>

              {/* Success Notification Alert */}
              {savedSuccess && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl select-none animate-fade-in">
                  <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>Preferences successfully saved in local storage.</span>
                </div>
              )}

              {/* Save Button Row */}
              <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-white/5">
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-indigo-500/20 px-8 py-4 rounded-2xl transition-all duration-300"
                >
                  <Save className="w-4 h-4" />
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
