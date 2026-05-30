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
      const appWindow = getCurrentWindow();
      await appWindow.close();
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
            class="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
            title="Go Back"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            class="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
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

      {/* Control Buttons */}
      <div class="flex items-center gap-1.5">
        <button
          onClick={handleMinimize}
          class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
          title="Minimize"
        >
          <Minus class="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
          title="Maximize"
        >
          <Square class="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          class="p-1 rounded hover:bg-red-500/20 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
          title="Close"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
