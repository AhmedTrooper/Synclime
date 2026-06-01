import { onMount, createSignal, For, Show } from "solid-js";
import { useUIStore } from "../store/useUIStore";
import { FileWarning, Database, Trash2, ChevronRight, ChevronDown, CheckCircle2, AlertTriangle } from "lucide-solid";
import { invoke } from "@tauri-apps/api/core";

interface ErrorLog {
  slug: string;
  download_job_slug: string;
  command_executed: string;
  error_message: string;
  is_resolved: number;
  timestamp: string;
}

interface ParseLog {
  slug: string;
  parsed_file_slug: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number;
  command_executed: string;
  exit_code: number | null;
  bytes_returned: number;
}

export default function Logs() {
  const [activeTab, setActiveTab] = createSignal<"errors" | "parses">("errors");
  const [errorLogs, setErrorLogs] = createSignal<ErrorLog[]>([]);
  const [parseLogs, setParseLogs] = createSignal<ParseLog[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [selectedLogSlug, setSelectedLogSlug] = createSignal<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        const [errors, parses] = await Promise.all([
          invoke<ErrorLog[]>("get_error_logs"),
          invoke<ParseLog[]>("get_parse_logs")
        ]);
        setErrorLogs(errors);
        setParseLogs(parses);
      }
    } catch (err) {
      console.error("Failed to load logs from SQLite:", err);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    useUIStore.setActivePath("/logs");
    loadLogs();
  });

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to permanently clear all SQLite logs?")) return;
    try {
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        await invoke("clear_all_logs");
        setErrorLogs([]);
        setParseLogs([]);
        setSelectedLogSlug(null);
      }
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleString();
    } catch {
      return isoStr;
    }
  };

  const hasLogs = () => (activeTab() === "errors" && errorLogs().length > 0) || (activeTab() === "parses" && parseLogs().length > 0);

  return (
    <div class="flex flex-col gap-5 w-full max-w-4xl mx-auto h-full py-2 select-none animate-fade-in font-sans text-xs sm:text-sm">
      
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 bg-zinc-600 rounded-md text-white shadow-sm dark:bg-zinc-800">
            <Database class="w-4 h-4 text-blue-500" />
          </div>
          <div class="text-left">
            <h1 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-white tracking-tight">System & Error Logs</h1>
            <p class="text-[10px] text-zinc-400">Query SQLite transaction records directly</p>
          </div>
        </div>
        
        <Show when={hasLogs()}>
          <button
            onClick={handleClearLogs}
            class="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold rounded-md transition-colors text-[10px] sm:text-[11px]"
          >
            <Trash2 class="w-3.5 h-3.5" />
            Clear Logs
          </button>
        </Show>
      </div>

      <div class="flex border-b border-zinc-200 dark:border-zinc-800 gap-2">
        <button
          onClick={() => { setActiveTab("errors"); setSelectedLogSlug(null); loadLogs(); }}
          class={`px-4 py-2 border-b-2 font-bold transition-all text-xs ${
            activeTab() === "errors"
              ? "border-blue-500 text-blue-600 dark:text-blue-400 font-black"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          Download Errors ({errorLogs().length})
        </button>
        <button
          onClick={() => { setActiveTab("parses"); setSelectedLogSlug(null); loadLogs(); }}
          class={`px-4 py-2 border-b-2 font-bold transition-all text-xs ${
            activeTab() === "parses"
              ? "border-blue-500 text-blue-600 dark:text-blue-400 font-black"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          Metadata Discovery Logs ({parseLogs().length})
        </button>
      </div>

      <div class="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
        <Show when={loading()} fallback={
          <div class="space-y-2">
            
            <Show when={activeTab() === "errors"}>
              <For each={errorLogs()}>
                {(log) => {
                  const isSelected = () => selectedLogSlug() === log.slug;
                  return (
                    <div
                      class={`border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/40 transition-all ${
                        isSelected() ? "ring-2 ring-blue-500/20 border-blue-500/35" : ""
                      }`}
                    >
                      <button
                        onClick={() => setSelectedLogSlug(isSelected() ? null : log.slug)}
                        class="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 text-left transition-colors"
                      >
                        <div class="flex items-start gap-3 min-w-0 flex-grow">
                          <div class="p-1 rounded-md bg-red-500/10 text-red-500 flex-shrink-0 mt-0.5">
                            <AlertTriangle class="w-4 h-4" />
                          </div>
                          <div class="flex flex-col min-w-0 flex-grow pr-3">
                            <span class="font-bold text-zinc-800 dark:text-zinc-200 break-all line-clamp-1">{log.error_message}</span>
                            <span class="text-[10px] text-zinc-400 mt-1 font-mono">{formatTimestamp(log.timestamp)} • Job: {log.download_job_slug}</span>
                          </div>
                        </div>
                        <Show when={isSelected()} fallback={<ChevronRight class="w-4.5 h-4.5 text-zinc-400" />}>
                           <ChevronDown class="w-4.5 h-4.5 text-zinc-400" />
                        </Show>
                      </button>

                      <Show when={isSelected()}>
                        <div class="border-t border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-black/10 text-[11px] sm:text-xs text-left font-mono space-y-3.5 select-text overflow-x-auto">
                          <div>
                            <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Execution Command</span>
                            <div class="bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 break-all">
                              {log.command_executed}
                            </div>
                          </div>
                          <div>
                            <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Full Error Payload Description</span>
                            <div class="bg-red-500/5 text-red-600 dark:text-red-400 p-2.5 rounded-lg border border-red-500/10 break-words whitespace-pre-wrap">
                              {log.error_message}
                            </div>
                          </div>
                          <div class="grid grid-cols-2 gap-4 text-[10px] text-zinc-400 mt-2">
                            <div>
                              <strong>LOG SLUG:</strong> {log.slug}
                            </div>
                            <div>
                              <strong>RESOLVED STATUS:</strong> {log.is_resolved === 1 ? "RESOLVED" : "UNRESOLVED/ACTIVE"}
                            </div>
                          </div>
                        </div>
                      </Show>
                    </div>
                  );
                }}
              </For>
              <Show when={errorLogs().length === 0}>
                <div class="flex flex-col items-center justify-center py-20 text-center gap-2">
                  <FileWarning class="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-1" />
                  <h3 class="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">No download errors logged</h3>
                  <p class="text-[11px] text-zinc-400 max-w-xs">Everything has run smoothly! Errors will appear here.</p>
                </div>
              </Show>
            </Show>

            <Show when={activeTab() === "parses"}>
              <For each={parseLogs()}>
                {(log) => {
                  const isSelected = () => selectedLogSlug() === log.slug;
                  const isFailed = log.status === "failed";
                  return (
                    <div
                      class={`border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/40 transition-all ${
                        isSelected() ? "ring-2 ring-blue-500/20 border-blue-500/35" : ""
                      }`}
                    >
                      <button
                        onClick={() => setSelectedLogSlug(isSelected() ? null : log.slug)}
                        class="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 text-left transition-colors"
                      >
                        <div class="flex items-start gap-3 min-w-0 flex-grow">
                          <div class={`p-1 rounded-md flex-shrink-0 mt-0.5 ${
                            isFailed ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                          }`}>
                            <Show when={isFailed} fallback={<CheckCircle2 class="w-4 h-4" />}>
                               <AlertTriangle class="w-4 h-4" />
                            </Show>
                          </div>
                          <div class="flex flex-col min-w-0 flex-grow pr-3">
                            <span class="font-bold text-zinc-800 dark:text-zinc-200 break-all line-clamp-1">{log.command_executed}</span>
                            <span class="text-[10px] text-zinc-400 mt-1 font-mono">
                              {formatTimestamp(log.started_at)} • File: {log.parsed_file_slug} • {log.duration_ms}ms
                            </span>
                          </div>
                        </div>
                        <Show when={isSelected()} fallback={<ChevronRight class="w-4.5 h-4.5 text-zinc-400" />}>
                          <ChevronDown class="w-4.5 h-4.5 text-zinc-400" />
                        </Show>
                      </button>

                      <Show when={isSelected()}>
                        <div class="border-t border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-black/10 text-[11px] sm:text-xs text-left font-mono space-y-3.5 select-text overflow-x-auto">
                          <div>
                            <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Discovery Command Executed</span>
                            <div class="bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 break-all">
                              {log.command_executed}
                            </div>
                          </div>
                          <div class="grid grid-cols-2 gap-4 text-[11px] text-zinc-700 dark:text-zinc-300">
                            <div>
                              <strong class="text-zinc-400 block text-[9px] uppercase tracking-wider">Status Outcome</strong>
                              <span class={isFailed ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>{log.status.toUpperCase()}</span>
                            </div>
                            <div>
                              <strong class="text-zinc-400 block text-[9px] uppercase tracking-wider">Bytes Received</strong>
                              <span>{log.bytes_returned} bytes</span>
                            </div>
                            <div>
                              <strong class="text-zinc-400 block text-[9px] uppercase tracking-wider">Exit Code</strong>
                              <span>{log.exit_code !== null ? log.exit_code : "N/A"}</span>
                            </div>
                            <div>
                              <strong class="text-zinc-400 block text-[9px] uppercase tracking-wider">Duration</strong>
                              <span>{log.duration_ms} ms</span>
                            </div>
                          </div>
                          <div class="text-[10px] text-zinc-400 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                            <strong>LOG REF SLUG:</strong> {log.slug}
                          </div>
                        </div>
                      </Show>
                    </div>
                  );
                }}
              </For>
              <Show when={parseLogs().length === 0}>
                <div class="flex flex-col items-center justify-center py-20 text-center gap-2">
                  <Database class="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-1" />
                  <h3 class="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">No discovery actions logged</h3>
                  <p class="text-[11px] text-zinc-400 max-w-xs">Analyses will trace log metadata records here.</p>
                </div>
              </Show>
            </Show>

          </div>
        }>
          <div class="flex items-center justify-center py-20">
            <span class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </Show>
      </div>

    </div>
  );
}
