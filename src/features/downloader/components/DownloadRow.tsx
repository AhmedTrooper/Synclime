import { Play, Pause, FolderOpen, Trash } from "lucide-solid";
import { Show, createMemo } from "solid-js";
import { useQueueStore } from "../../../store/useQueueStore";

interface DownloadRowProps {
  id: string;
  onPauseToggle: () => void;
  onReveal: () => void;
  onDelete: () => void;
}

export function DownloadRow(props: DownloadRowProps) {
  const job = createMemo(() => useQueueStore.state.queue.find((j) => j.slug === props.id));
  
  const name = () => job()?.name || "Unknown File";
  const progress = () => job()?.progress ?? 0;
  const status = () => {
    const s = job()?.status;
    return s === "pending" ? "paused" : s || "paused";
  };
  const message = () => job()?.message || "";
  const isError = () => status() === "error";

  return (
    <div
      data-id={props.id}
      class={`flex items-center justify-between gap-1.5 sm:gap-3 px-2 sm:px-3 py-2 bg-white dark:bg-zinc-900 border-b last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors min-w-0 ${
        isError() ? "border-red-200 dark:border-red-900/30" : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div class="flex flex-col gap-1 flex-grow overflow-hidden text-left min-w-0">
        <span class="text-[11px] sm:text-[13px] font-medium text-zinc-900 dark:text-zinc-100 truncate">{name()}</span>
        <div class="flex items-center gap-1.5 sm:gap-3 w-full">
          <div class="flex-1 max-w-[128px] min-w-[32px] h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              class={`h-full ${isError() ? "bg-red-500" : "bg-blue-500"}`}
              style={{ width: `${progress()}%` }}
            />
          </div>
          <span class="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 font-mono w-5 sm:w-8 flex-shrink-0">{Math.round(progress())}%</span>
          <span class={`text-[8px] sm:text-[10px] uppercase tracking-wide truncate flex-shrink-0 ${isError() ? "text-red-500" : "text-zinc-500"}`}>
            {status()}
          </span>
        </div>
        <Show when={message() && message().trim().length > 0}>
          <span
            class={`text-[9px] sm:text-[10px] font-mono truncate max-w-xs sm:max-w-md md:max-w-lg mt-0.5 ${
              isError() ? "text-red-500 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500"
            }`}
            title={message()}
          >
            {message()}
          </span>
        </Show>
      </div>

      <div class="flex items-center gap-1 flex-shrink-0">
        <Show when={status() !== "completed"}>
          <button
            onClick={() => props.onPauseToggle()}
            class="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
            title={status() === "error" ? "Restart / Resume Download" : status() === "paused" ? "Resume Download" : "Pause Download"}
          >
            <Show when={status() === "paused" || status() === "error"} fallback={<Pause class="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />}>
              <Play class="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            </Show>
          </button>
        </Show>
        <Show when={status() === "completed"}>
          <button
            onClick={() => props.onReveal()}
            class="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 transition-colors"
            title="Reveal in File Explorer"
          >
            <FolderOpen class="w-3.5 h-3.5" />
          </button>
        </Show>
        <button
          onClick={() => props.onDelete()}
          class="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
        >
          <Trash class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
