import { useEffect } from "react";
import { useUIStore } from "../store/useUIStore";

export default function About() {
  const { setActivePath } = useUIStore();

  useEffect(() => {
    setActivePath("/about");
  }, [setActivePath]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white transition-colors duration-300">
        Hello World from About Route
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm transition-colors duration-300">
        System Specifications and Architecture Info Placeholder.
      </p>
    </div>
  );
}
