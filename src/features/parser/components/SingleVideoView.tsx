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
    <div class="flex flex-col-reverse md:grid md:grid-cols-3 gap-4 sm:gap-6 text-left min-w-0">
      {/* Main Selectors (Layers 1 & 2) */}
      <div class="md:col-span-2 flex flex-col gap-4 sm:gap-6 min-w-0">
        {/* Explicit Switcher Interface Tab bar */}
        <div class="flex flex-col sm:flex-row bg-zinc-100/80 dark:bg-white/5 border border-zinc-200 dark:border-white/5 p-1 rounded-2xl w-full sm:self-start shadow-inner gap-1 sm:gap-0">
          <button
            type="button"
            onClick={() => props.setSelectionMode("custom")}
            class={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 sm:py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-wider transition-all select-none ${
              props.selectionMode() === "custom"
                ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-white/5"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            <Sliders class="w-3.5 h-3.5" />
            Custom Formats (Layer 1)
          </button>
          <button
            type="button"
            onClick={() => props.setSelectionMode("fallback")}
            class={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 sm:py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-wider transition-all select-none ${
              props.selectionMode() === "fallback"
                ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-white/5"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            <ToggleLeft class="w-3.5 h-3.5" />
            Adaptive Presets (Layer 2)
          </button>
        </div>

        <Show
          when={props.selectionMode() === "fallback"}
          fallback={
            <div class="flex flex-col gap-6 min-w-0">
              <div class="flex flex-col gap-3 min-w-0">
                <div class="flex items-center gap-2 text-zinc-500">
                  <Film class="w-4 h-4 text-blue-500" />
                  <span class="text-xs font-bold uppercase tracking-wider">Select Video Stream</span>
                </div>
                <div class="hidden sm:grid sm:grid-cols-2 gap-3 min-w-0">
                  <For each={props.videoStreams}>
                    {(v) => {
                      const isSelected = () => props.selectedVideo() === v.format_id;
                      return (
                        <div
                          class={`border cursor-pointer select-none transition-colors rounded-lg p-3 flex flex-row items-center justify-between gap-2 text-left min-w-0 ${
                            isSelected()
                              ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/10"
                              : "border-zinc-200 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                          }`}
                          onClick={() => props.setSelectedVideo(isSelected() ? "" : v.format_id)}
                        >
                          <div class="flex flex-col gap-0.5 min-w-0 text-left">
                            <span class="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight block truncate">
                              {v.format_note || `${v.height}p`} ({v.ext})
                            </span>
                            <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
                              {v.resolution || `${v.width}x${v.height}`} • {props.formatSize(v.filesize || v.filesize_approx)}
                            </span>
                          </div>
                          <Show when={isSelected()}>
                            <CheckCircle2 class="w-4 h-4 text-blue-500 flex-shrink-0" />
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                  <Show when={props.videoStreams.length === 0}>
                    <span class="text-xs italic text-zinc-500 dark:text-zinc-400">
                      No separate video-only streams discovered.
                    </span>
                  </Show>
                </div>
                <div class="block sm:hidden w-full">
                  <select
                    value={props.selectedVideo()}
                    onChange={(e) => props.setSelectedVideo(e.currentTarget.value)}
                    class="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-lg px-2 py-2 outline-none text-[10px] font-semibold max-w-full text-ellipsis overflow-hidden animate-fade-in"
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

              <div class="flex flex-col gap-3 min-w-0">
                <div class="flex items-center gap-2 text-zinc-500">
                  <Music class="w-4 h-4 text-emerald-500" />
                  <span class="text-xs font-bold uppercase tracking-wider">Select Audio Stream</span>
                </div>
                <div class="hidden sm:grid sm:grid-cols-2 gap-3 min-w-0">
                  <For each={props.audioStreams}>
                    {(a) => {
                      const isSelected = () => props.selectedAudio() === a.format_id;
                      return (
                        <div
                          class={`border cursor-pointer select-none transition-colors rounded-lg p-3 flex flex-row items-center justify-between gap-2 text-left min-w-0 ${
                            isSelected()
                              ? "border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                              : "border-zinc-200 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                          }`}
                          onClick={() => props.setSelectedAudio(isSelected() ? "" : a.format_id)}
                        >
                          <div class="flex flex-col gap-0.5 min-w-0 text-left">
                            <span class="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight block truncate">
                              {a.format_note || "Audio Only"} ({a.ext})
                            </span>
                            <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
                              {a.abr ? `${a.abr.toFixed(0)}kbps` : "HQ"} • {props.formatSize(a.filesize || a.filesize_approx)}
                            </span>
                          </div>
                          <Show when={isSelected()}>
                            <CheckCircle2 class="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                  <Show when={props.audioStreams.length === 0}>
                    <span class="text-xs italic text-zinc-500 dark:text-zinc-400">
                      No separate audio-only streams discovered.
                    </span>
                  </Show>
                </div>
                <div class="block sm:hidden w-full">
                  <select
                    value={props.selectedAudio()}
                    onChange={(e) => props.setSelectedAudio(e.currentTarget.value)}
                    class="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-lg px-2 py-2 outline-none text-[10px] font-semibold max-w-full text-ellipsis overflow-hidden"
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
          <div class="flex flex-col gap-4 min-w-0 animate-fade-in">
            <div class="flex items-center gap-2 text-zinc-500">
              <Sliders class="w-4 h-4 text-blue-500" />
              <span class="text-xs font-bold uppercase tracking-wider">Select Fallback Preference Preset</span>
            </div>
            <div class="hidden sm:grid sm:grid-cols-1 gap-3 min-w-0">
              <For each={props.presetList}>
                {(preset) => {
                  const isSelected = () => props.selectedPreset() === preset.value;
                  return (
                    <div
                      class={`border cursor-pointer select-none transition-colors rounded-lg p-3 flex flex-row items-center justify-between gap-2 text-left min-w-0 ${
                        isSelected()
                          ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/10"
                          : "border-zinc-200 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                      }`}
                      onClick={() => props.setSelectedPreset(preset.value)}
                    >
                      <div class="flex flex-col gap-1 min-w-0 text-left">
                        <span class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white leading-tight block">
                          {preset.label}
                        </span>
                        <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
                          {preset.value}
                        </span>
                      </div>
                      <Show when={isSelected()}>
                        <CheckCircle2 class="w-4 h-4 text-blue-500 flex-shrink-0" />
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
                class="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-lg px-2 py-2 outline-none text-[10px] font-semibold max-w-full text-ellipsis overflow-hidden"
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
      <div class="flex flex-col gap-6 min-w-0">
        <div class="flex flex-col gap-4 min-w-0">
          <div class="flex items-center gap-2">
            <Sliders class="w-4 h-4 text-zinc-500" />
            <h3 class="text-base font-bold text-zinc-800 dark:text-zinc-200">Download Manager</h3>
          </div>
          <div class="border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 rounded-lg p-3 sm:p-4 min-w-0">
            <div class="flex flex-col gap-3 sm:gap-5 min-w-0">
              <div class="flex flex-col gap-2 text-left min-w-0">
                <label class="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Generated Format String</label>
                <div class="bg-zinc-900 text-zinc-200 dark:bg-black border border-zinc-800 p-3 rounded-2xl font-mono text-[10px] break-all select-text shadow-inner">
                  {props.getGeneratedFormatString()}
                </div>
              </div>
              <button
                onClick={() => props.startDownload(props.getGeneratedFormatString(), props.getGeneratedFormatString().includes("bestaudio") && !props.getGeneratedFormatString().includes("bestvideo"))}
                class="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium w-full py-2.5 rounded-lg shadow-sm transition-all duration-300 overflow-hidden px-2 min-h-[38px]"
              >
                <Download class="w-4 h-4 flex-shrink-0" />
                <span class="truncate text-xs sm:text-sm font-bold">Download Media</span>
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-4 min-w-0">
          <div class="flex items-center gap-2">
            <Globe class="w-4 h-4 text-emerald-500" />
            <h3 class="text-base font-bold text-zinc-800 dark:text-zinc-200">Language Subtitles</h3>
          </div>
          <div class="border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 rounded-lg p-3 min-w-0">
            <div class="flex flex-col gap-4 min-w-0">
              <Show
                when={props.displaySubOptions.length > 0}
                fallback={
                  <div class="text-center py-6 flex flex-col items-center gap-2">
                    <Globe class="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                    <span class="text-xs text-zinc-500 dark:text-zinc-400 italic">No subtitles found in this file extraction.</span>
                  </div>
                }
              >
                <div class="flex flex-col gap-2 text-left min-w-0">
                  <label class="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Select Languages {props.subOptions.length === 0 && "(Pre-Given List)"}
                  </label>
                  <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl min-w-0">
                    <For each={props.displaySubOptions}>
                      {(opt) => (
                        <label class={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors shadow-sm ${props.selectedSubs().includes(opt.lang) ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400 font-extrabold" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-300 hover:border-purple-500"}`}>
                          <input
                            type="checkbox"
                            checked={props.selectedSubs().includes(opt.lang)}
                            onChange={() => props.toggleSub(opt.lang)}
                            class="accent-purple-500 w-3.5 h-3.5 cursor-pointer"
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
                  class="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium border border-zinc-200 dark:border-zinc-700 w-full py-2.5 rounded-lg transition-all duration-300 disabled:opacity-50 min-h-[38px] px-2 text-xs font-bold"
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
