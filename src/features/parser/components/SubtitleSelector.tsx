import { createSignal, For } from "solid-js";

interface SubtitleTrack {
  lang: string;
  name: string;
}

interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  onChange: (selectedLang: string) => void;
}

export function SubtitleSelector(props: SubtitleSelectorProps) {
  const [selected, setSelected] = createSignal("");

  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const val = target.value;
    setSelected(val);
    props.onChange(val);
  };

  return (
    <div class="flex flex-col gap-2 text-left">
      <label class="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Available Subtitles
      </label>
      <select
        value={selected()}
        onChange={handleChange}
        class="w-full bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors duration-300"
      >
        <option value="">No subtitles (None)</option>
        <For each={props.tracks}>
          {(track) => (
            <option value={track.lang}>
              {track.name} ({track.lang})
            </option>
          )}
        </For>
      </select>
    </div>
  );
}
