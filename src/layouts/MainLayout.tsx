import { useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useUIStore } from "../store/useUIStore";
import TitleBar from "./TitleBar";

export default function MainLayout() {
  const theme = useUIStore((state) => state.theme);
  const activePath = useUIStore((state) => state.activePath);
  const setActivePath = useUIStore((state) => state.setActivePath);
  const navigate = useNavigate();
  const location = useLocation();
  const hasRestored = useRef(false);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Seamless path sync that filters transient detail routes (Option A)
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/parsed_file/")) {
      setActivePath("/parsed_files");
    } else if (path.startsWith("/downloads/")) {
      setActivePath("/downloads");
    } else {
      setActivePath(path);
    }
  }, [location.pathname, setActivePath]);

  // Invisible, seamless startup restoration of the active route (runs EXACTLY once on app mount)
  useEffect(() => {
    if (!hasRestored.current) {
      hasRestored.current = true;
      if (
        activePath &&
        window.location.pathname === "/" &&
        activePath !== "/"
      ) {
        navigate(activePath, { replace: true });
      }
    }
  }, [activePath, navigate]);

  return (
    <div className="relative h-screen w-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 overflow-hidden flex flex-col font-sans select-none">
      {/* Custom OS Titlebar */}
      <TitleBar />

      <div className="flex flex-col-reverse sm:flex-row flex-1 overflow-hidden relative z-10 w-full h-full">
        {/* Native Sidebar / Bottom Nav */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 sm:px-6 sm:py-6 w-full relative bg-white dark:bg-black/20 shadow-inner">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
