import { useEffect, useState } from "react";
import MainLayout from "./layouts/MainLayout";
import SplashScreen from "./components/ui/SplashScreen";
import { AnimatePresence } from "framer-motion";
import { useUIStore } from "./store/useUIStore";

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const { downloadPath, setDownloadPath } = useUIStore();

  useEffect(() => {
    // Disable standard browser reloading & inspector key combinations
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F5" ||
        ((e.metaKey || e.ctrlKey) && e.key === "r") ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "C" || e.key === "c" || e.key === "J" || e.key === "j"))
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Resolve default downloads folder on app startup if not set in local storage
    const resolveDefaultDirectory = async () => {
      if (!downloadPath) {
        try {
          if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
            const { downloadDir } = await import("@tauri-apps/api/path");
            const dir = await downloadDir();
            setDownloadPath(dir);
            console.log("Tauri Path resolved downloads directory:", dir);
          } else {
            // Browser preview fallback
            setDownloadPath("/home/user/Downloads");
          }
        } catch (err) {
          console.error("Failed to resolve downloads path directory:", err);
          setDownloadPath("/home/user/Downloads");
        }
      }
    };

    resolveDefaultDirectory();

    // Simulate system startup and asset loading delay to present premium entrance
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 2000);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [downloadPath, setDownloadPath]);

  return (
    <>
      <AnimatePresence mode="wait">
        {!isLoaded && <SplashScreen key="splash" />}
      </AnimatePresence>
      <MainLayout />
    </>
  );
}



