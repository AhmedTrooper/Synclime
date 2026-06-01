import { createSignal, createEffect, onCleanup } from "solid-js";
import { useUIStore } from "../store/useUIStore";

export default function SplashScreen() {
  const ui = useUIStore.state;
  const [progress, setProgress] = createSignal(0);
  const [appVersion, setAppVersion] = createSignal("0.1.0");
  const [tauriVersion, setTauriVersion] = createSignal("2.x");

  createEffect(() => {
    const startTime = Date.now();
    const duration = 1800; // Finish just before fade-out

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(currentProgress);

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 16);

    onCleanup(() => clearInterval(interval));
  });

  createEffect(() => {
    const loadVersions = async () => {
      try {
        const { getVersion, getTauriVersion } = await import("@tauri-apps/api/app");
        const appVer = await getVersion();
        const tauriVer = await getTauriVersion();
        setAppVersion(appVer);
        setTauriVersion(tauriVer);
      } catch (err) {
        // console.log("Safe fallback: Version info not available in browser.", err);
      }
    };
    loadVersions();
  });

  const isDark = () => 
    ui.theme === "dark" || 
    (ui.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div
      class={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden transition-colors duration-500 ${
        isDark() ? "bg-[#09090b] text-white" : "bg-zinc-50 text-zinc-900"
      }`}
    >
      {/* Centered Minimal Brand Emblem & Title */}
      <div class="flex flex-col items-center gap-6">
        {/* Sleek Minimalist SVG Logo representing Sync + Media Downloader */}
        <div
          class={`p-4.5 rounded-2xl border transition-all duration-500 ${
            isDark()
              ? "bg-white/[0.02] border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
              : "bg-black/[0.01] border-zinc-200/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
          }`}
        >
          <svg class="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M38 24C38 31.732 31.732 38 24 38C19.5 38 15.5 35.8 13 32.5"
              stroke={isDark() ? "#3b82f6" : "#2563eb"}
              stroke-width="3"
              stroke-linecap="round"
            />
            <path
              d="M10 24C10 16.268 16.268 10 24 10C28.5 10 32.5 12.2 35 15.5"
              stroke={isDark() ? "#3b82f6" : "#2563eb"}
              stroke-width="3"
              stroke-linecap="round"
            />
            <path
              d="M24 16V30M18 24L24 30L30 24"
              stroke={isDark() ? "#ffffff" : "#09090b"}
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        {/* Brand Typography */}
        <div class="text-center flex flex-col gap-1.5 mt-1">
          <h1 class="text-3xl font-bold tracking-[0.2em] uppercase pl-[0.2em] font-sans">
            Synclime
          </h1>
          <span class={`text-[10px] font-semibold tracking-[0.25em] uppercase pl-[0.25em] ${
            isDark() ? "text-zinc-500" : "text-zinc-400"
          }`}>
            Media Downloader
          </span>
        </div>

        {/* Elegant Minimal Linear Progress Bar */}
        <div class={`relative w-48 h-[2px] rounded-full overflow-hidden mt-3 transition-colors duration-500 ${
          isDark() ? "bg-zinc-800/60" : "bg-zinc-200"
        }`}>
          <div
            class={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-100 ${
              isDark() 
                ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                : "bg-blue-600"
            }`}
            style={{ width: `${progress()}%` }}
          />
        </div>
      </div>

      {/* Sleek quiet version metadata footer */}
      <div class={`absolute bottom-6 left-8 right-8 flex justify-between text-[8px] font-mono tracking-widest ${
        isDark() ? "text-zinc-600" : "text-zinc-400"
      }`}>
        <span>TAURI V{tauriVersion()}</span>
        <span>SYNCLIME V{appVersion()}</span>
      </div>
    </div>
  );
}
