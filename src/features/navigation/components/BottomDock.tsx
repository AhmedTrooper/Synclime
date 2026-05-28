import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "@heroui/react";
import { useUIStore } from "../../../store/useUIStore";
import { Home, Info, Download, Settings, GripVertical, Sun, Moon, Minus, Maximize2, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function BottomDock() {
  const { activePath, badges, theme, toggleTheme } = useUIStore();

  const dockItems = [
    { path: "/", label: "Home", icon: Home, badgeKey: "home" as const, color: "hover:text-blue-500 dark:hover:text-blue-400 text-zinc-500 dark:text-zinc-300" },
    { path: "/about", label: "About System", icon: Info, badgeKey: "about" as const, color: "hover:text-purple-500 dark:hover:text-purple-400 text-zinc-500 dark:text-zinc-300" },
    { path: "/downloads", label: "Downloads", icon: Download, badgeKey: "downloads" as const, color: "hover:text-emerald-500 dark:hover:text-emerald-400 text-zinc-500 dark:text-zinc-300" },
    { path: "/settings", label: "Settings", icon: Settings, badgeKey: "settings" as const, color: "hover:text-amber-500 dark:hover:text-amber-400 text-zinc-500 dark:text-zinc-300" },
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
                <Tooltip
                  key={item.path}
                  content={item.label}
                  closeDelay={0}
                  delay={200}
                  placement="top"
                  className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg"
                >
                  <Link
                    to={item.path}
                    className="relative p-2.5 rounded-xl flex items-center justify-center transition-colors group select-none"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-dock-bg"
                        className="absolute inset-0 bg-zinc-800/10 dark:bg-white/10 border border-zinc-800/5 dark:border-white/5 rounded-xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}

                    <motion.div
                      whileHover={{ scale: 1.18, y: -6 }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className={`relative z-10 ${item.color} ${isActive ? "text-zinc-900 dark:text-white" : ""}`}
                    >
                      <Icon className="w-5.5 h-5.5 transition-transform" />

                      <AnimatePresence>
                        {badgeCount > 0 && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-md shadow-red-500/20 border border-white dark:border-black"
                          >
                            {badgeCount}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </Link>
                </Tooltip>
              );
            })}
          </div>

          {/* Elegant vertical divider */}
          <div className="w-[1px] h-6 bg-zinc-800/10 dark:bg-white/10 self-center mx-1 flex-shrink-0" />

          {/* Window Control Panel */}
          <div className="flex items-center gap-2">
            {/* Drag Handle */}
            <Tooltip
              content="Drag Window"
              closeDelay={0}
              delay={200}
              placement="top"
              className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg"
            >
              <div
                data-tauri-drag-region
                className="p-2 rounded-lg text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-grab active:cursor-grabbing hover:bg-zinc-800/5 dark:hover:bg-white/5 transition-all select-none"
              >
                <GripVertical className="w-4 h-4 pointer-events-none" />
              </div>
            </Tooltip>

            {/* Theme Toggle */}
            <Tooltip
              content={`Theme: ${theme.toUpperCase()}`}
              closeDelay={0}
              delay={200}
              placement="top"
              className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg"
            >
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
            </Tooltip>

            {/* Minimize */}
            <Tooltip
              content="Minimize"
              closeDelay={0}
              delay={200}
              placement="top"
              className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg"
            >
              <button
                onClick={handleMinimize}
                className="p-2 rounded-lg text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-800/5 dark:hover:bg-white/5 active:scale-95 transition-all select-none"
              >
                <Minus className="w-4 h-4" />
              </button>
            </Tooltip>

            {/* Fullscreen Toggle */}
            <Tooltip
              content="Fullscreen"
              closeDelay={0}
              delay={200}
              placement="top"
              className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg"
            >
              <button
                onClick={handleFullscreen}
                className="p-2 rounded-lg text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-800/5 dark:hover:bg-white/5 active:scale-95 transition-all select-none"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </Tooltip>

            {/* Close */}
            <Tooltip
              content="Close Window"
              closeDelay={0}
              delay={200}
              placement="top"
              className="bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200 dark:border-white/10 shadow-lg px-2.5 py-1 rounded-lg"
            >
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/10 active:scale-95 transition-all select-none"
              >
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );

}

