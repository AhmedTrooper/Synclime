import { Show, For, Accessor, Setter } from "solid-js";
import { Sliders, Download, Globe, List, Square, CheckSquare } from "lucide-solid";

interface TrackItem {
  id: string;
  title: string;
  url: string;
  duration: number;
  thumbnails?: Array<{ url: string }>;
}

interface SubtitleOpt {
  lang: string;
  name: string;
}

interface PresetItem {
  label: string;
  value: string;
}

interface PlaylistViewProps {
  payload: Accessor<any>;
  selectedPreset: Accessor<string>;
  setSelectedPreset: Setter<string>;
  presetList: PresetItem[];
  downloadAllPlaylist: () => void;
  selectedTracks: Accessor<string[]>;
  setSelectedTracks: Setter<string[] | ((prev: string[]) => string[])>;
  subOptions: SubtitleOpt[];
  displaySubOptions: SubtitleOpt[];
  selectedSubs: Accessor<string[]>;
  toggleSub: (lang: string) => void;
  parsingTracks: Accessor<Record<string, boolean>>;
  handleParseTrack: (track: any) => void;
  downloadSubtitle: (targetUrl: string, trackTitle: string) => void;
  startDownload: (formatString: string, isAudio: boolean, customName?: string, targetUrl?: string) => void;
  formatDuration: (secs: number) => string;
}

export function PlaylistView(props: PlaylistViewProps) {
  const entries = () => props.payload().entries || [];

  return (
    <div class="flex flex-col gap-4 sm:gap-6 text-left">
      <div class="w-full bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-lg p-3 sm:p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-5">
          <div class="flex flex-col gap-2 max-w-md">
            <div class="flex items-center gap-2 text-purple-500">
              <Sliders class="w-5 h-5" />
              <h3 class="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Playlist Fallback Preferences</h3>
            </div>
            <p class="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Select a fallback preset below. This adaptive quality rule will be mapped sequentially as the format target to all tracks inside this batch queue download.
            </p>
          </div>
          <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2 sm:gap-3.5 min-w-0 w-full md:w-auto">
            <select
              value={props.selectedPreset()}
              onChange={(e) => props.setSelectedPreset(e.currentTarget.value)}
              class="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl min-h-[40px] px-3 outline-none text-xs sm:text-sm font-semibold w-full max-w-full overflow-hidden text-ellipsis"
            >
              <For each={props.presetList}>
                {(preset) => <option value={preset.value}>{preset.label}</option>}
              </For>
            </select>
            <button
              onClick={props.downloadAllPlaylist}
              class="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 sm:px-6 py-2 rounded-lg shadow-sm transition-all duration-300 overflow-hidden min-h-[40px]"
            >
              <Download class="w-4 h-4 flex-shrink-0" />
              <span class="truncate text-[12px] sm:text-sm">
                {props.selectedTracks().length > 0 ? `Download Selected (${props.selectedTracks().length})` : "Download All Tracks"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="w-full bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-lg p-3 sm:p-5 flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <Globe class="w-5 h-5 text-emerald-500" />
          <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {props.subOptions.length > 0 ? "Global Subtitle Selection" : "Global Subtitle Selection (Pre-Given List)"}
          </h3>
        </div>
        <Show
          when={props.displaySubOptions.length > 0}
          fallback={<span class="text-xs text-zinc-500 italic">No subtitles available</span>}
        >
          <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto py-1">
            <For each={props.displaySubOptions}>
              {(opt) => (
                <label class={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer transition-colors shadow-sm ${props.selectedSubs().includes(opt.lang) ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-300 hover:border-purple-500"}`}>
                  <input
                    type="checkbox"
                    checked={props.selectedSubs().includes(opt.lang)}
                    onChange={() => props.toggleSub(opt.lang)}
                    class="accent-purple-500 w-4 h-4 cursor-pointer"
                  />
                  {opt.name} {opt.lang !== "all" && `(${opt.lang.toUpperCase()})`}
                </label>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <List class="w-4 h-4 text-purple-500" />
            <h3 class="text-base font-bold text-zinc-800 dark:text-zinc-200">Playlist Tracks ({entries().length})</h3>
          </div>
          <button
            onClick={() => {
              if (props.selectedTracks().length === entries().length) {
                props.setSelectedTracks([]);
              } else {
                props.setSelectedTracks(entries().map((t: any) => t.id));
              }
            }}
            class="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-bold hover:underline select-none"
          >
            {props.selectedTracks().length === entries().length ? "Deselect All" : "Select All"}
          </button>
        </div>

        <div class="grid grid-cols-1 gap-3 w-full">
          <For each={entries()}>
            {(track: TrackItem, index) => (
              <div class="border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 rounded-lg">
                <div class="p-1.5 sm:p-3 flex flex-row items-center justify-between gap-1.5 sm:gap-4">
                  <button
                    onClick={() => {
                      props.setSelectedTracks((prev: string[]) =>
                        prev.includes(track.id)
                          ? prev.filter((id) => id !== track.id)
                          : [...prev, track.id]
                      );
                    }}
                    class="p-1 text-zinc-400 hover:text-purple-500 transition-colors flex-shrink-0"
                  >
                    <Show when={props.selectedTracks().includes(track.id)} fallback={<Square class="w-4 h-4 sm:w-5 sm:h-5" />}>
                      <CheckSquare class="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                    </Show>
                  </button>

                  <div class="flex items-center gap-1.5 sm:gap-3 flex-grow text-left min-w-0">
                    <span class="text-[9px] sm:text-xs font-bold text-zinc-400 font-mono w-4 sm:w-5">
                      {(index() + 1).toString().padStart(2, "0")}
                    </span>
                    <Show when={track.thumbnails?.[0]?.url}>
                      <img
                        src={track.thumbnails![0].url}
                        alt={track.title}
                        class="w-10 sm:w-14 aspect-video object-cover rounded-md sm:rounded-lg border border-zinc-200 dark:border-white/5 flex-shrink-0"
                      />
                    </Show>
                    <div class="flex flex-col gap-0 min-w-0">
                      <span class="text-[10px] sm:text-xs font-bold text-zinc-900 dark:text-white line-clamp-1 leading-tight">{track.title}</span>
                      <span class="text-[8px] sm:text-[10px] text-zinc-500 dark:text-zinc-400">{props.formatDuration(track.duration)}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 sm:gap-2">
                    <div class="group relative inline-block">
                      <button
                        onClick={() => props.handleParseTrack(track)}
                        disabled={props.parsingTracks()[track.id]}
                        class="p-1.5 sm:p-2 bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 min-h-[32px] flex items-center justify-center"
                      >
                        <Show when={props.parsingTracks()[track.id]} fallback={<Sliders class="w-3.5 h-3.5 sm:w-4 sm:h-4" />}>
                          <span class="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </Show>
                      </button>
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[99] whitespace-nowrap">
                        Configure custom track streams
                      </div>
                    </div>

                    <Show when={props.displaySubOptions.length > 0}>
                      <div class="group relative inline-block">
                        <button
                          onClick={() => props.downloadSubtitle(track.url, track.title)}
                          class="p-1.5 sm:p-2 bg-purple-500/10 hover:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-lg sm:rounded-xl transition-colors min-h-[32px]"
                        >
                          <Globe class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[99] whitespace-nowrap">
                          Download track captions
                        </div>
                      </div>
                    </Show>

                    <div class="group relative inline-block">
                      <button
                        onClick={() => props.startDownload(props.selectedPreset(), false, track.title, track.url)}
                        class="p-1.5 sm:p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 rounded-lg sm:rounded-xl transition-colors min-h-[32px]"
                      >
                        <Download class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <div class="absolute bottom-full right-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 hidden group-hover:block bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white text-[11px] font-semibold border border-zinc-200/80 dark:border-zinc-800 shadow-md px-2.5 py-1 rounded-lg z-[99] whitespace-nowrap">
                        Queue standard track download
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
