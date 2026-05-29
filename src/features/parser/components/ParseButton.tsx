import { Play } from "lucide-react";

interface ParseButtonProps {
  onParse: () => void;
  isLoading?: boolean;
}

export function ParseButton({ onParse, isLoading = false }: ParseButtonProps) {
  return (
    <button
      disabled={isLoading}
      onClick={onParse}
      className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-indigo-500/20 px-6 py-3 rounded-xl transition-all duration-300 disabled:opacity-50"
    >
      {!isLoading && <Play className="w-4 h-4" />}
      {isLoading ? "Parsing Target..." : "Parse URL Metadata"}
    </button>
  );
}
