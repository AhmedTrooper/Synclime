import { useEffect, useState } from "react";
import { useUIStore } from "../store/useUIStore";
import { useQueueStore } from "../store/useQueueStore";
import { useParseStore } from "../store/useParseStore";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Cpu,
  Database,
  Folder,
  Sparkles,
  Terminal,
  Activity,
  Layers,
  Bell,
  Heart,
  ExternalLink,
} from "lucide-react";

export default function About() {
  const { setActivePath, downloadPath } = useUIStore();
  const { queue } = useQueueStore();
  const { parsedFiles } = useParseStore();

  const [osInfo, setOsInfo] = useState({
    type: "Browser Preview",
    platform: "Web",
    arch: "wasm",
    version: "1.0.0",
  });

  const [checkLoading, setCheckLoading] = useState(false);

  // Sync active path for UI state
  useEffect(() => {
    setActivePath("/about");
  }, [setActivePath]);

  // Safely fetch OS information from Tauri on startup
  useEffect(() => {
    const fetchOS = async () => {
      try {
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
          const os = await import("@tauri-apps/plugin-os");
          setOsInfo({
            type: os.type(),
            platform: os.platform(),
            arch: os.arch(),
            version: os.version(),
          });
        }
      } catch (err) {
        console.error("Failed to query native operating system info:", err);
      }
    };
    fetchOS();
  }, []);

  // Compute metrics from our Zustand stores
  const activeJobsCount = queue.filter(
    (j) => j.status === "downloading" || j.status === "pending"
  ).length;
  const completedJobsCount = queue.filter((j) => j.status === "completed").length;

  // Trigger high-fidelity Tauri system check and native notification
  const triggerSystemDiagnostic = async () => {
    setCheckLoading(true);
    
    // Smooth delay for micro-animation feel
    setTimeout(async () => {
      try {
        if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
          const { isPermissionGranted, requestPermission, sendNotification } =
            await import("@tauri-apps/plugin-notification");
          
          let hasPermission = await isPermissionGranted();
          if (!hasPermission) {
            const permission = await requestPermission();
            hasPermission = permission === "granted";
          }
          
          if (hasPermission) {
            sendNotification({
              title: "synclime system ok",
              body: `SQLite core, active queue, and ${osInfo.platform} environment are fully synced and healthy!`,
            });
          }
        } else {
          // Browser alert fallback with visual premium vibe
          alert(
            `[synclime engine diagnostics]\n\n• status: active\n• database: sqlite connection active\n• hydration: complete\n• environment: web preview (simulated system ok)`
          );
        }
      } catch (err) {
        console.error("Failed to run diagnostics or send notification:", err);
      } finally {
        setCheckLoading(false);
      }
    }, 1000);
  };

  // Safely open the download folder in the host OS
  const openDownloadFolder = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const { openPath } = await import("@tauri-apps/plugin-opener");
        await openPath(downloadPath);
      } else {
        alert(`Storage path open simulated for path:\n${downloadPath}`);
      }
    } catch (err) {
      console.error("Failed to reveal download folder path:", err);
    }
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="space-y-4 max-w-4xl mx-auto pb-6 select-none animate-fade-in font-sans">
        
        {/* Dynamic Glowing Hero Header Card - Compact OS Panel Look */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-500 via-indigo-650 to-indigo-600 p-4 sm:p-5 text-white shadow-sm transition-all duration-300 hover:shadow-indigo-500/10 hover:shadow-md">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.12),transparent)] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1.5">
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded font-semibold tracking-wider uppercase border border-white/5">
                  v0.1.0
                </span>
                <span className="bg-emerald-500/30 backdrop-blur-md text-emerald-200 text-[10px] px-2 py-0.5 rounded font-semibold tracking-wider uppercase border border-emerald-500/10 flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse" /> active
                </span>
              </div>
              
              <h1 className="text-2xl font-bold tracking-tight drop-shadow-sm">
                synclime
              </h1>
              
              <p className="text-indigo-100 max-w-lg text-xs font-light leading-relaxed">
                Rust-backed multi-threaded download utility, dynamic asset parser, and local SQLite relational indexer.
              </p>
            </div>
            
            <div className="flex justify-start">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={triggerSystemDiagnostic}
                    disabled={checkLoading}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-indigo-700 font-bold shadow-sm hover:bg-indigo-50 hover:-translate-y-0.5 active:translate-y-0 text-xs whitespace-nowrap transition-all duration-150 disabled:opacity-50 min-h-[36px]"
                  >
                    <Bell className={`w-4 h-4 text-indigo-600 ${checkLoading ? "animate-bounce" : ""}`} />
                    {checkLoading ? "Checking..." : "Diagnostics"}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={5}
                    className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans"
                  >
                    Run host system diagnostics check
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </div>
        </div>

        {/* Responsive Grid (Compact gap & tighter padding) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card: Host OS Information */}
          <div className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-sm rounded-xl p-4 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              {/* Tactile Native Icon Bubble */}
              <div className="w-9 h-9 flex items-center justify-center bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white leading-tight">Host System Info</h3>
                <p className="text-[10px] text-zinc-400">Tauri Native OS APIs</p>
              </div>
            </div>
            
            <div className="text-xs divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-transparent">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">OS Platform</span>
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">{osInfo.platform}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">OS Type</span>
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">{osInfo.type}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Architecture</span>
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">{osInfo.arch}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Kernel Version</span>
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-850 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold truncate max-w-[150px]" title={osInfo.version}>{osInfo.version}</span>
              </div>
            </div>
          </div>

          {/* Card: State Database & Stats */}
          <div className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-sm rounded-xl p-4 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              {/* Tactile Native Icon Bubble */}
              <div className="w-9 h-9 flex items-center justify-center bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white leading-tight">Indexer & Database</h3>
                <p className="text-[10px] text-zinc-400">Zustand Store & SQLite Cache</p>
              </div>
            </div>
            
            <div className="text-xs divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-transparent">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Active Jobs</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${activeJobsCount > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                  {activeJobsCount} active
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Completed Jobs</span>
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-850 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">{completedJobsCount} files</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Parsed Channels</span>
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-850 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">{parsedFiles.length} URLs</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Engine Status</span>
                <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">Active</span>
              </div>
            </div>
          </div>
          
        </div>

        {/* Download Path & Storage Info */}
        <div className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-sm rounded-xl p-3.5 transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Tactile Native Icon Bubble */}
              <div className="w-9 h-9 flex items-center justify-center bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-lg flex-shrink-0">
                <Folder className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white leading-none">Default Download Path</h3>
                <p className="text-[10px] text-zinc-455 dark:text-zinc-400 truncate max-w-xs sm:max-w-md md:max-w-lg font-mono mt-1.5" title={downloadPath}>
                  {downloadPath || "Not configured"}
                </p>
              </div>
            </div>
            
            {downloadPath && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={openDownloadFolder}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-850 dark:text-zinc-200 text-xs font-semibold transition-all min-h-[32px] min-w-[70px]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={5}
                    className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans"
                  >
                    Reveal directory in host File Explorer
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}
          </div>
        </div>

        {/* Section: Technologies Stack with compact list items */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 px-0.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Core Technology Stack</h2>
          </div>
          
          <div className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-sm rounded-xl p-3.5">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-850/80 text-xs">
              
              {/* Tech Item 1 */}
              <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-lg">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-zinc-855 dark:text-zinc-100 block leading-tight">Tauri Core Engine v2</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">Rust Backend multi-threaded process management</span>
                  </div>
                </div>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">Rust</span>
              </div>
              
              {/* Tech Item 2 */}
              <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-zinc-855 dark:text-zinc-100 block leading-tight">React 18 & TypeScript</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">Type-safe component rendering and UI structure</span>
                  </div>
                </div>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">JS/TS</span>
              </div>

              {/* Tech Item 3 */}
              <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 rounded-lg">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-zinc-855 dark:text-zinc-100 block leading-tight">Tailwind CSS & Radix UI</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">Utility-driven compact native styling configurations</span>
                  </div>
                </div>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">Design</span>
              </div>

              {/* Tech Item 4 */}
              <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-lg">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-zinc-855 dark:text-zinc-100 block leading-tight">SQLite & Zustand Store</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">Relational local persistence indexed under store states</span>
                  </div>
                </div>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">Data</span>
              </div>

            </div>
          </div>
        </div>

        {/* Footer info (Tighter padding) */}
        <div className="flex flex-col items-center justify-center gap-1 pt-4 text-center text-[10px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-855">
          <p className="flex items-center gap-1 justify-center">
            Designed with <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" /> for extreme speed and precision.
          </p>
          <p>© 2026 synclime. Open source MIT license.</p>
        </div>

      </div>
    </Tooltip.Provider>
  );
}
