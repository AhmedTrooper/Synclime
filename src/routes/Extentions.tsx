import { onMount, createSignal, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { useUIStore } from "../store/useUIStore";
import { 
  Sparkles, 
  ExternalLink, 
  Coffee, 
  Layers, 
  Terminal, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Calendar,
  Gift
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

export default function Extentions() {
  const [currentVersion, setCurrentVersion] = createSignal("0.1.0");
  const [updatesData, setUpdatesData] = createSignal<UpdatesSchema | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [errorMsg, setErrorMsg] = createSignal("");
  const [isLatestVersion, setIsLatestVersion] = createSignal(true);
  const [latestVersionNum, setLatestVersionNum] = createSignal("0.1.0");

  onMount(() => {
    useUIStore.setActivePath("/extentions");
    
    const initializeData = async () => {
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      
      // Get current local version
      if (isTauri) {
        try {
          const { getVersion } = await import("@tauri-apps/api/app");
          const ver = await getVersion();
          setCurrentVersion(ver);
        } catch (e) {
          console.error("Failed to query app version:", e);
        }
      }

      try {
        const data = await invoke<UpdatesSchema>("get_online_updates");
        setUpdatesData(data);
        compareVersions(data);
      } catch (err) {
        console.warn("Offline or blocked: Failed to fetch live updates from GitHub. Falling back to local updates.json...");
        
        // Local fallback
        if (isTauri) {
          try {
            const data = await invoke<UpdatesSchema>("get_local_updates");
            setUpdatesData(data);
            compareVersions(data);
          } catch (e: any) {
            console.error("Failed to load local updates.json:", e);
            setErrorMsg("Could not load updates changelog details.");
          }
        } else {
          // Web mockup
          const mockData: UpdatesSchema = {
            latest_update: "d05m06y2026_xyz_unique_slug",
            updates: [
              {
                version_slug: "d05m06y2026_xyz_unique_slug",
                application_online_version: "1.1.0",
                date: "05-06-2026",
                features: ["Created Axum API server for direct Chrome/Firefox extension sync", "Built premium green indicators and state transitions for inbox files"],
                fixes: ["Resolved duplicate progress mapping inside background Aria2 runner thread", "Fixed dynamic chunk bounds concurrency crash"],
                severity: "normal"
              },
              {
                version_slug: "d23m05y2026_first_stable",
                application_online_version: "1.0.0",
                date: "23-05-2026",
                features: ["Integrated yt-dlp core media extractor pipelines", "Created SQLite db integration with concurrency queue schedulers"],
                fixes: ["Initial platform bootstrap launch version complete"],
                severity: "critical"
              }
            ]
          };
          setUpdatesData(mockData);
          compareVersions(mockData);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  });

  const compareVersions = (data: UpdatesSchema) => {
    if (!data.updates || data.updates.length === 0) return;
    
    const latest = data.updates[0];
    setLatestVersionNum(latest.application_online_version);

    // simple check
    const current = currentVersion();
    const online = latest.application_online_version;
    
    // If online version is higher, mark isLatest as false
    if (online !== current) {
      setIsLatestVersion(false);
    } else {
      setIsLatestVersion(true);
    }
  };

  const handleOpenGithub = async () => {
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
    const url = "https://github.com/AhmedTrooper/Synclime/blob/main/extentions.md";
    
    if (isTauri) {
      try {
        const { open } = await import("@tauri-apps/plugin-opener");
        await open(url);
      } catch (err) {
        window.open(url, "_blank");
      }
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div class="space-y-5 max-w-4xl mx-auto py-2 select-none animate-fade-in text-xs sm:text-sm font-sans text-left">
      
      {/* Header */}
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex items-center justify-center bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-lg shadow-sm">
            <Layers class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-base font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">
              Extensions & Updates Hub
            </h1>
            <p class="text-[10px] text-zinc-400">Install web browser companion tools, support development, and track updates</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        
        {/* Left Side: Extensions & Sponsors */}
        <div class="md:col-span-5 space-y-4">
          <div 
            onClick={handleOpenGithub}
            class="group border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/40 dark:to-zinc-900/10 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all duration-300 cursor-pointer text-left space-y-4 relative overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div class="absolute -right-12 -top-12 w-28 h-28 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            
            <div class="flex items-center justify-between">
              <div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles class="w-4.5 h-4.5" />
              </div>
              <ExternalLink class="w-4 h-4 text-zinc-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div class="space-y-1.5">
              <h3 class="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                Browser Extensions & Sponsorships
              </h3>
              <p class="text-[11px] text-zinc-400 leading-relaxed">
                Unlock automated link captures with our Chrome/Firefox integration, support the project development, or buy the creators a hot coffee!
              </p>
            </div>

            <div class="pt-2 flex items-center gap-2 text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              <span>View details in github</span>
              <span class="text-zinc-300 dark:text-zinc-700">|</span>
              <span class="flex items-center gap-1"><Coffee class="w-3.5 h-3.5" /> support us</span>
            </div>
          </div>

          {/* Quick instructions Card */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/20 p-4.5 rounded-2xl shadow-sm text-left space-y-3">
            <div class="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-bold text-[11px] uppercase tracking-wider">
              <Info class="w-4.5 h-4.5 text-blue-500" />
              <span>How to link the extension?</span>
            </div>
            <ol class="text-[11px] text-zinc-400 space-y-2 list-decimal pl-4.5">
              <li>Open GitHub using the card above and download the unpacked zip extension.</li>
              <li>Load it under Developer Mode in your browser.</li>
              <li>It will automatically stream links to Synclime on local port <code class="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-[10px] text-purple-600 dark:text-purple-400">14221</code>.</li>
              <li>Verify in real time under the <strong class="text-zinc-800 dark:text-white">Inbox Queue</strong> page!</li>
            </ol>
          </div>
        </div>

        {/* Right Side: Version Checker & History changelog */}
        <div class="md:col-span-7 space-y-4">
          
          {/* Status Checker Card */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Shell Version</span>
                <code class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  v{currentVersion()}
                </code>
              </div>
              <p class="text-[10px] text-zinc-400">
                Latest stable online version: <strong class="text-zinc-800 dark:text-white">v{latestVersionNum()}</strong>
              </p>
            </div>

            <Show when={isLatestVersion()} fallback={
              <div class="flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3.5 py-2 rounded-xl border border-blue-500/20 text-xs font-bold shadow-sm animate-pulse">
                <AlertTriangle class="w-4 h-4 flex-shrink-0" />
                <span>Update Available!</span>
              </div>
            }>
              <div class="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-2 rounded-xl border border-emerald-500/20 text-xs font-bold shadow-sm">
                <CheckCircle class="w-4 h-4 flex-shrink-0" />
                <span>Application Up-to-Date</span>
              </div>
            </Show>
          </div>

          {/* Timeline Updates */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/20 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 class="font-bold text-zinc-950 dark:text-white text-xs uppercase tracking-wider">
              Version Releases & Changelogs
            </h3>

            <Show when={!loading()} fallback={
              <div class="py-8 text-center flex flex-col items-center justify-center space-y-2">
                <div class="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-zinc-400 text-xs font-semibold">Reading release manifest...</p>
              </div>
            }>
              <Show when={!errorMsg()} fallback={
                <div class="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-medium">
                  {errorMsg()}
                </div>
              }>
                <div class="space-y-5 relative pl-4 border-l border-zinc-200 dark:border-zinc-800">
                  <For each={updatesData()?.updates}>
                    {(update) => (
                      <div class="relative space-y-2">
                        {/* Timeline Circle */}
                        <div class={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-white dark:bg-zinc-950 ${
                          update.severity === "critical"
                            ? "border-red-500"
                            : "border-purple-500"
                        }`} />

                        <div class="flex items-center justify-between flex-wrap gap-2">
                          <div class="flex items-center gap-2.5">
                            <span class="font-bold text-zinc-900 dark:text-white text-sm">
                              v{update.application_online_version}
                            </span>
                            <span class="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                              <Calendar class="w-3.5 h-3.5" />
                              {update.date}
                            </span>
                          </div>

                          {/* Severity badge */}
                          <Show when={update.severity === "critical"}>
                            <span class="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-red-500/10 text-red-500 border border-red-500/10">
                              Critical update
                            </span>
                          </Show>
                        </div>

                        {/* Changelog Bullets */}
                        <div class="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/40 p-3 rounded-xl space-y-2">
                          {/* Features */}
                          <Show when={update.features && update.features.length > 0}>
                            <div class="space-y-1">
                              <span class="text-[9px] uppercase font-bold text-purple-500 tracking-wider">Features Added:</span>
                              <ul class="text-[11px] text-zinc-400 space-y-1 list-disc pl-4.5">
                                <For each={update.features}>
                                  {(feat) => <li>{feat}</li>}
                                </For>
                              </ul>
                            </div>
                          </Show>

                          {/* Fixes */}
                          <Show when={update.fixes && update.fixes.length > 0}>
                            <div class="space-y-1 pt-1 border-t border-zinc-200/20 dark:border-zinc-800/20">
                              <span class="text-[9px] uppercase font-bold text-emerald-500 tracking-wider">Errors Fixed:</span>
                              <ul class="text-[11px] text-zinc-400 space-y-1 list-disc pl-4.5">
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
        </div>

      </div>

    </div>
  );
}
