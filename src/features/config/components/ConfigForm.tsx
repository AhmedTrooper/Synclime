

export function ConfigForm() {
  return (
    <div className="flex flex-col gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
      <h3 className="text-sm font-bold text-zinc-200">Site Profile Configuration</h3>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-400">Cookies File Path</label>
        <input type="text" placeholder="/path/to/cookies.txt" className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-blue-500" />
      </div>
      <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition-colors">
        Save Profile
      </button>
    </div>
  );
}
