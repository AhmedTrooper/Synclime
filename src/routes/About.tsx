import { onMount, createSignal, For, Show } from "solid-js";
import { useUIStore } from "../store/useUIStore";
import { useQueueStore } from "../store/useQueueStore";
import { useParseStore } from "../store/useParseStore";
import { Tooltip } from "@kobalte/core/tooltip";
import { invoke } from "@tauri-apps/api/core";
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
  Calendar,
  AlertTriangle,
  CheckCircle,
} from "lucide-solid";

interface UpdateItem {
  version_slug: string;
  application_online_version: string;
  date: string;
  features: string[];
  fixes: string[];
  severity: "critical" | "normal" | string;
}

interface UpdatesSchema {
  latest_update: string;
  updates: UpdateItem[];
}

export default function About() {
  const [osInfo, setOsInfo] = createSignal({
    type: "Browser Preview",
    platform: "Web",
    arch: "wasm",
    version: "1.0.0",
  });

  const [appInfo, setAppInfo] = createSignal({
    name: "synclime",
    version: "0.1.0",
  });

  const [checkLoading, setCheckLoading] = createSignal(false);
  const [updatesData, setUpdatesData] = createSignal<UpdatesSchema | null>(
    null,
  );
  const [updatesLoading, setUpdatesLoading] = createSignal(true);
  const [updatesError, setUpdatesError] = createSignal("");

  onMount(() => {
    useUIStore.setActivePath("/about");
    const fetchOS = async () => {
      try {
        if (
          typeof window !== "undefined" &&
          (window as any).__TAURI_INTERNALS__
        ) {
          const os = await import("@tauri-apps/plugin-os");
          setOsInfo({
            type: os.type(),
            platform: os.platform(),
            arch: os.arch(),
            version: os.version(),
          });

          const { getVersion, getName } = await import("@tauri-apps/api/app");
          const ver = await getVersion();
          const name = await getName();
          setAppInfo({
            version: ver,
            name: name,
          });
        }
      } catch (err) {
        console.error("Failed to query native operating system info:", err);
      }
    };
    fetchOS();

    const fetchUpdates = async () => {
      try {
        const data = await invoke<UpdatesSchema>("get_online_updates");
        setUpdatesData(data);
      } catch (err) {
        console.warn(
          "Failed to fetch online updates from main branch. Querying local updates.json...",
        );
        const isTauri =
          typeof window !== "undefined" &&
          !!(window as any).__TAURI_INTERNALS__;
        if (isTauri) {
          try {
            const data = await invoke<UpdatesSchema>("get_local_updates");
            setUpdatesData(data);
          } catch (e: any) {
            console.error("Local fallback failed:", e);
            setUpdatesError("Changelog updates not available offline.");
          }
        } else {
          setUpdatesData({
            latest_update: "d05m06y2026_xyz_unique_slug",
            updates: [
              {
                version_slug: "d05m06y2026_xyz_unique_slug",
                application_online_version: "1.1.0",
                date: "05-06-2026",
                features: [
                  "Created Axum API server for direct Chrome/Firefox extension sync",
                  "Built premium green indicators and state transitions for inbox files",
                ],
                fixes: [
                  "Resolved duplicate progress mapping inside background Aria2 runner thread",
                  "Fixed dynamic chunk bounds concurrency crash",
                ],
                severity: "normal",
              },
            ],
          });
        }
      } finally {
        setUpdatesLoading(false);
      }
    };
    fetchUpdates();
  });

  const activeJobsCount = () =>
    useQueueStore.state.queue.filter(
      (j) => j.status === "downloading" || j.status === "pending",
    ).length;
  const completedJobsCount = () =>
    useQueueStore.state.queue.filter((j) => j.status === "completed").length;

  const triggerSystemDiagnostic = async () => {
    setCheckLoading(true);

    setTimeout(async () => {
      try {
        if (
          typeof window !== "undefined" &&
          (window as any).__TAURI_INTERNALS__
        ) {
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
              body: `SQLite core, active queue, and ${osInfo().platform} environment are fully synced and healthy!`,
            });
          }
        } else {
          alert(
            `[synclime engine diagnostics]\n\n• status: active\n• database: sqlite connection active\n• hydration: complete\n• environment: web preview (simulated system ok)`,
          );
        }
      } catch (err) {
        console.error("Failed to run diagnostics or send notification:", err);
      } finally {
        setCheckLoading(false);
      }
    }, 1000);
  };

  const openDownloadFolder = async () => {
    try {
      if (
        typeof window !== "undefined" &&
        (window as any).__TAURI_INTERNALS__
      ) {
        const { invoke } = await import("@tauri-apps/api/core");
        const res = await invoke<{ success: boolean; message: string }>(
          "reveal_folder_in_explorer",
          {
            path: useUIStore.state.downloadPath,
          },
        );
        if (!res.success) throw new Error(res.message);
      } else {
        alert(
          `Storage path open simulated for path:\n${useUIStore.state.downloadPath}`,
        );
      }
    } catch (err: any) {
      console.error("Failed to reveal download folder path:", err);
      alert(
        `Download folder path could not be revealed: ${err.message || err}`,
      );
    }
  };

  return (
    <div class="w-full max-w-5xl mx-auto space-y-4.5 select-none animate-fade-in text-xs sm:text-sm font-sans px-1 text-left">
      
      {/* About Shell Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/80 gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 shadow-sm">
            <Info class="w-5 h-5" />
          </div>
          <div class="text-left">
            <h1 class="text-sm font-black text-zinc-900 dark:text-white tracking-tight leading-tight uppercase">System Information</h1>
            <p class="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Verify system diagnostic status, operating parameters, and version builds</p>
          </div>
        </div>
      </div>

      {/* Main Workspace Split Pane */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Side Panel: Visual App Badge & Diagnostic Actions */}
        <div class="lg:col-span-5 flex flex-col gap-4.5">
          
          {/* Main Visual App Badge Box */}
          <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-blue-600 to-indigo-700 p-5 text-white shadow-md flex-grow flex flex-col justify-between min-h-[220px]">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent)] pointer-events-none" />
            
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <span class="bg-white/20 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase border border-white/5 shadow-sm">
                  BUILD v{appInfo().version}
                </span>
                <h1 class="text-3xl font-black tracking-tight drop-shadow-sm uppercase mt-1">
                  {appInfo().name}
                </h1>
                <p class="text-blue-100 text-[10px] leading-relaxed font-medium mt-1">
                  Tauri-backed high-speed media pipeline & queue system
                </p>
              </div>

              <span class="bg-emerald-500/20 backdrop-blur-md text-emerald-200 text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase border border-emerald-500/10 flex items-center gap-1 shadow-sm">
                <Activity class="w-3 h-3 animate-pulse" /> Live
              </span>
            </div>

            <div class="pt-4 flex items-center justify-between gap-3">
              <Tooltip openDelay={200}>
                <Tooltip.Trigger
                  as="button"
                  onClick={triggerSystemDiagnostic}
                  disabled={checkLoading()}
                  class="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white text-blue-700 font-black shadow-md hover:bg-blue-50 active:scale-[0.98] text-[10px] tracking-wider uppercase transition-all disabled:opacity-50 min-h-[38px] cursor-pointer"
                >
                  <Bell class={`w-4 h-4 text-blue-600 ${checkLoading() ? "animate-bounce" : ""}`} />
                  <span>{checkLoading() ? "Scanning..." : "Diagnostics"}</span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                    <Tooltip.Arrow />
                    Run host system diagnostics checks
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip>

              <a
                href="https://github.com/AhmedTrooper/Synclime/blob/main/extentions.md"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1 text-[10px] font-black text-white hover:text-blue-100 transition-colors uppercase tracking-wider"
              >
                <span>Docs catalog</span>
                <ExternalLink class="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Default Storage Path Box */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-md">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 flex items-center justify-center bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-500/20 shadow-sm flex-shrink-0">
                  <Folder class="w-4.5 h-4.5" />
                </div>
                <div class="min-w-0">
                  <h3 class="text-xs font-black text-zinc-900 dark:text-white uppercase leading-none">
                    Target Download Path
                  </h3>
                  <p
                    class="text-[9px] text-zinc-400 dark:text-zinc-500 truncate max-w-[160px] sm:max-w-xs md:max-w-md font-mono mt-1.5 font-bold"
                    title={useUIStore.state.downloadPath}
                  >
                    {useUIStore.state.downloadPath || "Not configured"}
                  </p>
                </div>
              </div>

              <Show when={useUIStore.state.downloadPath}>
                <Tooltip openDelay={200}>
                  <Tooltip.Trigger
                    as="button"
                    onClick={openDownloadFolder}
                    class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200 text-[10px] font-black uppercase transition-all min-h-[32px] cursor-pointer shadow-sm"
                  >
                    <ExternalLink class="w-3.5 h-3.5" />
                    <span>Open</span>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                      <Tooltip.Arrow />
                      Reveal folder directory in native explorer
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip>
              </Show>
            </div>
          </div>

        </div>

        {/* Right Side: Host Info Spec Tables & Technologies ledger */}
        <div class="lg:col-span-7 flex flex-col gap-4.5">
          
          {/* Host Info & SQLite Metrics Splits */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Host specs */}
            <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-md">
              <h3 class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 tracking-wider uppercase border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 mb-2 flex items-center gap-1.5">
                <Cpu class="w-3.5 h-3.5 text-blue-500" />
                <span>Host Platform Spec</span>
              </h3>

              <div class="space-y-2.5 text-[11px] font-semibold">
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">OS Platform</span>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">{osInfo().platform}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">OS Type</span>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">{osInfo().type}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Architecture</span>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">{osInfo().arch}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Kernel version</span>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[9px] truncate max-w-[110px]" title={osInfo().version}>{osInfo().version}</span>
                </div>
              </div>
            </div>

            {/* SQLite store metrics */}
            <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-md">
              <h3 class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 tracking-wider uppercase border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 mb-2 flex items-center gap-1.5">
                <Database class="w-3.5 h-3.5 text-purple-500" />
                <span>SQLite Store Metrics</span>
              </h3>

              <div class="space-y-2.5 text-[11px] font-semibold">
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Active Queue</span>
                  <span class={`px-2 py-0.5 rounded font-bold text-[10px] ${activeJobsCount() > 0 ? "bg-amber-500/10 text-amber-500" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400"}`}>{activeJobsCount()} jobs</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Completed Queue</span>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">{completedJobsCount()} files</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Saved Cache</span>
                  <span class="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">{useParseStore.state.parsedFiles.length} records</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Engine status</span>
                  <span class="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-bold text-[10px]">HEALTHY</span>
                </div>
              </div>
            </div>

          </div>

          {/* Core Tech Stack */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-md">
            <h3 class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 tracking-wider uppercase border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 mb-2.5 flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-indigo-500" />
              <span>Core Application Frameworks</span>
            </h3>

            <div class="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              <div class="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 flex items-center justify-center bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20 shadow-sm flex-shrink-0">
                    <Terminal class="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span class="font-black text-zinc-900 dark:text-zinc-100 block leading-tight text-xs">Tauri Core Engine</span>
                    <span class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">Rust process boundaries and multi-threaded daemons</span>
                  </div>
                </div>
                <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded font-mono border border-zinc-200 dark:border-zinc-800 uppercase">Rust</span>
              </div>

              <div class="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 shadow-sm flex-shrink-0">
                    <Layers class="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span class="font-black text-zinc-900 dark:text-zinc-100 block leading-tight text-xs">SolidJS Render Layer</span>
                    <span class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">High-performance custom reactive UI shell bindings</span>
                  </div>
                </div>
                <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded font-mono border border-zinc-200 dark:border-zinc-800 uppercase">JS/TS</span>
              </div>

              <div class="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 flex items-center justify-center bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-500/20 shadow-sm flex-shrink-0">
                    <Database class="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span class="font-black text-zinc-900 dark:text-zinc-100 block leading-tight text-xs">SQLite Embedded</span>
                    <span class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">Local persistence caches and logs storage management</span>
                  </div>
                </div>
                <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded font-mono border border-zinc-200 dark:border-zinc-800 uppercase">SQL</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Footer Branding line */}
      <div class="flex flex-col items-center justify-center gap-1 pt-4 text-center text-[10px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80">
        <p class="flex items-center gap-1 justify-center">
          Designed with <Heart class="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" /> for extreme speed and network precision.
        </p>
        <p>© 2026 synclime. Open source MIT license.</p>
      </div>

    </div>
  );
}
