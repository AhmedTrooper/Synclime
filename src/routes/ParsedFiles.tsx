import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useUIStore } from "../store/useUIStore";
import { useParseStore } from "../store/useParseStore";
import { FileText, ArrowRight, PlayCircle } from "lucide-react";

export default function ParsedFiles() {
  const { setActivePath } = useUIStore();
  const { parsedFiles } = useParseStore();

  useEffect(() => {
    setActivePath("/parsed_files");
  }, [setActivePath]);

  // Helper to format duration in MM:SS or HH:MM:SS
  const formatDuration = (secs: number) => {
    if (!secs) return "0:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Helper to parse date to localized string
  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto h-full py-2">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-zinc-500 rounded-md text-white shadow-sm">
            <FileText className="w-4 h-4" />
          </div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Library Cache</h1>
        </div>
      </div>

      {/* Render Queue List */}
      <div className="grid grid-cols-1 gap-4 w-full">
        {parsedFiles.map((file) => (
          <div
            key={file.slug}
            className="flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3 overflow-hidden text-left flex-grow">
              {file.thumbnail ? (
                <img
                  src={file.thumbnail}
                  alt={file.title}
                  className="w-10 h-7 object-cover rounded-sm border border-zinc-200 dark:border-zinc-800 flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              )}
              
              <div className="flex flex-col flex-grow overflow-hidden">
                <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 truncate">{file.title}</span>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span className="truncate max-w-[150px]">{file.author}</span>
                  <span>•</span>
                  {file.isPlaylist ? (
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">{file.payload.entries?.length || 0} Tracks</span>
                  ) : (
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{formatDuration(file.duration)}</span>
                  )}
                  <span>•</span>
                  <span>{formatDate(file.parsedAt)}</span>
                </div>
              </div>
            </div>

            <Link
              to={`/parsed_file/${file.slug}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors text-[11px] flex-shrink-0"
            >
              Details
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ))}

        {parsedFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <PlayCircle className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
            <h3 className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">Library is empty</h3>
            <p className="text-[11px] text-zinc-400 max-w-xs">
              Analyzed media and parsed structures will be stored here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

