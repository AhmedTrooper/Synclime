interface LiveLogTerminalProps {
  logs: string[];
}

export function LiveLogTerminal({ logs }: LiveLogTerminalProps) {
  return (
    <div className="flex flex-col w-full bg-zinc-950 dark:bg-black border border-zinc-800 rounded-2xl shadow-lg p-5 font-mono text-xs text-left select-text max-h-72 overflow-y-auto animate-fadeIn">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800 select-none">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-[10px] text-zinc-500 tracking-wider uppercase ml-2">Live Execution Log</span>
      </div>
      <div className="flex flex-col gap-1.5 text-zinc-400">
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-2">
            <span className="text-zinc-600 select-none">[{idx + 1}]</span>
            <span>{log}</span>
          </div>
        ))}
        {logs.length === 0 && <span className="text-zinc-600 italic">No output received. Waiting for execution...</span>}
      </div>
    </div>
  );
}
