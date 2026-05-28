import { Button } from "@heroui/react";
import { Play, Pause, FolderOpen, Trash } from "lucide-react";

interface DownloadRowProps {
  id: string;
  name: string;
  progress: number;
  status: "downloading" | "paused" | "completed" | "error";
  onPauseToggle: () => void;
  onReveal: () => void;
  onDelete: () => void;
}

export function DownloadRow({ id, name, progress, status, onPauseToggle, onReveal, onDelete }: DownloadRowProps) {
  return (
    <div
      data-id={id}
      className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-white/15 transition-all duration-300"
    >
      <div className="flex flex-col gap-1.5 flex-grow text-left">
        <span className="text-sm font-bold text-zinc-900 dark:text-white transition-colors duration-300">{name}</span>
        <div className="relative w-full h-[6px] bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="absolute top-0 bottom-0 left-0 bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-3 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono uppercase tracking-wider">
          <span>PROGRESS: {progress}%</span>
          <span>•</span>
          <span>STATUS: {status}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {status !== "completed" && (
          <Button
            size="sm"
            onClick={onPauseToggle}
            className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300"
          >
            {status === "paused" ? <Play className="w-3.5 h-3.5 text-green-500" /> : <Pause className="w-3.5 h-3.5 text-yellow-500" />}
          </Button>
        )}
        {status === "completed" && (
          <Button
            size="sm"
            onClick={onReveal}
            className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300"
            startContent={<FolderOpen className="w-3.5 h-3.5 text-blue-500" />}
          >
            Reveal
          </Button>
        )}
        <Button
          size="sm"
          onClick={onDelete}
          className="bg-zinc-100 hover:bg-zinc-200 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold border border-zinc-200 dark:border-red-500/20 transition-all duration-300"
        >
          <Trash className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
