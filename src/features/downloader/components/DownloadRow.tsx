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
      className={`flex items-center justify-between gap-1.5 sm:gap-3 px-2 sm:px-3 py-2 bg-white dark:bg-zinc-900 border-b last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors min-w-0 ${
        isError ? "border-red-200 dark:border-red-900/30" : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex flex-col gap-1 flex-grow overflow-hidden text-left min-w-0">
        <span className="text-[11px] sm:text-[13px] font-medium text-zinc-900 dark:text-zinc-100 truncate">{name}</span>
        <div className="flex items-center gap-1.5 sm:gap-3 w-full">
          <div className="flex-1 max-w-[128px] min-w-[32px] h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${isError ? "bg-red-500" : "bg-blue-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 font-mono w-5 sm:w-8 flex-shrink-0">{progress}%</span>
          <span className={`text-[8px] sm:text-[10px] uppercase tracking-wide truncate flex-shrink-0 ${isError ? "text-red-500" : "text-zinc-500"}`}>
            {status}
          </span>
        </div>
        {message && message.trim().length > 0 && (
          <span
            className={`text-[9px] sm:text-[10px] font-mono truncate max-w-xs sm:max-w-md md:max-w-lg mt-0.5 ${
              isError ? "text-red-500 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500"
            }`}
            title={message}
          >
            {message}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {status !== "completed" && status !== "error" && (
          <button
            onClick={onPauseToggle}
            className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            {status === "paused" ? <Play className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> : <Pause className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />}
          </button>
        )}
        {status === "completed" && (
          <button
            onClick={onReveal}
            className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 transition-colors"
            title="Reveal in File Explorer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
