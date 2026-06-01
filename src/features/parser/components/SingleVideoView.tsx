import { Show, For, Accessor, Setter } from "solid-js";
import { Sliders, ToggleLeft, Film, Music, CheckCircle2, Download, Globe } from "lucide-solid";

interface FormatItem {
  format_id: string;
  format_note?: string;
  ext?: string;
  resolution?: string;
  width?: number;
  height?: number;
  filesize?: number;
  filesize_approx?: number;
  abr?: number;
}

interface SubtitleOpt {
  lang: string;
  name: string;
}

interface PresetItem {
  label: string;
  value: string;
}

interface SingleVideoViewProps {
  url: string;
  title: string;
  selectionMode: Accessor<"custom" | "fallback">;
  setSelectionMode: Setter<"custom" | "fallback">;
  selectedVideo: Accessor<string>;
  setSelectedVideo: Setter<string>;
  selectedAudio: Accessor<string>;
  setSelectedAudio: Setter<string>;
  selectedPreset: Accessor<string>;
  setSelectedPreset: Setter<string>;
  videoStreams: FormatItem[];
  audioStreams: FormatItem[];
  presetList: PresetItem[];
  getGeneratedFormatString: () => string;
  startDownload: (format: string, isAudio?: boolean) => void;
  displaySubOptions: SubtitleOpt[];
  selectedSubs: Accessor<string[]>;
  toggleSub: (lang: string) => void;
  downloadSubtitle: (targetUrl: string, trackTitle: string) => void;
  formatSize: (bytes: number | null | undefined) => string;
  subOptions: SubtitleOpt[];
}

export function SingleVideoView(props: SingleVideoViewProps) {
  return (
    <div class="flex flex-col-reverse md:grid md:grid-cols-3 gap-4 sm:gap-6 text-left min-w-0 select-none">
      {/* Main Selectors (Layers 1 & 2) */}
      <div class="md:col-span-2 flex flex-col gap-4 sm:gap-6 min-w-0">
        
        {/* Explicit Switcher Interface Tab bar (VSCode Style) */}
        <div class="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 w-full rounded-t-md overflow-hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => props.setSelectionMode("custom")}
            class={`flex items-center gap-2 px-4 py-2.5 border-r border-zinc-250 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider transition-all select-none min-h-[38px] ${
              props.selectionMode() === "custom"
                ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500 dark:border-t-blue-400 font-extrabold"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:text-zinc-850 dark:hover:text-zinc-300"
            }`}
          >
            <Sliders class="w-3.5 h-3.5" />
            Custom Formats
          </button>
          <button
            type="button"
            onClick={() => props.setSelectionMode("fallback")}
            class={`flex items-center gap-2 px-4 py-2.5 border-r border-zinc-250 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider transition-all select-none min-h-[38px] ${
              props.selectionMode() === "fallback"
                ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500 dark:border-t-blue-400 font-extrabold"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:text-zinc-850 dark:hover:text-zinc-300"
            }`}
          >
            <ToggleLeft class="w-3.5 h-3.5" />
            Adaptive Presets
          </button>
        </div>

        <Show
          when={props.selectionMode() === "fallback"}
          fallback={
            <div class="flex flex-col gap-5 min-w-0">
              
              {/* Select Video Stream Pane */}
              <div class="flex flex-col gap-2.5 min-w-0">
                <div class="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 px-0.5">
                  <Film class="w-4 h-4 text-blue-500" />
                  <span class="text-[10px] font-bold uppercase tracking-wider">Select Video Stream</span>
                </div>
                
                <div class="hidden sm:grid sm:grid-cols-2 gap-2.5 min-w-0">
                  <For each={props.videoStreams}>
                    {(v) => {
                      const isSelected = () => props.selectedVideo() === v.format_id;
                      return (
                        <div
                          class={`border cursor-pointer select-none transition-colors rounded p-2.5 flex flex-row items-center justify-between gap-2 text-left min-w-0 ${
                            isSelected()
                              ? "border-blue-500 dark:border-blue-400 bg-blue-50/20 dark:bg-blue-500/5 shadow-sm"
                              : "border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-800"
                          }`}
                          onClick={() => props.setSelectedVideo(isSelected() ? "" : v.format_id)}
                        >
                          <div class="flex flex-col gap-0.5 min-w-0 text-left">
                            <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 leading-tight block truncate">
                              {v.format_note || `${v.height}p`} ({v.ext})
                            </span>
                            <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
                              {v.resolution || `${v.width}x${v.height}`} • {props.formatSize(v.filesize || v.filesize_approx)}
                            </span>
                          </div>
                          <Show when={isSelected()}>
                            <CheckCircle2 class="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                  <Show when={props.videoStreams.length === 0}>
                    <span class="text-[11px] italic text-zinc-500 dark:text-zinc-400 px-0.5">
                      No separate video-only streams discovered.
                    </span>
                  </Show>
                </div>
                
                <div class="block sm:hidden w-full">
                  <select
                    value={props.selectedVideo()}
                    onChange={(e) => props.setSelectedVideo(e.currentTarget.value)}
                    class="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-2 outline-none text-[10px] font-semibold max-w-full text-ellipsis overflow-hidden"
                  >
                    <option value="">(None) Deselect Video Stream</option>
                    <For each={props.videoStreams}>
                      {(v) => (
                        <option value={v.format_id}>
                          {v.format_note || `${v.height}p`} ({v.ext}) - {props.formatSize(v.filesize || v.filesize_approx)}
                        </option>
                      )}
                    </For>
                  </select>
                </div>
              </div>

              {/* Select Audio Stream Pane */}
              <div class="flex flex-col gap-2.5 min-w-0">
                <div class="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 px-0.5">
                  <Music class="w-4 h-4 text-emerald-500" />
                  <span class="text-[10px] font-bold uppercase tracking-wider">Select Audio Stream</span>
                </div>
                
                <div class="hidden sm:grid sm:grid-cols-2 gap-2.5 min-w-0">
                  <For each={props.audioStreams}>
                    {(a) => {
                      const isSelected = () => props.selectedAudio() === a.format_id;
                      return (
                        <div
                          class={`border cursor-pointer select-none transition-colors rounded p-2.5 flex flex-row items-center justify-between gap-2 text-left min-w-0 ${
                            isSelected()
                              ? "border-emerald-500 dark:border-emerald-400 bg-emerald-50/20 dark:bg-emerald-500/5 shadow-sm"
                              : "border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-800"
                          }`}
                          onClick={() => props.setSelectedAudio(isSelected() ? "" : a.format_id)}
                        >
                          <div class="flex flex-col gap-0.5 min-w-0 text-left">
                            <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 leading-tight block truncate">
                              {a.format_note || "Audio Only"} ({a.ext})
                            </span>
                            <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
                              {a.abr ? `${a.abr.toFixed(0)}kbps` : "HQ"} • {props.formatSize(a.filesize || a.filesize_approx)}
                            </span>
                          </div>
                          <Show when={isSelected()}>
                            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                  <Show when={props.audioStreams.length === 0}>
                    <span class="text-[11px] italic text-zinc-500 dark:text-zinc-400 px-0.5">
                      No separate audio-only streams discovered.
                    </span>
                  </Show>
                </div>
                
                <div class="block sm:hidden w-full">
                  <select
                    value={props.selectedAudio()}
                    onChange={(e) => props.setSelectedAudio(e.currentTarget.value)}
                    class="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-2 outline-none text-[10px] font-semibold max-w-full text-ellipsis overflow-hidden"
                  >
                    <option value="">(None) Deselect Audio Stream</option>
                    <For each={props.audioStreams}>
                      {(a) => (
                        <option value={a.format_id}>
                          {a.format_note || "Audio Only"} ({a.ext}) - {props.formatSize(a.filesize || a.filesize_approx)}
                        </option>
                      )}
                    </For>
                  </select>
                </div>
              </div>
            </div>
          }
        >
          {/* Select Fallback Preset Pane */}
          <div class="flex flex-col gap-2.5 min-w-0 animate-fade-in">
            <div class="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 px-0.5">
              <Sliders class="w-4 h-4 text-blue-500" />
              <span class="text-[10px] font-bold uppercase tracking-wider">Select Fallback Preference Preset</span>
            </div>
            
            <div class="hidden sm:grid sm:grid-cols-1 gap-2.5 min-w-0">
              <For each={props.presetList}>
                {(preset) => {
                  const isSelected = () => props.selectedPreset() === preset.value;
                  return (
                    <div
                      class={`border cursor-pointer select-none transition-colors rounded p-2.5 flex flex-row items-center justify-between gap-2 text-left min-w-0 ${
                        isSelected()
                          ? "border-blue-500 dark:border-blue-400 bg-blue-50/20 dark:bg-blue-500/5 shadow-sm"
                          : "border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-800"
                      }`}
                      onClick={() => props.setSelectedPreset(preset.value)}
                    >
                      <div class="flex flex-col gap-0.5 min-w-0 text-left">
                        <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 leading-tight block">
                          {preset.label}
                        </span>
                        <span class="text-[9px] text-zinc-550 dark:text-zinc-400 font-mono block truncate">
                          {preset.value}
                        </span>
                      </div>
                      <Show when={isSelected()}>
                        <CheckCircle2 class="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
            
            <div class="block sm:hidden w-full">
              <select
                value={props.selectedPreset()}
                onChange={(e) => props.setSelectedPreset(e.currentTarget.value)}
                class="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-2 outline-none text-[10px] font-semibold max-w-full text-ellipsis overflow-hidden"
              >
                <For each={props.presetList}>
                  {(preset) => (
                    <option value={preset.value}>
                      {preset.label}
                    </option>
                  )}
                </For>
              </select>
            </div>
          </div>
        </Show>
      </div>

      {/* Action & Sidebar Details Panel */}
      <div class="flex flex-col gap-5 min-w-0">
        
        {/* Download Manager Panel */}
        <div class="flex flex-col gap-2 min-w-0">
          <div class="flex items-center gap-1.5 px-0.5 text-zinc-400 dark:text-zinc-500">
            <Sliders class="w-3.5 h-3.5" />
            <h3 class="text-[10px] font-bold uppercase tracking-wider">Download Manager</h3>
          </div>
          
          <div class="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-md p-3.5 min-w-0">
            <div class="flex flex-col gap-3 min-w-0">
              <div class="flex flex-col gap-1.5 text-left min-w-0">
                <label class="text-[9px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Generated Format String</label>
                <div class="bg-zinc-950 text-zinc-250 dark:bg-black border border-zinc-850 p-2.5 rounded font-mono text-[9px] break-all select-text">
                  {props.getGeneratedFormatString()}
                </div>
              </div>
              <button
                onClick={() => props.startDownload(props.getGeneratedFormatString(), props.getGeneratedFormatString().includes("bestaudio") && !props.getGeneratedFormatString().includes("bestvideo"))}
                class="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold w-full py-2.5 rounded hover:-translate-y-0.5 active:translate-y-0 transition-all overflow-hidden px-2 min-h-[36px]"
              >
                <Download class="w-4 h-4 flex-shrink-0" />
                <span class="truncate text-[11px] uppercase tracking-wider font-extrabold">Queue Download</span>
              </button>
            </div>
          </div>
        </div>

        {/* Subtitles Panel */}
        <div class="flex flex-col gap-2 min-w-0">
          <div class="flex items-center gap-1.5 px-0.5 text-zinc-400 dark:text-zinc-500">
            <Globe class="w-3.5 h-3.5 text-emerald-500" />
            <h3 class="text-[10px] font-bold uppercase tracking-wider">Language Subtitles</h3>
          </div>
          
          <div class="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-md p-3.5 min-w-0">
            <div class="flex flex-col gap-3.5 min-w-0">
              <Show
                when={props.displaySubOptions.length > 0}
                fallback={
                  <div class="text-center py-4 flex flex-col items-center gap-1.5">
                    <Globe class="w-5 h-5 text-zinc-450 dark:text-zinc-650" />
                    <span class="text-[10px] text-zinc-500 dark:text-zinc-400 italic">No subtitles found.</span>
                  </div>
                }
              >
                <div class="flex flex-col gap-1.5 text-left min-w-0">
                  <label class="text-[9px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">
                    Select Languages {props.subOptions.length === 0 && "(Pre-Given List)"}
                  </label>
                  <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded min-w-0">
                    <For each={props.displaySubOptions}>
                      {(opt) => (
                        <label class={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded border cursor-pointer transition-colors shadow-sm ${props.selectedSubs().includes(opt.lang) ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400 font-extrabold" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:border-purple-500"}`}>
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
                </div>
                <button
                  onClick={() => props.downloadSubtitle(props.url, props.title)}
                  disabled={props.selectedSubs().length === 0}
                  class="flex items-center justify-center gap-1.5 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-750 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-250 dark:border-zinc-700 w-full py-2 rounded shadow-sm disabled:opacity-50 min-h-[34px] px-2 text-[10px] uppercase tracking-wider"
                >
                  <Download class="w-3.5 h-3.5" />
                  Download Subtitle
                </button>
              </Show>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
