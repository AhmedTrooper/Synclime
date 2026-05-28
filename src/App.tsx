import { useEffect, useState } from "react";
import MainLayout from "./layouts/MainLayout";
import SplashScreen from "./components/ui/SplashScreen";
import { AnimatePresence } from "framer-motion";

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);

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

    // Simulate system startup and asset loading delay to present premium entrance
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 2000);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {!isLoaded && <SplashScreen key="splash" />}
      </AnimatePresence>
      <MainLayout />
    </>
  );
}



