import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useUIStore } from "../store/useUIStore";
import { useParseStore } from "../store/useParseStore";
import { Button, Card, CardBody } from "@heroui/react";
import { FileText, ArrowRight, ArrowLeft, Calendar, User, PlayCircle } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-4xl mx-auto px-4 py-4 text-zinc-950 dark:text-white transition-colors duration-300">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white transition-colors duration-300">
          Parsed Files <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Repository</span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed transition-colors duration-300">
          Access the list of all structured video playlists and standalone tracks extracted and cached by the Synclime core engine.
        </p>
      </div>

      {/* Navigation Buttons Row */}
      <div className="flex justify-between items-center w-full mt-2">
        <Button
          as={Link}
          to="/"
          size="sm"
          className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300"
          startContent={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Analyzer
        </Button>
      </div>

      {/* Render Queue List */}
      <div className="grid grid-cols-1 gap-4 w-full">
        {parsedFiles.map((file) => (
          <Card
            key={file.slug}
            className="border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-white/15 transition-all duration-300"
          >
            <CardBody className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-left">
                {file.thumbnail ? (
                  <img
                    src={file.thumbnail}
                    alt={file.title}
                    className="w-20 md:w-24 aspect-video object-cover rounded-xl border border-zinc-200 dark:border-white/5"
                  />
                ) : (
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                
                <div className="flex flex-col gap-1 flex-grow">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1 leading-snug">
                    {file.title}
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{file.author}</span>
                    </div>
                    <span>•</span>
                    {file.isPlaylist ? (
                      <span className="bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md font-bold text-[8px] uppercase tracking-wider">
                        Playlist ({file.payload.entries?.length || 0} Tracks)
                      </span>
                    ) : (
                      <span className="bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-bold text-[8px] uppercase tracking-wider">
                        Single Video ({formatDuration(file.duration)})
                      </span>
                    )}
                    <span>•</span>
                    <div className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{formatDate(file.parsedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                as={Link}
                to={`/parsed_file/${file.slug}`}
                size="sm"
                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300"
                endContent={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Inspect Details
              </Button>
            </CardBody>
          </Card>
        ))}

        {parsedFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-3xl text-center gap-4">
            <div className="p-4 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl text-zinc-400 dark:text-zinc-400">
              <PlayCircle className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Repository is Empty</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                You haven't analyzed any asset links yet. Paste a URL on the home screen to cache extraction data.
              </p>
            </div>
            <Button
              as={Link}
              to="/"
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-500/10 px-5 rounded-xl transition-all duration-300 mt-2"
            >
              Analyze a Link
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

