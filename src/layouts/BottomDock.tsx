import { Link } from "react-router-dom";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Home,
  Info,
  Download,
  Settings,
  FileText,
  GripVertical,
  Sun,
  Moon,
  Minus,
  Maximize2,
  X,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useUIStore } from "@/store/useUIStore";

export default function BottomDock() {
  const { activePath, badges, theme, toggleTheme } = useUIStore();

  const dockItems = [
    {
      path: "/",
      label: "Home",
      icon: Home,
      badgeKey: "home" as const,
      color:
        "hover:text-blue-500 dark:hover:text-blue-400 text-zinc-500 dark:text-zinc-400",
    },
    {
      path: "/downloads",
      label: "Downloads",
      icon: Download,
      badgeKey: "downloads" as const,
      color:
        "hover:text-blue-500 dark:hover:text-blue-400 text-zinc-500 dark:text-zinc-400",
    },
    {
      path: "/parsed_files",
      label: "Parsed Files",
      icon: FileText,
      badgeKey: "parsedFiles" as const,
      color:
        "hover:text-blue-500 dark:hover:text-blue-400 text-zinc-500 dark:text-zinc-400",
    },
    {
      path: "/settings",
      label: "Settings",
      icon: Settings,
      badgeKey: "settings" as const,
      color:
        "hover:text-blue-500 dark:hover:text-blue-400 text-zinc-500 dark:text-zinc-400",
    },
    {
      path: "/about",
      label: "About System",
      icon: Info,
      badgeKey: "about" as const,
      color:
        "hover:text-blue-500 dark:hover:text-blue-400 text-zinc-500 dark:text-zinc-400",
    },
  ];

  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (err) {
      console.log("Minimize action triggered (fallback in browser)", err);
    }
  };

  const handleFullscreen = async () => {
    try {
      const appWindow = getCurrentWindow();
      const isFS = await appWindow.isFullscreen();
      await appWindow.setFullscreen(!isFS);
    } catch (err) {
      console.log("Fullscreen action triggered (fallback in browser)", err);
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (err) {
      console.log("Close action triggered (fallback in browser)", err);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 max-w-full">
      <div className="relative flex items-center justify-center">
        {/* Glow backdrop behind dock */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 blur-2xl rounded-3xl transition-all duration-300" />

        {/* Dock container */}
        <div className="relative flex items-center gap-3.5 bg-white/70 dark:bg-black/40 border border-zinc-200/80 dark:border-white/10 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-300">
          <Tooltip.Provider delayDuration={200}>
            {/* Main Navigation Icons */}
            <div className="flex items-center gap-3.5">
              {dockItems.map((item) => {
                const isActive =
                  item.path === "/"
                    ? activePath === "/"
                    : activePath.startsWith(item.path);

                const badgeCount = badges[item.badgeKey];
                const Icon = item.icon;

                return (
                  <Tooltip.Root key={item.path}>
                    <Tooltip.Trigger asChild>
                      <Link
                        to={item.path}
                        className="relative p-2.5 rounded-xl flex items-center justify-center transition-colors group select-none"
                      >
                        {isActive && (
                          <div
                            className="absolute inset-0 bg-zinc-800/10 dark:bg-white/10 border border-zinc-800/5 dark:border-white/5 rounded-xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                          />
                        )}

                        <div
                          className={`relative z-10 ${item.color} ${isActive ? "text-blue-600 dark:text-blue-400 font-semibold" : ""}`}
                        >
                          <Icon className="w-5.5 h-5.5 transition-transform group-hover:scale-110 group-active:scale-95" />
                          {badgeCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-md shadow-red-500/20 border border-white dark:border-black">
                              {badgeCount}
                            </span>
                          )}
                        </div>
                      </Link>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        sideOffset={5}
                        className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg z-[9999]"
                      >
                        {item.label}
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                );
              })}
            </div>

            {/* Elegant vertical divider */}
            <div className="w-[1px] h-6 bg-zinc-800/10 dark:bg-white/10 self-center mx-1 flex-shrink-0" />

            {/* Window Control Panel */}
            <div className="flex items-center gap-2">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div
                    data-tauri-drag-region
                    className="p-2 rounded-lg text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-grab active:cursor-grabbing hover:bg-zinc-800/5 dark:hover:bg-white/5 transition-all select-none"
                  >
                    <GripVertical className="w-4 h-4 pointer-events-none" />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={5}
                    className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg z-[9999]"
                  >
                    Drag Window
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-800/5 dark:hover:bg-white/5 active:scale-95 transition-all select-none"
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    )}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={5}
                    className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg z-[9999]"
                  >
                    Theme: {theme.toUpperCase()}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={handleMinimize}
                    className="p-2 rounded-lg text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-800/5 dark:hover:bg-white/5 active:scale-95 transition-all select-none"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={5}
                    className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg z-[9999]"
                  >
                    Minimize
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={handleFullscreen}
                    className="p-2 rounded-lg text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-800/5 dark:hover:bg-white/5 active:scale-95 transition-all select-none"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={5}
                    className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg z-[9999]"
                  >
                    Fullscreen
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/10 active:scale-95 transition-all select-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={5}
                    className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg z-[9999]"
                  >
                    Close Window
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </Tooltip.Provider>
        </div>
      </div>
    </div>
  );
}
