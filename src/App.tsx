import { useEffect } from "react";
import MainLayout from "./layouts/MainLayout";

export default function App() {
  useEffect(() => {
    // Disable right-click default context menu to make it feel 100% native
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

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

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return <MainLayout />;
}



