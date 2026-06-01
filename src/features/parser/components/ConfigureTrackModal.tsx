import { Show, For, Accessor, Setter } from "solid-js";
import { X, Sparkles, Film, ToggleLeft, Music, CheckCircle2, Download, Globe, Sliders } from "lucide-solid";

interface SubtitleOpt {
  lang: string;
  name: string;
}

interface PresetItem {
  label: string;
  value: string;
}

interface ConfigureTrackModalProps {
  showModal: Accessor<boolean>;
  setShowModal: Setter<boolean>;
  activeTrackPayload: Accessor<any>;
  activeTrackFile: Accessor<any>;
  modalSelectionMode: Accessor<"custom" | "fallback">;
  setModalSelectionMode: Setter<"custom" | "fallback">;
  modalSelectedVideo: Accessor<string>;
  setModalSelectedVideo: Setter<string>;
  modalSelectedAudio: Accessor<string>;
  setModalSelectedAudio: Setter<string>;
  modalSelectedPreset: Accessor<string>;
  setModalSelectedPreset: Setter<string>;
  modalSelectedSubs: Accessor<string[]>;
  toggleModalSub: (lang: string) => void;
  modalDisplaySubOptions: SubtitleOpt[];
  presetList: PresetItem[];
  formatSize: (bytes: number | null | undefined) => string;
  startModalDownload: () => void;
}

export function ConfigureTrackModal(props: ConfigureTrackModalProps) {
  return (
    <Show when={props.showModal() && props.activeTrackPayload()}>
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 select-none animate-fade-in font-sans">
        <div class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl max-h-[85vh] shadow-2xl p-5 sm:p-6 relative flex flex-col font-sans text-left overflow-hidden">
          <button
            onClick={() => props.setShowModal(false)}
            class="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
          <div class="flex items-center gap-3 mb-4 pr-8">
            <div class="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-lg flex-shrink-0">
              <Sparkles class="w-5 h-5 animate-pulse" />
            </div>
            <div class="min-w-0">
              <h3 class="text-sm font-bold text-zinc-950 dark:text-white leading-tight">Configure Custom Track</h3>
              <p class="text-[10px] text-zinc-400 truncate mt-0.5" title={props.activeTrackFile()?.title}>
                {props.activeTrackFile()?.title}
              </p>
            </div>
          </div>

          <div class="flex bg-zinc-100 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 p-0.5 rounded-xl w-full shadow-inner mb-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => props.setModalSelectionMode("custom")}
              class={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] sm:text-xs font-bold tracking-wider transition-all ${
                props.modalSelectionMode() === "custom"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <Film class="w-3.5 h-3.5" />
              Custom Formats
            </button>
            <button
              type="button"
              onClick={() => props.setModalSelectionMode("fallback")}
              class={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] sm:text-xs font-bold tracking-wider transition-all ${
                props.modalSelectionMode() === "fallback"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <ToggleLeft class="w-3.5 h-3.5" />
              Adaptive Presets
            </button>
          </div>

          <div class="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar pb-2">
            <Show
              when={props.modalSelectionMode() === "fallback"}
              fallback={
                <div class="space-y-4">
                  <div class="space-y-2">
                    <div class="flex items-center gap-1.5 text-zinc-400">
                      <Film class="w-3.5 h-3.5 text-blue-500" />
                      <span class="text-[10px] font-bold uppercase tracking-wider">Video Format</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl custom-scrollbar">
                      <For each={props.activeTrackPayload()?.formats?.filter((f: any) => f.vcodec !== "none" && (f.format_note || f.resolution))}>
                        {(v: any) => {
                          const isSelected = () => props.modalSelectedVideo() === v.format_id;
                          return (
                            <div
                              onClick={() => props.setModalSelectedVideo(isSelected() ? "" : v.format_id)}
                              class={`border cursor-pointer select-none p-2.5 rounded-lg flex items-center justify-between gap-2 text-left min-w-0 transition-colors ${
                                isSelected()
                                  ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-500/10"
                                  : "border-zinc-200/60 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                              }`}
                            >
                              <div class="min-w-0">
                                <span class="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight block truncate">
                                  {v.format_note || `${v.height}p`} ({v.ext})
                                </span>
                                <span class="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono block mt-0.5">
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
                    </div>
                  </div>

                  <div class="space-y-2">
                    <div class="flex items-center gap-1.5 text-zinc-400">
                      <Music class="w-3.5 h-3.5 text-emerald-500" />
                      <span class="text-[10px] font-bold uppercase tracking-wider">Audio Format</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl custom-scrollbar">
                      <For each={props.activeTrackPayload()?.formats?.filter((f: any) => f.acodec !== "none" && f.vcodec === "none")}>
                        {(a: any) => {
                          const isSelected = () => props.modalSelectedAudio() === a.format_id;
                          return (
                            <div
                              onClick={() => props.setModalSelectedAudio(isSelected() ? "" : a.format_id)}
                              class={`border cursor-pointer select-none p-2.5 rounded-lg flex items-center justify-between gap-2 text-left min-w-0 transition-colors ${
                                isSelected()
                                  ? "border-emerald-500 dark:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10"
                                  : "border-zinc-200/60 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                              }`}
                            >
                              <div class="min-w-0">
                                <span class="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight block truncate">
                                  {a.format_note || "Audio Only"} ({a.ext})
                                </span>
                                <span class="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono block mt-0.5">
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
                    </div>
                  </div>
                </div>
              }
            >
              <div class="space-y-2">
                <div class="flex items-center gap-1.5 text-zinc-400">
                  <Sliders class="w-3.5 h-3.5 text-blue-500" />
                  <span class="text-[10px] font-bold uppercase tracking-wider">Fallback Quality Preset</span>
                </div>
                <div class="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto p-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl custom-scrollbar">
                  <For each={props.presetList}>
                    {(preset) => {
                      const isSelected = () => props.modalSelectedPreset() === preset.value;
                      return (
                        <div
                          onClick={() => props.setModalSelectedPreset(preset.value)}
                          class={`border cursor-pointer select-none p-2.5 rounded-lg flex items-center justify-between gap-3 text-left min-w-0 transition-colors ${
                            isSelected()
                              ? "border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-500/10"
                              : "border-zinc-200/60 dark:border-white/5 bg-white dark:bg-black/20 hover:border-zinc-300 dark:hover:border-white/10"
                          }`}
                        >
                          <div class="min-w-0">
                            <span class="text-[11px] font-bold text-zinc-900 dark:text-white block">{preset.label}</span>
                            <span class="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono block mt-0.5 truncate">{preset.value}</span>
                          </div>
                          <Show when={isSelected()}>
                            <CheckCircle2 class="w-4.5 h-4.5 text-blue-500 flex-shrink-0" />
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Show>

            <div class="space-y-2 pt-1">
              <div class="flex items-center gap-1.5 text-zinc-400">
                <Globe class="w-3.5 h-3.5 text-emerald-500" />
                <span class="text-[10px] font-bold uppercase tracking-wider">Download Subtitles</span>
              </div>
              <div class="flex flex-wrap gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-36 overflow-y-auto custom-scrollbar">
                <For each={props.modalDisplaySubOptions}>
                  {(opt) => (
                    <label class={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors shadow-sm ${props.modalSelectedSubs().includes(opt.lang) ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400 font-extrabold" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-300 hover:border-purple-500"}`}>
                      <input
                        type="checkbox"
                        checked={props.modalSelectedSubs().includes(opt.lang)}
                        onChange={() => props.toggleModalSub(opt.lang)}
                        class="accent-purple-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      {opt.name} {opt.lang !== "all" && `(${opt.lang.toUpperCase()})`}
                    </label>
                  )}
                </For>
              </div>
            </div>
          </div>

          <div class="pt-3.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => props.setShowModal(false)}
              class="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-xs min-h-[34px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={props.startModalDownload}
              class="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 dark:bg-blue-50 dark:hover:bg-blue-400 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] min-h-[34px]"
            >
              <Download class="w-3.5 h-3.5" />
              Add to Queue
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
