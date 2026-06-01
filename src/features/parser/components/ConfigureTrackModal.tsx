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
      <div class="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4 sm:p-6 select-none animate-fade-in font-sans">
        
        {/* Modal Window Container (VSCode Panel Style) */}
        <div class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md w-full max-w-xl max-h-[85vh] shadow-2xl p-4 sm:p-5 relative flex flex-col font-sans text-left overflow-hidden">
          
          <button
            onClick={() => props.setShowModal(false)}
            class="absolute top-4 right-4 p-1.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
          
          <div class="flex items-center gap-3 mb-4 pr-8">
            <div class="w-9 h-9 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded flex-shrink-0 border border-blue-500/20">
              <Sparkles class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <h3 class="text-sm font-bold text-zinc-950 dark:text-zinc-100 leading-tight">Configure Custom Track</h3>
              <p class="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 truncate mt-1" title={props.activeTrackFile()?.title}>
                {props.activeTrackFile()?.title}
              </p>
            </div>
          </div>

          {/* Switcher Tab bar (VSCode Style) */}
          <div class="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 w-full mb-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => props.setModalSelectionMode("custom")}
              class={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all select-none min-h-[38px] ${
                props.modalSelectionMode() === "custom"
                  ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500 dark:border-t-blue-400 font-extrabold"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <Film class="w-3.5 h-3.5" />
              Custom Formats
            </button>
            <button
              type="button"
              onClick={() => props.setModalSelectionMode("fallback")}
              class={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all select-none min-h-[38px] ${
                props.modalSelectionMode() === "fallback"
                  ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500 dark:border-t-blue-400 font-extrabold"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-300"
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
                  {/* Select Video Format Panel */}
                  <div class="space-y-2">
                    <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 px-0.5">
                      <Film class="w-3.5 h-3.5 text-blue-500" />
                      <span class="text-[10px] font-bold uppercase tracking-wider">Video Format</span>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1.5 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded custom-scrollbar">
                      <For each={props.activeTrackPayload()?.formats?.filter((f: any) => f.vcodec !== "none" && (f.format_note || f.resolution))}>
                        {(v: any) => {
                          const isSelected = () => props.modalSelectedVideo() === v.format_id;
                          return (
                            <div
                              onClick={() => props.setModalSelectedVideo(isSelected() ? "" : v.format_id)}
                              class={`border cursor-pointer select-none p-2.5 rounded flex items-center justify-between gap-2 text-left min-w-0 transition-colors ${
                                isSelected()
                                  ? "border-blue-500 dark:border-blue-400 bg-blue-50/20 dark:bg-blue-500/5 shadow-sm"
                                  : "border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-800"
                              }`}
                            >
                              <div class="min-w-0">
                                <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 leading-tight block truncate">
                                  {v.format_note || `${v.height}p`} ({v.ext})
                                </span>
                                <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block mt-0.5">
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
                    </div>
                  </div>

                  {/* Select Audio Format Panel */}
                  <div class="space-y-2">
                    <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 px-0.5">
                      <Music class="w-3.5 h-3.5 text-emerald-500" />
                      <span class="text-[10px] font-bold uppercase tracking-wider">Audio Format</span>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1.5 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded custom-scrollbar">
                      <For each={props.activeTrackPayload()?.formats?.filter((f: any) => f.acodec !== "none" && f.vcodec === "none")}>
                        {(a: any) => {
                          const isSelected = () => props.modalSelectedAudio() === a.format_id;
                          return (
                            <div
                              onClick={() => props.setModalSelectedAudio(isSelected() ? "" : a.format_id)}
                              class={`border cursor-pointer select-none p-2.5 rounded flex items-center justify-between gap-2 text-left min-w-0 transition-colors ${
                                isSelected()
                                  ? "border-emerald-500 dark:border-emerald-400 bg-emerald-50/20 dark:bg-emerald-500/5 shadow-sm"
                                  : "border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-800"
                              }`}
                            >
                              <div class="min-w-0">
                                <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 leading-tight block truncate">
                                  {a.format_note || "Audio Only"} ({a.ext})
                                </span>
                                <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block mt-0.5">
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
                    </div>
                  </div>
                </div>
              }
            >
              {/* Select Fallback Quality Panel */}
              <div class="space-y-2">
                <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 px-0.5">
                  <Sliders class="w-3.5 h-3.5 text-blue-500" />
                  <span class="text-[10px] font-bold uppercase tracking-wider">Fallback Quality Preset</span>
                </div>
                
                <div class="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto p-1.5 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded custom-scrollbar">
                  <For each={props.presetList}>
                    {(preset) => {
                      const isSelected = () => props.modalSelectedPreset() === preset.value;
                      return (
                        <div
                          onClick={() => props.setModalSelectedPreset(preset.value)}
                          class={`border cursor-pointer select-none p-2.5 rounded flex items-center justify-between gap-3 text-left min-w-0 transition-colors ${
                            isSelected()
                              ? "border-blue-500 dark:border-blue-400 bg-blue-50/20 dark:bg-blue-500/5 shadow-sm"
                              : "border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-800"
                          }`}
                        >
                          <div class="min-w-0">
                            <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 block">{preset.label}</span>
                            <span class="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono block mt-0.5 truncate">{preset.value}</span>
                          </div>
                          <Show when={isSelected()}>
                            <CheckCircle2 class="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Show>

            {/* Select Subtitles Panel */}
            <div class="space-y-2 pt-1">
              <div class="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 px-0.5">
                <Globe class="w-3.5 h-3.5 text-emerald-500" />
                <span class="text-[10px] font-bold uppercase tracking-wider">Download Subtitles</span>
              </div>
              
              <div class="flex flex-wrap gap-1.5 p-2 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded max-h-36 overflow-y-auto custom-scrollbar">
                <For each={props.modalDisplaySubOptions}>
                  {(opt) => (
                    <label class={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded border cursor-pointer transition-colors shadow-sm ${props.modalSelectedSubs().includes(opt.lang) ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400 font-extrabold" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:border-purple-500"}`}>
                      <input
                        type="checkbox"
                        checked={props.modalSelectedSubs().includes(opt.lang)}
                        onChange={() => props.toggleModalSub(opt.lang)}
                        class="accent-purple-500 w-3 h-3 cursor-pointer"
                      />
                      {opt.name} {opt.lang !== "all" && `(${opt.lang.toUpperCase()})`}
                    </label>
                  )}
                </For>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => props.setShowModal(false)}
              class="px-4 py-2 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-[11px] uppercase tracking-wider min-h-[34px]"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={props.startModalDownload}
              class="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-wider px-5 py-2 rounded shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all min-h-[34px]"
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
