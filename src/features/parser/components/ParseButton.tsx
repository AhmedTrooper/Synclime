import { Button } from "@heroui/react";
import { Play } from "lucide-react";

interface ParseButtonProps {
  onParse: () => void;
  isLoading?: boolean;
}

export function ParseButton({ onParse, isLoading = false }: ParseButtonProps) {
  return (
    <Button
      isLoading={isLoading}
      onClick={onParse}
      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-indigo-500/20 px-6 py-4 rounded-xl transition-all duration-300"
      startContent={!isLoading && <Play className="w-4 h-4" />}
    >
      {isLoading ? "Parsing Target..." : "Parse URL Metadata"}
    </Button>
  );
}
