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
    <div class="w-full bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-xl sm:rounded-3xl shadow-lg p-2 sm:p-5">
      <div class="flex flex-row gap-2 sm:gap-6 items-start text-left">
        <Show when={props.thumbnail}>
          <img
            src={props.thumbnail}
            alt={props.title}
            class="w-24 sm:w-48 md:w-80 aspect-video object-cover rounded-lg sm:rounded-2xl border border-zinc-200 dark:border-white/5 shadow-md flex-shrink-0"
          />
        </Show>

        <div class="flex flex-col justify-start sm:justify-between h-full py-0 sm:py-1 min-w-0 flex-1">
          <div class="flex flex-col gap-1 sm:gap-2">
            <h2 class="text-xs sm:text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-white leading-tight line-clamp-2">
              {props.title}
            </h2>
            
            <div class="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium w-full">
              <span class="font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-white/5 truncate max-w-full">
                {props.author}
              </span>
              <span>•</span>
              <Show
                when={props.isPlaylist}
                fallback={<span class="text-blue-500 font-semibold">Single Video</span>}
              >
                <span class="text-purple-500 font-semibold">Playlist</span>
              </Show>
              <Show when={!props.isPlaylist}>
                <span>•</span>
                <span class="flex items-center gap-1">
                  <Clock class="w-3.5 h-3.5" />
                  {props.formatDuration(props.duration)}
                </span>
              </Show>
            </div>
          </div>

          <Show when={props.description}>
            <p class="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400 mt-4 leading-relaxed line-clamp-3 select-text">
              {props.description}
            </p>
          </Show>
        </div>
      </div>
    </div>
  );
}
