import { createEffect, onMount } from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";
import Sidebar from "./Sidebar";
import TitleBar from "./TitleBar";
import { useUIStore } from "../store/useUIStore";

export default function MainLayout(props: any) {
  const ui = useUIStore.state;
  const navigate = useNavigate();
  const location = useLocation();
  let hasRestored = false;

  createEffect(() => {
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    if (ui.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);
      
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener("change", listener);
    } else {
      applyTheme(ui.theme === "dark");
    }
  });

  // Seamless path sync that filters transient detail routes
  createEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/parsed_file/")) {
      useUIStore.setActivePath("/parsed_files");
    } else if (path.startsWith("/downloads/")) {
      useUIStore.setActivePath("/downloads");
    } else {
      useUIStore.setActivePath(path);
    }
  });

  // Invisible, seamless startup restoration of the active route
  onMount(() => {
    if (!hasRestored) {
      hasRestored = true;
      const initialPath = ui.activePath;
      if (
        initialPath &&
        window.location.pathname === "/" &&
        initialPath !== "/"
      ) {
        navigate(initialPath, { replace: true });
      }
    }
  });

  return (
    <div class="relative h-screen w-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 overflow-hidden flex flex-col font-sans select-none">
      {/* Custom OS Titlebar */}
      <TitleBar />

      <div class="flex flex-col-reverse sm:flex-row flex-1 overflow-hidden relative z-10 w-full h-full">
        {/* Native Sidebar / Bottom Nav */}
        <Sidebar />

        {/* Main Content Area */}
        <main class="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 sm:px-6 sm:py-6 w-full relative bg-white dark:bg-zinc-800/20 shadow-inner">
          {props.children}
        </main>
      </div>
    </div>
  );
}
