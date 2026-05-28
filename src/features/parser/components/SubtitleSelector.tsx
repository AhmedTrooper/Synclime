import { useState } from "react";

interface SubtitleTrack {
  lang: string;
  name: string;
}

interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  onChange: (selectedLang: string) => void;
}

export function SubtitleSelector({ tracks, onChange }: SubtitleSelectorProps) {
  const [selected, setSelected] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelected(val);
    onChange(val);
  };

  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Available Subtitles
      </label>
      <select
        value={selected}
        onChange={handleChange}
        className="w-full bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors duration-300"
      >
        <option value="">No subtitles (None)</option>
        {tracks.map((track) => (
          <option key={track.lang} value={track.lang}>
            {track.name} ({track.lang})
          </option>
        ))}
      </select>
    </div>
  );
}
