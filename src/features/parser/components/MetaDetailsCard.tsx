import { Show } from "solid-js";

interface MetaDetailsCardProps {
  title: string;
  duration?: string;
  author?: string;
  views?: string;
  thumbnail?: string;
}

export function MetaDetailsCard(props: MetaDetailsCardProps) {
  return (
    <div class="flex flex-col md:flex-row gap-5 p-5 bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-white/15 transition-all duration-300">
      <Show when={props.thumbnail}>
        <img
          src={props.thumbnail}
          alt={props.title}
          class="w-full md:w-48 aspect-video object-cover rounded-xl border border-zinc-200 dark:border-white/5 shadow-sm"
        />
      </Show>
      <div class="flex flex-col justify-between py-1 text-left">
        <div>
          <h4 class="text-base font-bold text-zinc-900 dark:text-white leading-snug">{props.title}</h4>
          <Show when={props.author}>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-semibold">{props.author}</p>
          </Show>
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
          <Show when={props.duration}><span>DURATION: {props.duration}</span></Show>
          <Show when={props.views}><span>VIEWS: {props.views}</span></Show>
        </div>
      </div>
    </div>
  );
}
