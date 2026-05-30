import { useParams, A } from "@solidjs/router";
import { ArrowLeft } from "lucide-solid";

export default function DownloadsDetail() {
  const params = useParams();

  return (
    <div class="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6 w-full">
      <div class="flex flex-col gap-2">
        <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white transition-colors duration-300">
          Hello World from Downloads Detail Route
        </h1>
        <p class="text-zinc-500 dark:text-zinc-400 text-sm transition-colors duration-300">
          Viewing Details for dynamic slug: <strong class="text-blue-600 dark:text-blue-400">{params.slug}</strong>
        </p>
      </div>
      <A
        href="/downloads"
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300 text-sm"
      >
        <ArrowLeft class="w-4 h-4" />
        Back to Downloads
      </A>
    </div>
  );
}
