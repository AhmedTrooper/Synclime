import { For, Show } from "solid-js";

interface LiveLogTerminalProps {
  logs: string[];
}

export function LiveLogTerminal(props: LiveLogTerminalProps) {
  return (
    <div class="flex flex-col w-full bg-zinc-950 dark:bg-black border border-zinc-800 rounded-2xl shadow-lg p-5 font-mono text-xs text-left select-text max-h-72 overflow-y-auto animate-fadeIn">
      <div class="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800 select-none">
        <span class="w-3 h-3 rounded-full bg-red-500" />
        <span class="w-3 h-3 rounded-full bg-yellow-500" />
        <span class="w-3 h-3 rounded-full bg-green-500" />
        <span class="text-[10px] text-zinc-500 tracking-wider uppercase ml-2">Live Execution Log</span>
      </div>
      <div class="flex flex-col gap-1.5 text-zinc-400">
        <For each={props.logs}>
          {(log, idx) => (
            <div class="flex gap-2">
              <span class="text-zinc-600 select-none">[{idx() + 1}]</span>
              <span>{log}</span>
            </div>
          )}
        </For>
        <Show when={props.logs.length === 0}>
          <span class="text-zinc-600 italic">No output received. Waiting for execution...</span>
        </Show>
      </div>
    </div>
  );
}
