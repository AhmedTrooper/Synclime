import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useUIStore } from "../store/useUIStore";
import { Button } from "@heroui/react";
import { FolderOpen } from "lucide-react";

export default function Home() {
  const { setActivePath } = useUIStore();

  useEffect(() => {
    setActivePath("/");
  }, [setActivePath]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white transition-colors duration-300">
          Hello World from Home Route
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm transition-colors duration-300">
          Synclime clean shell environment ready.
        </p>
      </div>

      {/* Navigation action to ParsedFiles Repository */}
      <div className="flex justify-center mt-2">
        <Button
          as={Link}
          to="/parsed_files"
          size="md"
          className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300"
          startContent={<FolderOpen className="w-4 h-4 text-blue-500" />}
        >
          Open Parsed Files Repository
        </Button>
      </div>
    </div>
  );
}
