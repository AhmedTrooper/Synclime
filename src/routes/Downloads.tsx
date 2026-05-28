import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useUIStore } from "../store/useUIStore";
import { Button } from "@heroui/react";

export default function Downloads() {
  const { setActivePath } = useUIStore();

  useEffect(() => {
    setActivePath("/downloads");
  }, [setActivePath]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white transition-colors duration-300">
          Hello World from Downloads Route
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm transition-colors duration-300">
          System Downloads and Allocation Manager Placeholder.
        </p>
      </div>
      <Button
        as={Link}
        to="/downloads/test-package"
        size="sm"
        className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300"
      >
        Go to Test Package Details
      </Button>
    </div>
  );
}
