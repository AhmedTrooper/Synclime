import { onMount, createSignal, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { useUIStore } from "../store/useUIStore";
import { 
  Sparkles, 
  ExternalLink, 
  Coffee, 
  Layers, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Calendar,
  Terminal,
  ArrowRight
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
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(url);
      } catch (err) {
        console.error("Failed to open URL via Tauri opener:", err);
      }
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div class="w-full max-w-5xl mx-auto space-y-4.5 select-none animate-fade-in text-xs sm:text-sm font-sans px-1">
      
      {/* Extensions Hub Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/80 gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 shadow-sm">
            <Layers class="w-5 h-5" />
          </div>
          <div class="text-left">
            <h1 class="text-sm font-black text-zinc-900 dark:text-white tracking-tight leading-tight uppercase">Companion Marketplace</h1>
            <p class="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Install browser link collectors, manage integrations, and review changelogs</p>
          </div>
        </div>
      </div>

      {/* Main Catalog Grid Layout */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Side: Browser Extension Card & Visual step guide */}
        <div class="lg:col-span-5 space-y-4.5">
          
          {/* Extension Module */}
          <div 
            onClick={handleOpenGithub}
            class="group border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-950/20 dark:to-zinc-950/5 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-md hover:border-blue-500/35 transition-all duration-300 cursor-pointer text-left space-y-4 relative overflow-hidden"
          >
            {/* Background Glow */}
            <div class="absolute -right-12 -top-12 w-28 h-28 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            
            <div class="flex items-center justify-between">
              <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-sm">
                <Sparkles class="w-4.5 h-4.5" />
              </div>
              <ExternalLink class="w-4 h-4 text-zinc-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div class="space-y-1.5">
              <h3 class="font-black text-xs text-zinc-900 dark:text-white uppercase tracking-tight">
                Browser Extension Hub
              </h3>
              <p class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed font-semibold">
                Capture links automatically from Chrome, Firefox, or Brave. Install the official companion extension and speed up your workflow.
              </p>
            </div>

            <div class="pt-2 flex items-center gap-2 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <span>View GitHub Catalog</span>
              <span class="text-zinc-300 dark:text-zinc-700">|</span>
              <span class="flex items-center gap-1"><Coffee class="w-3.5 h-3.5" /> Buy Creator Coffee</span>
            </div>
          </div>

          {/* Quick Step Guide */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-left space-y-3.5">
            <div class="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-black text-[10px] uppercase tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2">
              <Info class="w-4.5 h-4.5 text-blue-500" />
              <span>Link Integration Guide</span>
            </div>
            
            <div class="space-y-3 text-[11px] font-medium font-sans">
              <div class="flex items-start gap-2.5">
                <span class="w-5 h-5 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-black rounded-lg text-[10px] flex-shrink-0 mt-0.5">1</span>
                <p class="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Open the GitHub catalog using the card above and download the packed zip extension bundle.
                </p>
              </div>
              <div class="flex items-start gap-2.5">
                <span class="w-5 h-5 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-black rounded-lg text-[10px] flex-shrink-0 mt-0.5">2</span>
                <p class="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Extract the bundle and load it under <strong>Developer Mode</strong> in your web browser settings.
                </p>
              </div>
              <div class="flex items-start gap-2.5">
                <span class="w-5 h-5 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-black rounded-lg text-[10px] flex-shrink-0 mt-0.5">3</span>
                <div class="text-left space-y-1">
                  <p class="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    The extension automatically streams links to the native Synclime daemon on local API port:
                  </p>
                  <div class="flex items-center gap-1.5 mt-1">
                    <Terminal class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    <code class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded font-mono text-[9px] text-blue-600 dark:text-blue-400 font-black">
                      127.0.0.1:14221
                    </code>
                  </div>
                </div>
              </div>
              <div class="flex items-start gap-2.5">
                <span class="w-5 h-5 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-black rounded-lg text-[10px] flex-shrink-0 mt-0.5">4</span>
                <p class="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Verify captured items arrive in real-time inside your <strong>Inbox</strong> queue catalog!
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Version Checker & Releases ledger */}
        <div class="lg:col-span-7 space-y-4.5 text-left">
          
          {/* Version Diagnostics */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1 font-sans font-semibold">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Installed Shell version</span>
                <code class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded font-mono text-xs font-bold text-zinc-850 dark:text-zinc-100">
                  v{currentVersion()}
                </code>
              </div>
              <p class="text-[10px] text-zinc-400 dark:text-zinc-500">
                Latest remote manifest version: <strong class="text-zinc-700 dark:text-white">v{latestVersionNum()}</strong>
              </p>
            </div>

            <Show when={isLatestVersion()} fallback={
              <div class="flex items-center gap-2 bg-blue-500/5 text-blue-600 dark:text-blue-400 px-3.5 py-2 rounded-xl border border-blue-500/20 text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                <AlertTriangle class="w-4 h-4 flex-shrink-0" />
                <span>Update Available</span>
              </div>
            }>
              <div class="flex items-center gap-2 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 px-3.5 py-2 rounded-xl border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider shadow-sm">
                <CheckCircle class="w-4 h-4 flex-shrink-0" />
                <span>Standard Up-to-Date</span>
              </div>
            </Show>
          </div>

          {/* Releases timeline ledger */}
          <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] space-y-4">
            <h3 class="font-black text-zinc-800 dark:text-zinc-200 text-[10px] uppercase tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2">
              Changelogs & Manifest Releases
            </h3>

            <Show when={!loading()} fallback={
              <div class="py-12 text-center flex flex-col items-center justify-center space-y-2">
                <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-zinc-400 text-xs font-semibold font-sans">Syncing release manifestations...</p>
              </div>
            }>
              <Show when={!errorMsg()} fallback={
                <div class="p-3.5 bg-red-500/5 border border-red-500/20 text-red-500 text-xs rounded-xl font-semibold">
                  {errorMsg()}
                </div>
              }>
                <div class="space-y-5.5 relative pl-4 border-l border-zinc-200 dark:border-zinc-800/80">
                  <For each={updatesData()?.updates}>
                    {(update) => (
                      <div class="relative space-y-2.5">
                        
                        {/* Timeline visual marker */}
                        <div class={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full border-2 bg-white dark:bg-zinc-950 ${
                          update.severity === "critical"
                            ? "border-red-500"
                            : "border-blue-500"
                        }`} />

                        <div class="flex items-center justify-between flex-wrap gap-2">
                          <div class="flex items-center gap-2.5">
                            <span class="font-black text-zinc-900 dark:text-white text-xs sm:text-sm">
                              Version v{update.application_online_version}
                            </span>
                            <span class="text-[9px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-bold">
                              <Calendar class="w-3.5 h-3.5" />
                              {update.date}
                            </span>
                          </div>

                          <Show when={update.severity === "critical"}>
                            <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/5 text-red-500 border border-red-500/10">
                              Critical update
                            </span>
                          </Show>
                        </div>

                        {/* Changelog items grid splits */}
                        <div class="bg-zinc-50 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800/60 p-3.5 rounded-xl space-y-3 text-[11px] font-medium font-sans">
                          {/* Features */}
                          <Show when={update.features && update.features.length > 0}>
                            <div class="space-y-1">
                              <span class="text-[9px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-wider">Features Added</span>
                              <ul class="text-zinc-500 dark:text-zinc-400 space-y-1 list-none pl-1">
                                <For each={update.features}>
                                  {(feat) => (
                                    <li class="flex items-start gap-1.5">
                                      <ArrowRight class="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                                      <span class="leading-normal">{feat}</span>
                                    </li>
                                  )}
                                </For>
                              </ul>
                            </div>
                          </Show>

                          {/* Fixes */}
                          <Show when={update.fixes && update.fixes.length > 0}>
                            <div class="space-y-1 pt-2.5 border-t border-zinc-250/20 dark:border-zinc-800/30">
                              <span class="text-[9px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">Exceptions Fixed</span>
                              <ul class="text-zinc-500 dark:text-zinc-400 space-y-1 list-none pl-1">
                                <For each={update.fixes}>
                                  {(fix) => (
                                    <li class="flex items-start gap-1.5">
                                      <ArrowRight class="w-3 h-3 text-emerald-500 mt-1 flex-shrink-0" />
                                      <span class="leading-normal">{fix}</span>
                                    </li>
                                  )}
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
