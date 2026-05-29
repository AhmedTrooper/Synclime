import { Play, Pause, FolderOpen, Trash } from "lucide-react";

interface DownloadRowProps {
  id: string;
  name: string;
  progress: number;
  status: "downloading" | "paused" | "completed" | "error";
  message?: string;
  onPauseToggle: () => void;
  onReveal: () => void;
  onDelete: () => void;
}

export function DownloadRow({ id, name, progress, status, message, onPauseToggle, onReveal, onDelete }: DownloadRowProps) {
  const isError = status === "error";

  return (
    <div
      data-id={id}
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white/70 dark:bg-black/40 border backdrop-blur-xl rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-white/15 transition-all duration-300 ${
        isError ? "border-red-500/30 dark:border-red-500/20" : "border-zinc-200 dark:border-white/10"
      }`}
    >
      <div className="flex flex-col gap-1.5 flex-grow text-left">
        <span className="text-sm font-bold text-zinc-900 dark:text-white transition-colors duration-300">{name}</span>
        <div className="relative w-full h-[6px] bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-300 ${
              isError ? "bg-red-500" : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono uppercase tracking-wider">
          <span>PROGRESS: {progress}%</span>
          <span>•</span>
          <span className={isError ? "text-red-500 dark:text-red-400 font-bold" : ""}>
            STATUS: {status}
          </span>
        </div>
        {isError && message && (
          <span className="text-[11px] text-red-500 dark:text-red-400 mt-1 select-text bg-red-500/5 border border-red-500/10 px-2.5 py-1.5 rounded-lg font-mono">
            Error: {message}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {status !== "completed" && status !== "error" && (
          <button
            onClick={onPauseToggle}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 rounded-lg transition-all duration-300"
          >
            {status === "paused" ? <Play className="w-3.5 h-3.5 text-green-500" /> : <Pause className="w-3.5 h-3.5 text-yellow-500" />}
          </button>
        )}
        {status === "completed" && (
          <button
            onClick={onReveal}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 rounded-lg transition-all duration-300 text-sm"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
            Reveal
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold border border-zinc-200 dark:border-red-500/20 rounded-lg transition-all duration-300"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
