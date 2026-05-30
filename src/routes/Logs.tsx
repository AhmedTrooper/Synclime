import { useEffect, useState } from "react";
import { useUIStore } from "../store/useUIStore";
import { FileWarning, Database, Trash2, ChevronRight, ChevronDown, CheckCircle2, AlertTriangle } from "lucide-react";
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
  const { setActivePath } = useUIStore();
  const [activeTab, setActiveTab] = useState<"errors" | "parses">("errors");
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [parseLogs, setParseLogs] = useState<ParseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLogSlug, setSelectedLogSlug] = useState<string | null>(null);

  useEffect(() => {
    setActivePath("/logs");
    loadLogs();
  }, [setActivePath, activeTab]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        if (activeTab === "errors") {
          const data = await invoke<ErrorLog[]>("get_error_logs");
          setErrorLogs(data);
        } else {
          const data = await invoke<ParseLog[]>("get_parse_logs");
          setParseLogs(data);
        }
      }
    } catch (err) {
      console.error("Failed to load logs from SQLite:", err);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto h-full py-2 select-none animate-fade-in font-sans text-xs sm:text-sm">
      
      {/* Title Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-zinc-650 rounded-md text-white shadow-sm dark:bg-zinc-800">
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-left">
            <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white tracking-tight">System & Error Logs</h1>
            <p className="text-[10px] text-zinc-400">Query SQLite transaction records directly</p>
          </div>
        </div>
        
        {((activeTab === "errors" && errorLogs.length > 0) || (activeTab === "parses" && parseLogs.length > 0)) && (
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold rounded-md transition-colors text-[10px] sm:text-[11px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Logs
          </button>
        )}
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2">
        <button
          onClick={() => { setActiveTab("errors"); setSelectedLogSlug(null); }}
          className={`px-4 py-2 border-b-2 font-bold transition-all text-xs ${
            activeTab === "errors"
              ? "border-blue-500 text-blue-600 dark:text-blue-400 font-black"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          Download Errors ({errorLogs.length})
        </button>
        <button
          onClick={() => { setActiveTab("parses"); setSelectedLogSlug(null); }}
          className={`px-4 py-2 border-b-2 font-bold transition-all text-xs ${
            activeTab === "parses"
              ? "border-blue-500 text-blue-600 dark:text-blue-400 font-black"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          Metadata Discovery Logs ({parseLogs.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            
            {/* 1. Error Logs Tab */}
            {activeTab === "errors" && errorLogs.map((log) => {
              const isSelected = selectedLogSlug === log.slug;
              return (
                <div
                  key={log.slug}
                  className={`border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/40 transition-all ${
                    isSelected ? "ring-2 ring-blue-500/20 border-blue-500/35" : ""
                  }`}
                >
                  <button
                    onClick={() => setSelectedLogSlug(isSelected ? null : log.slug)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 text-left transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-grow">
                      <div className="p-1 rounded-md bg-red-500/10 text-red-500 flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-grow pr-3">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 break-all line-clamp-1">{log.error_message}</span>
                        <span className="text-[10px] text-zinc-400 mt-1 font-mono">{formatTimestamp(log.timestamp)} • Job: {log.download_job_slug}</span>
                      </div>
                    </div>
                    {isSelected ? <ChevronDown className="w-4.5 h-4.5 text-zinc-400" /> : <ChevronRight className="w-4.5 h-4.5 text-zinc-400" />}
                  </button>

                  {isSelected && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-black/10 text-[11px] sm:text-xs text-left font-mono space-y-3.5 select-text overflow-x-auto">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Execution Command</span>
                        <div className="bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-850 break-all">
                          {log.command_executed}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Full Error Payload Description</span>
                        <div className="bg-red-500/5 text-red-600 dark:text-red-400 p-2.5 rounded-lg border border-red-500/10 break-words whitespace-pre-wrap">
                          {log.error_message}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[10px] text-zinc-400 mt-2">
                        <div>
                          <strong>LOG SLUG:</strong> {log.slug}
                        </div>
                        <div>
                          <strong>RESOLVED STATUS:</strong> {log.is_resolved === 1 ? "RESOLVED" : "UNRESOLVED/ACTIVE"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. Parse Logs Tab */}
            {activeTab === "parses" && parseLogs.map((log) => {
              const isSelected = selectedLogSlug === log.slug;
              const isFailed = log.status === "failed";
              return (
                <div
                  key={log.slug}
                  className={`border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/40 transition-all ${
                    isSelected ? "ring-2 ring-blue-500/20 border-blue-500/35" : ""
                  }`}
                >
                  <button
                    onClick={() => setSelectedLogSlug(isSelected ? null : log.slug)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 text-left transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-grow">
                      <div className={`p-1 rounded-md flex-shrink-0 mt-0.5 ${
                        isFailed ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                      }`}>
                        {isFailed ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col min-w-0 flex-grow pr-3">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 break-all line-clamp-1">{log.command_executed}</span>
                        <span className="text-[10px] text-zinc-400 mt-1 font-mono">
                          {formatTimestamp(log.started_at)} • File: {log.parsed_file_slug} • {log.duration_ms}ms
                        </span>
                      </div>
                    </div>
                    {isSelected ? <ChevronDown className="w-4.5 h-4.5 text-zinc-400" /> : <ChevronRight className="w-4.5 h-4.5 text-zinc-400" />}
                  </button>

                  {isSelected && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-black/10 text-[11px] sm:text-xs text-left font-mono space-y-3.5 select-text overflow-x-auto">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Discovery Command Executed</span>
                        <div className="bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-850 break-all">
                          {log.command_executed}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[11px] text-zinc-700 dark:text-zinc-300">
                        <div>
                          <strong className="text-zinc-400 block text-[9px] uppercase tracking-wider">Status Outcome</strong>
                          <span className={isFailed ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>{log.status.toUpperCase()}</span>
                        </div>
                        <div>
                          <strong className="text-zinc-400 block text-[9px] uppercase tracking-wider">Bytes Received</strong>
                          <span>{log.bytes_returned} bytes</span>
                        </div>
                        <div>
                          <strong className="text-zinc-400 block text-[9px] uppercase tracking-wider">Exit Code</strong>
                          <span>{log.exit_code !== null ? log.exit_code : "N/A"}</span>
                        </div>
                        <div>
                          <strong className="text-zinc-400 block text-[9px] uppercase tracking-wider">Duration</strong>
                          <span>{log.duration_ms} ms</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-400 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                        <strong>LOG REF SLUG:</strong> {log.slug}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty State */}
            {activeTab === "errors" && errorLogs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
                <FileWarning className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-1" />
                <h3 className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">No download errors logged</h3>
                <p className="text-[11px] text-zinc-400 max-w-xs">Everything has run smoothly! Errors will appear here.</p>
              </div>
            )}

            {activeTab === "parses" && parseLogs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
                <Database className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-1" />
                <h3 className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">No discovery actions logged</h3>
                <p className="text-[11px] text-zinc-400 max-w-xs">Analyses will trace log metadata records here.</p>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
