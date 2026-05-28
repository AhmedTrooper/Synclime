interface MetaDetailsCardProps {
  title: string;
  duration?: string;
  author?: string;
  views?: string;
  thumbnail?: string;
}

export function MetaDetailsCard({ title, duration, author, views, thumbnail }: MetaDetailsCardProps) {
  return (
    <div className="flex flex-col md:flex-row gap-5 p-5 bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-white/15 transition-all duration-300">
      {thumbnail && (
        <img
          src={thumbnail}
          alt={title}
          className="w-full md:w-48 aspect-video object-cover rounded-xl border border-zinc-200 dark:border-white/5 shadow-sm"
        />
      )}
      <div className="flex flex-col justify-between py-1 text-left">
        <div>
          <h4 className="text-base font-bold text-zinc-900 dark:text-white leading-snug">{title}</h4>
          {author && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-semibold">{author}</p>}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
          {duration && <span>DURATION: {duration}</span>}
          {views && <span>VIEWS: {views}</span>}
        </div>
      </div>
    </div>
  );
}
