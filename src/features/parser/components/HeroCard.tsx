import { Show } from "solid-js";
import { Clock } from "lucide-solid";

interface HeroCardProps {
  thumbnail: string;
  title: string;
  author: string;
  isPlaylist: boolean;
  duration: number;
  description?: string;
  formatDuration: (secs: number) => string;
}

export function HeroCard(props: HeroCardProps) {
  return (
    <div class="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 sm:p-4 select-none">
      <div class="flex flex-row gap-3 sm:gap-5 items-start text-left min-w-0">
        <Show when={props.thumbnail}>
          <img
            src={props.thumbnail}
            alt={props.title}
            class="w-20 sm:w-40 md:w-64 aspect-video object-cover rounded-md border border-zinc-200 dark:border-zinc-800 flex-shrink-0"
          />
        </Show>

        <div class="flex flex-col justify-between py-0.5 min-w-0 flex-grow">
          <div class="flex flex-col gap-1.5 min-w-0">
            <h2 class="text-sm sm:text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
              {props.title}
            </h2>
            
            <div class="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium w-full">
              <span class="font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800/30 truncate max-w-full">
                {props.author}
              </span>
              <span>•</span>
              <Show
                when={props.isPlaylist}
                fallback={<span class="text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider text-[9px]">Single Video</span>}
              >
                <span class="text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider text-[9px]">Playlist</span>
              </Show>
              <Show when={!props.isPlaylist}>
                <span>•</span>
                <span class="flex items-center gap-1 font-mono">
                  <Clock class="w-3.5 h-3.5 text-zinc-400" />
                  {props.formatDuration(props.duration)}
                </span>
              </Show>
            </div>
          </div>

          <Show when={props.description}>
            <p class="hidden sm:block text-[11px] text-zinc-500 dark:text-zinc-400 mt-2.5 leading-relaxed line-clamp-2 select-text font-sans">
              {props.description}
            </p>
          </Show>
        </div>
      </div>
    </div>
  );
}
