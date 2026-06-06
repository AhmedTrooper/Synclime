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
    <div class="flex flex-col gap-4 sm:gap-5 text-left select-none">
      
      {/* Playlist Fallback Preferences Pane */}
      <div class="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex flex-col gap-1 max-w-md">
            <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
              <Sliders class="w-4 h-4 text-blue-500" />
              <h3 class="text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Playlist Fallback Preferences</h3>
            </div>
            <p class="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
              Select a fallback quality preset. This configuration rules target priorities for all media downloads inside this batch queue.
            </p>
          </div>
          
          <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 min-w-0 w-full md:w-auto">
            <select
              value={props.selectedPreset()}
              onChange={(e) => props.setSelectedPreset(e.currentTarget.value)}
              class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded min-h-[36px] px-2.5 outline-none text-[11px] font-semibold w-full md:w-48 overflow-hidden text-ellipsis"
            >
              <For each={props.presetList}>
                {(preset) => <option value={preset.value}>{preset.label}</option>}
              </For>
            </select>
            
            <button
              onClick={props.downloadAllPlaylist}
              class="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all overflow-hidden min-h-[36px]"
            >
              <Download class="w-4 h-4 flex-shrink-0" />
              <span class="truncate text-[10px] uppercase tracking-wider font-extrabold">
                {props.selectedTracks().length > 0 ? `Download (${props.selectedTracks().length})` : "Download Playlist"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Subtitle Selection Pane */}
      <div class="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 flex flex-col gap-2.5">
        <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 px-0.5">
          <Globe class="w-4 h-4 text-emerald-500" />
          <h3 class="text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            {props.subOptions.length > 0 ? "Global Subtitle Selection" : "Global Subtitle Selection (Pre-Given List)"}
          </h3>
        </div>
        
        <Show
          when={props.displaySubOptions.length > 0}
          fallback={<span class="text-[10px] text-zinc-500 italic px-0.5">No subtitles available</span>}
        >
          <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded">
            <For each={props.displaySubOptions}>
              {(opt) => (
                <label class={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded border cursor-pointer transition-colors shadow-sm ${props.selectedSubs().includes(opt.lang) ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400 font-extrabold" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/85 text-zinc-700 dark:text-zinc-300 hover:border-purple-500"}`}>
                  <input
                    type="checkbox"
                    checked={props.selectedSubs().includes(opt.lang)}
                    onChange={() => props.toggleSub(opt.lang)}
                    class="accent-purple-500 w-3 h-3 cursor-pointer"
                  />
                  {opt.name} {opt.lang !== "all" && `(${opt.lang.toUpperCase()})`}
                </label>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Track List Pane */}
      <div class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between gap-2 px-0.5">
          <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
            <List class="w-3.5 h-3.5 text-purple-500" />
            <h3 class="text-[10px] font-bold uppercase tracking-wider">Playlist Tracks ({entries().length})</h3>
          </div>
          
          <button
            onClick={() => {
              if (props.selectedTracks().length === entries().length) {
                props.setSelectedTracks([]);
              } else {
                props.setSelectedTracks(entries().map((t: any) => t.id));
              }
            }}
            class="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wider hover:underline select-none"
          >
            {props.selectedTracks().length === entries().length ? "Deselect All" : "Select All"}
          </button>
        </div>

        <div class="grid grid-cols-1 gap-2 w-full">
          <For each={entries()}>
            {(track: TrackItem, index) => (
              <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-md shadow-sm transition-colors hover:bg-zinc-50/20 dark:hover:bg-zinc-900/10">
                <div class="p-2 sm:p-2.5 flex flex-row items-center justify-between gap-1.5 sm:gap-4 min-w-0">
                  
                  {/* Select Track Button */}
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
                    <Show when={props.selectedTracks().includes(track.id)} fallback={<Square class="w-4 h-4" />}>
                      <CheckSquare class="w-4 h-4 text-purple-500" />
                    </Show>
                  </button>

                  {/* Track Details Layout */}
                  <div class="flex items-center gap-2 sm:gap-3 flex-grow text-left min-w-0">
                    <span class="text-[9px] font-bold text-zinc-400 font-mono w-4">
                      {(index() + 1).toString().padStart(2, "0")}
                    </span>
                    <Show when={track.thumbnails?.[0]?.url}>
                      <img
                        src={track.thumbnails![0].url}
                        alt={track.title}
                        class="w-10 sm:w-16 aspect-video object-cover rounded border border-zinc-200 dark:border-zinc-800 flex-shrink-0"
                      />
                    </Show>
                    <div class="flex flex-col gap-0.5 min-w-0">
                      <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 line-clamp-1 leading-snug">{track.title}</span>
                      <span class="text-[9px] font-mono text-zinc-500 dark:text-zinc-400">{props.formatDuration(track.duration)}</span>
                    </div>
                  </div>

                  {/* Track Actions Layout */}
                  <div class="flex items-center gap-1.5 sm:gap-2">
                    
                    {/* Custom Config Button */}
                    <div class="group relative inline-block">
                      <button
                        onClick={() => props.handleParseTrack(track)}
                        disabled={props.parsingTracks()[track.id]}
                        class="p-1.5 bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded transition-colors disabled:opacity-50 min-h-[30px] flex items-center justify-center"
                      >
                        <Show when={props.parsingTracks()[track.id]} fallback={<Sliders class="w-3.5 h-3.5" />}>
                          <span class="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </Show>
                      </button>
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-900 dark:bg-zinc-950 text-white text-[9px] font-bold uppercase tracking-wider shadow-md px-2 py-1 rounded z-[99] border border-zinc-800 whitespace-nowrap">
                        Configure Streams
                      </div>
                    </div>

                    {/* Download Subtitles Button */}
                    <Show when={props.displaySubOptions.length > 0}>
                      <div class="group relative inline-block">
                        <button
                          onClick={() => props.downloadSubtitle(track.url, track.title)}
                          class="p-1.5 bg-purple-500/10 hover:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded transition-colors min-h-[30px]"
                        >
                          <Globe class="w-3.5 h-3.5" />
                        </button>
                        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-900 dark:bg-zinc-950 text-white text-[9px] font-bold uppercase tracking-wider shadow-md px-2 py-1 rounded z-[99] border border-zinc-800 whitespace-nowrap">
                          Download Captions
                        </div>
                      </div>
                    </Show>

                    {/* Standard Download Button */}
                    <div class="group relative inline-block">
                      <button
                        onClick={() => props.startDownload(props.selectedPreset(), false, track.title, track.url)}
                        class="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded transition-colors min-h-[30px]"
                      >
                        <Download class="w-3.5 h-3.5" />
                      </button>
                      <div class="absolute bottom-full right-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-900 dark:bg-zinc-950 text-white text-[9px] font-bold uppercase tracking-wider shadow-md px-2 py-1 rounded z-[99] border border-zinc-800 whitespace-nowrap">
                        Add To Queue
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
