import { createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Minus, Square, X, ChevronLeft, ChevronRight } from "lucide-solid";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function TitleBar() {
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const navigate = useNavigate();

  onMount(() => {
    const checkFullscreen = async () => {
      try {
        const appWindow = getCurrentWindow();
        const isFS = await appWindow.isFullscreen();
        setIsFullscreen(isFS);
      } catch (err) {
        console.log("Browser environment fallback check", err);
      }
    };
    checkFullscreen();
  });

  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (err) {
      console.log("Minimize action fallback", err);
    }
  };

  const handleMaximize = async () => {
    try {
      const appWindow = getCurrentWindow();
      const isMax = await appWindow.isMaximized();
      if (isMax) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
    } catch (err) {
      console.log("Maximize action fallback", err);
    }
  };

  const handleClose = async () => {
    try {
      const confirmed = window.confirm("Are you sure you want to close Synclime? Active downloads or operations will be interrupted.");
      if (confirmed) {
        const appWindow = getCurrentWindow();
        await appWindow.close();
      }
    } catch (err) {
      console.log("Close action fallback", err);
    }
  };

  return (
    <div
      data-tauri-drag-region
      data-fullscreen={isFullscreen()}
      class="flex items-center justify-between w-full h-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 select-none relative z-50 transition-colors duration-300"
    >
      {/* Navigation & Drag region */}
      <div data-tauri-drag-region class="flex items-center gap-3 sm:gap-4 cursor-default">
        {/* History Controls */}
        <div class="flex items-center gap-0.5">
          <button
            onClick={() => navigate(-1)}
            class="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 cursor-pointer"
            title="Go Back"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            class="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 cursor-pointer"
            title="Go Forward"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        {/* App Title */}
        <div data-tauri-drag-region class="flex items-center gap-2 font-semibold text-xs tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
          <span data-tauri-drag-region class="bg-blue-500 w-1.5 h-1.5 rounded-full" />
          <span data-tauri-drag-region class="hidden sm:inline">Synclime</span>
        </div>
      </div>

      {/* Accidental Close Prevention: Center Close Button */}
      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
        <button
          onClick={handleClose}
          class="flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 dark:bg-red-650 dark:hover:bg-red-550 text-white text-[9px] font-black tracking-wider uppercase rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer border border-red-500/20"
          title="Quit Application"
        >
          <X class="w-2.5 h-2.5" />
          <span class="hidden xs:inline">Quit App</span>
        </button>
      </div>

      {/* Control Buttons (Right Side - Only Minus and Fullscreen) */}
      <div class="flex items-center gap-1.5">
        <button
          onClick={handleMinimize}
          class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 cursor-pointer"
          title="Minimize"
        >
          <Minus class="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200 cursor-pointer"
          title="Maximize"
        >
          <Square class="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
