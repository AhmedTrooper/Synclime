import { Play } from "lucide-solid";
import { Show } from "solid-js";

interface ParseButtonProps {
  onParse: () => void;
  isLoading?: boolean;
}

export function ParseButton(props: ParseButtonProps) {
  return (
    <button
      disabled={props.isLoading}
      onClick={() => props.onParse()}
      class="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-indigo-500/20 px-6 py-3 rounded-xl transition-all duration-300 disabled:opacity-50"
    >
      <Show when={!props.isLoading}>
        <Play class="w-4 h-4" />
      </Show>
      {props.isLoading ? "Parsing Target..." : "Parse URL Metadata"}
    </button>
  );
}
