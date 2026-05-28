import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useUIStore } from "../store/useUIStore";
import { Button } from "@heroui/react";
import { FileText, ArrowRight, ArrowLeft } from "lucide-react";

export interface ParsedFile {
  id: string;
  name: string;
  size: string;
  parsedAt: string;
  format: "json" | "csv" | "xml" | "yaml";
  status: "success" | "warning" | "error";
  recordsCount: number;
}

export const mockParsedFiles: ParsedFile[] = [
  {
    id: "system-logs-01",
    name: "system_kernel_logs.json",
    size: "1.2 MB",
    parsedAt: "2026-05-28T10:30:00Z",
    format: "json",
    status: "success",
    recordsCount: 12040,
  },
  {
    id: "user-metrics-02",
    name: "user_session_metrics.csv",
    size: "450 KB",
    parsedAt: "2026-05-28T12:15:00Z",
    format: "csv",
    status: "success",
    recordsCount: 4500,
  },
  {
    id: "config-spec-03",
    name: "client_specifications.yaml",
    size: "12 KB",
    parsedAt: "2026-05-28T14:05:00Z",
    format: "yaml",
    status: "warning",
    recordsCount: 85,
  },
  {
    id: "invalid-records-04",
    name: "unstructured_dump.xml",
    size: "2.4 MB",
    parsedAt: "2026-05-28T15:45:00Z",
    format: "xml",
    status: "error",
    recordsCount: 0,
  },
];

export default function ParsedFiles() {
  const { setActivePath } = useUIStore();

  useEffect(() => {
    // Dock tracks Parsed Files active indicator
    setActivePath("/parsed_files");
  }, [setActivePath]);

  return (
    <div className="flex flex-col items-center justify-center gap-10 w-full max-w-4xl mx-auto px-4 py-8 text-zinc-950 dark:text-white transition-colors duration-300">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white transition-colors duration-300">
          Parsed Files <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Repository</span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed transition-colors duration-300">
          Clean master repository of all structured dataset formats processed by the Synclime parser engine.
        </p>
      </div>

      {/* Back Button */}
      <Button
        as={Link}
        to="/"
        size="sm"
        className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300 self-start"
        startContent={<ArrowLeft className="w-4 h-4" />}
      >
        Back to Home
      </Button>

      {/* Clean, minimal list */}
      <div className="grid grid-cols-1 gap-4 w-full">
        {mockParsedFiles.map((file) => (
          <div
            key={file.id}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-2xl shadow-sm transition-all duration-300 hover:border-zinc-300 dark:hover:border-white/15"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-zinc-800/5 dark:bg-white/5 border border-zinc-200 dark:border-white/5">
                <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-sm font-bold text-zinc-900 dark:text-white transition-colors duration-300">{file.name}</span>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono transition-colors duration-300">
                  <span className="uppercase">{file.format}</span>
                  <span>•</span>
                  <span>{file.size}</span>
                  <span>•</span>
                  <span>{file.recordsCount.toLocaleString()} records</span>
                </div>
              </div>
            </div>

            <Button
              as={Link}
              to={`/parsed_file/${file.id}`}
              size="sm"
              className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300"
              endContent={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Parse View
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
