import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useUIStore } from "../store/useUIStore";
import { Button } from "@heroui/react";
import { ArrowLeft } from "lucide-react";

export default function ParsedFileDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { setActivePath } = useUIStore();

  useEffect(() => {
    // Keep navigation dock active on Home item or just set path to reset dock active indicators
    setActivePath("/");
  }, [setActivePath]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6 w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white transition-colors duration-300">
          Hello World from Parsed File Detail Route
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm transition-colors duration-300">
          Viewing Parsed File for dynamic slug: <strong className="text-blue-600 dark:text-blue-400">{slug}</strong>
        </p>
      </div>
      <Button
        as={Link}
        to="/"
        size="sm"
        className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300"
        startContent={<ArrowLeft className="w-4 h-4" />}
      >
        Back to Home
      </Button>
    </div>
  );
}
