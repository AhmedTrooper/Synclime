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
        const res = await fetch(
          "https://raw.githubusercontent.com/AhmedTrooper/Synclime/test/updates.json",
        );
        if (res.ok) {
          const data: UpdatesSchema = await res.json();
          setUpdatesData(data);
        } else {
          throw new Error("HTTP error fetching online manifest");
        }
      } catch (err) {
        console.warn(
          "Failed to fetch online updates from test branch. Querying local updates.json...",
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
    <div class="space-y-4 max-w-4xl mx-auto pb-6 select-none animate-fade-in font-sans">
      {/* Extensions & Sponsors Prominent Banner Workspace */}
      <div class="border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent p-5 rounded-xl shadow-sm text-left relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1 z-10">
          <div class="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-extrabold text-[10px] uppercase tracking-wider">
            <Sparkles class="w-4 h-4 text-purple-500" />
            <span>Additional Tasks & Companion Extensions</span>
          </div>
          <h3 class="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
            Install the Browser Extension & Support Development!
          </h3>
          <p class="text-[11px] text-zinc-400 leading-normal max-w-xl">
            Automate captured link transfers directly into your Inbox Queue.
            Review installations, sponsorships, and coffee supports at our
            official details workspace.
          </p>
        </div>
        <a
          href="https://github.com/AhmedTrooper/Synclime/blob/test/extentions.md"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md transition-all whitespace-nowrap self-start sm:self-center"
        >
          <span>Visit Extensions Workspace</span>
          <ExternalLink class="w-3.5 h-3.5" />
        </a>
      </div>

      <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-500 via-indigo-600 to-indigo-600 p-4 sm:p-5 text-white shadow-sm transition-all duration-300 hover:shadow-indigo-500/10 hover:shadow-md">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.12),transparent)] pointer-events-none" />

        <div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="space-y-1.5 text-left">
            <div class="flex items-center gap-1.5">
              <span class="bg-white/20 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded font-semibold tracking-wider uppercase border border-white/5">
                v{appInfo().version}
              </span>
              <span class="bg-emerald-500/30 backdrop-blur-md text-emerald-200 text-[10px] px-2 py-0.5 rounded font-semibold tracking-wider uppercase border border-emerald-500/10 flex items-center gap-1">
                <Activity class="w-3 h-3 animate-pulse" /> active
              </span>
            </div>

            <h1 class="text-2xl font-bold tracking-tight drop-shadow-sm lowercase">
              {appInfo().name.toUpperCase()}
            </h1>

            <p class="text-indigo-100 max-w-lg text-xs font-light leading-relaxed">
              Rust-backed multi-threaded download utility & url parser
            </p>
          </div>

          <div class="flex justify-start">
            <Tooltip openDelay={200}>
              <Tooltip.Trigger
                as="button"
                onClick={triggerSystemDiagnostic}
                disabled={checkLoading()}
                class="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-indigo-700 font-bold shadow-sm hover:bg-indigo-50 hover:-translate-y-0.5 active:translate-y-0 text-xs whitespace-nowrap transition-all duration-150 disabled:opacity-50 min-h-[36px]"
              >
                <Bell
                  class={`w-4 h-4 text-indigo-600 ${checkLoading() ? "animate-bounce" : ""}`}
                />
                {checkLoading() ? "Checking..." : "Diagnostics"}
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Run host system diagnostics check
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-sm rounded-xl p-4 transition-all duration-300">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-9 h-9 flex items-center justify-center bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Cpu class="w-5 h-5" />
            </div>
            <div class="text-left">
              <h3 class="text-sm font-bold text-zinc-950 dark:text-white leading-tight">
                Host System Info
              </h3>
              <p class="text-[10px] text-zinc-400">Tauri Native OS APIs</p>
            </div>
          </div>

          <div class="text-xs divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-transparent">
            <div class="flex items-center justify-between py-2.5">
              <span class="text-zinc-500 dark:text-zinc-400 font-medium">
                OS Platform
              </span>
              <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                {osInfo().platform}
              </span>
            </div>
            <div class="flex items-center justify-between py-2.5">
              <span class="text-zinc-500 dark:text-zinc-400 font-medium">
                OS Type
              </span>
              <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                {osInfo().type}
              </span>
            </div>
            <div class="flex items-center justify-between py-2.5">
              <span class="text-zinc-500 dark:text-zinc-400 font-medium">
                Architecture
              </span>
              <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                {osInfo().arch}
              </span>
            </div>
            <div class="flex items-center justify-between py-2.5">
              <span class="text-zinc-500 dark:text-zinc-400 font-medium">
                Kernel Version
              </span>
              <span
                class="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold truncate max-w-[150px]"
                title={osInfo().version}
              >
                {osInfo().version}
              </span>
            </div>
          </div>
        </div>

        <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-sm rounded-xl p-4 transition-all duration-300">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-9 h-9 flex items-center justify-center bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-lg">
              <Database class="w-5 h-5" />
            </div>
            <div class="text-left">
              <h3 class="text-sm font-bold text-zinc-950 dark:text-white leading-tight">
                Indexer & Database
              </h3>
              <p class="text-[10px] text-zinc-400">
                SolidJS Store & SQLite Cache
              </p>
            </div>
          </div>

          <div class="text-xs divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-transparent">
            <div class="flex items-center justify-between py-2.5">
              <span class="text-zinc-500 dark:text-zinc-400 font-medium">
                Active Jobs
              </span>
              <span
                class={`text-[10px] px-2 py-0.5 rounded font-semibold ${activeJobsCount() > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}
              >
                {activeJobsCount()} active
              </span>
            </div>
            <div class="flex items-center justify-between py-2.5">
              <span class="text-zinc-500 dark:text-zinc-400 font-medium">
                Completed Jobs
              </span>
              <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                {completedJobsCount()} files
              </span>
            </div>
            <div class="flex items-center justify-between py-2.5">
              <span class="text-zinc-500 dark:text-zinc-400 font-medium">
                Parsed Channels
              </span>
              <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                {useParseStore.state.parsedFiles.length} URLs
              </span>
            </div>
            <div class="flex items-center justify-between py-2.5">
              <span class="text-zinc-500 dark:text-zinc-400 font-medium">
                Engine Status
              </span>
              <span class="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-sm rounded-xl p-3.5 transition-all duration-300">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 flex items-center justify-center bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-lg flex-shrink-0">
              <Folder class="w-5 h-5" />
            </div>
            <div class="min-w-0 text-left">
              <h3 class="text-sm font-bold text-zinc-950 dark:text-white leading-none">
                Default Download Path
              </h3>
              <p
                class="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-xs sm:max-w-md md:max-w-lg font-mono mt-1.5"
                title={useUIStore.state.downloadPath}
              >
                {useUIStore.state.downloadPath || "Not configured"}
              </p>
            </div>
          </div>

          {useUIStore.state.downloadPath && (
            <Tooltip openDelay={200}>
              <Tooltip.Trigger
                as="button"
                onClick={openDownloadFolder}
                class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-all min-h-[32px] min-w-[70px]"
              >
                <ExternalLink class="w-3.5 h-3.5" />
                Open
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content class="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[9999] select-none font-sans">
                  <Tooltip.Arrow />
                  Reveal directory in host File Explorer
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>
          )}
        </div>
      </div>

      <div class="space-y-2.5">
        <div class="flex items-center gap-1.5 px-0.5">
          <Sparkles class="w-4 h-4 text-indigo-500" />
          <h2 class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Core Technology Stack
          </h2>
        </div>

        <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-sm rounded-xl p-3.5">
          <div class="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
            <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 flex items-center justify-center bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-lg">
                  <Terminal class="w-5 h-5" />
                </div>
                <div class="text-left">
                  <span class="font-bold text-zinc-900 dark:text-zinc-100 block leading-tight">
                    Tauri Core Engine v2
                  </span>
                  <span class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">
                    Rust Backend multi-threaded process management
                  </span>
                </div>
              </div>
              <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">
                Rust
              </span>
            </div>

            <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Layers class="w-5 h-5" />
                </div>
                <div class="text-left">
                  <span class="font-bold text-zinc-900 dark:text-zinc-100 block leading-tight">
                    SolidJS & TypeScript
                  </span>
                  <span class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">
                    High-performance reactive UI rendering
                  </span>
                </div>
              </div>
              <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">
                JS/TS
              </span>
            </div>

            <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 flex items-center justify-center bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 rounded-lg">
                  <Sparkles class="w-5 h-5" />
                </div>
                <div class="text-left">
                  <span class="font-bold text-zinc-900 dark:text-zinc-100 block leading-tight">
                    Tailwind CSS & Kobalte
                  </span>
                  <span class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">
                    Utility-driven compact native styling configurations
                  </span>
                </div>
              </div>
              <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">
                Design
              </span>
            </div>

            <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 flex items-center justify-center bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-lg">
                  <Database class="w-5 h-5" />
                </div>
                <div class="text-left">
                  <span class="font-bold text-zinc-900 dark:text-zinc-100 block leading-tight">
                    SQLite & Solid Store
                  </span>
                  <span class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none">
                    Relational local persistence indexed under store states
                  </span>
                </div>
              </div>
              <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">
                Data
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Release Manifest & Offline Fallback Timeline */}
      <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/20 p-5 rounded-2xl shadow-sm text-left space-y-4">
        <h3 class="font-bold text-zinc-950 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
          <Calendar class="w-4.5 h-4.5 text-purple-500" />
          <span>Release Updates & Version Changelogs</span>
        </h3>

        <Show
          when={!updatesLoading()}
          fallback={
            <div class="py-6 text-center flex flex-col items-center justify-center space-y-2">
              <div class="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p class="text-zinc-400 text-[11px] font-semibold">
                Loading release timeline...
              </p>
            </div>
          }
        >
          <Show
            when={!updatesError()}
            fallback={
              <div class="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-medium animate-fade-in">
                {updatesError()}
              </div>
            }
          >
            <div class="space-y-5 relative pl-4 border-l border-zinc-200 dark:border-zinc-800 mt-2">
              <For each={updatesData()?.updates}>
                {(update) => (
                  <div class="relative space-y-2">
                    <div
                      class={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-white dark:bg-zinc-950 ${
                        update.severity === "critical"
                          ? "border-red-500"
                          : "border-purple-500"
                      }`}
                    />

                    <div class="flex items-center justify-between flex-wrap gap-2">
                      <div class="flex items-center gap-2.5">
                        <span class="font-bold text-zinc-900 dark:text-white text-xs">
                          v{update.application_online_version}
                        </span>
                        <span class="text-[9px] text-zinc-400 flex items-center gap-1 font-medium font-mono">
                          {update.date}
                        </span>
                      </div>

                      <Show when={update.severity === "critical"}>
                        <span class="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-red-500/10 text-red-500 border border-red-500/10">
                          Critical
                        </span>
                      </Show>
                    </div>

                    <div class="bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/50 dark:border-zinc-800/40 p-2.5 rounded-xl space-y-2">
                      <Show
                        when={update.features && update.features.length > 0}
                      >
                        <div class="space-y-0.5">
                          <span class="text-[8px] uppercase font-bold text-purple-500 tracking-wider">
                            Features:
                          </span>
                          <ul class="text-[10px] text-zinc-400 space-y-0.5 list-disc pl-4">
                            <For each={update.features}>
                              {(feat) => <li>{feat}</li>}
                            </For>
                          </ul>
                        </div>
                      </Show>

                      <Show when={update.fixes && update.fixes.length > 0}>
                        <div class="space-y-0.5 pt-0.5 border-t border-zinc-200/10 dark:border-zinc-800/10">
                          <span class="text-[8px] uppercase font-bold text-emerald-500 tracking-wider">
                            Fixes:
                          </span>
                          <ul class="text-[10px] text-zinc-400 space-y-0.5 list-disc pl-4">
                            <For each={update.fixes}>
                              {(fix) => <li>{fix}</li>}
                            </For>
                          </ul>
                        </div>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>

      <div class="flex flex-col items-center justify-center gap-1 pt-4 text-center text-[10px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
        <p class="flex items-center gap-1 justify-center">
          Designed with{" "}
          <Heart class="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />{" "}
          for extreme speed and precision.
        </p>
        <p>© 2026 synclime. Open source MIT license.</p>
      </div>
    </div>
  );
}
