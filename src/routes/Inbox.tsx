import { onMount, createSignal, For, Show, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useUIStore } from "../store/useUIStore";
import { 
  Inbox, 
  Trash2, 
  ExternalLink, 
  ArrowRight, 
  Calendar, 
  Clock, 
  Search, 
  RefreshCw,
  Sparkles,
  Link2
} from "lucide-solid";

export interface InboxItem {
  slug: string;
  url: string;
  status: "pending" | "parsed" | "downloaded";
  created_at: string;
  updated_at: string;
}

export default function InboxRoute() {
  const navigate = useNavigate();
  const [inboxItems, setInboxItems] = createSignal<InboxItem[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [errorMsg, setErrorMsg] = createSignal("");
  let unlistenInbox: (() => void) | null = null;

  const fetchInbox = async () => {
    setLoading(true);
    setErrorMsg("");
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        const items = await invoke<InboxItem[]>("get_inbox_urls");
        setInboxItems(items);
      } catch (err: any) {
        console.error("Failed to fetch inbox URLs:", err);
        setErrorMsg("Failed to connect to internal inbox database.");
      } finally {
        setLoading(false);
      }
    } else {
      // Mock data for browser preview
      setTimeout(() => {
        setInboxItems([
          {
            slug: "inbox-1",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            status: "pending",
            created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
            updated_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          },
          {
            slug: "inbox-2",
            url: "https://xyz.pdf/document.pdf",
            status: "downloaded",
            created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            updated_at: new Date(Date.now() - 1000 * 60 * 115).toISOString(),
          },
          {
            slug: "inbox-3",
            url: "https://vimeo.com/987654321",
            status: "parsed",
            created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
            updated_at: new Date(Date.now() - 1000 * 60 * 595).toISOString(),
          }
        ]);
        setLoading(false);
      }, 800);
    }
  };

  onMount(() => {
    useUIStore.setActivePath("/inbox");
    fetchInbox();

    // Listen to real-time update events from Axum background server
    const setupListener = async () => {
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        try {
          unlistenInbox = await listen("inbox-updated", () => {
            console.log("SyncLime: Inbox received update notification. Refreshing queue list...");
            fetchInbox();
          });
        } catch (e) {
          console.error("Failed to setup inbox event listener:", e);
        }
      }
    };
    setupListener();
  });

  onCleanup(() => {
    if (unlistenInbox) {
      unlistenInbox();
    }
  });

  const handleDelete = async (slug: string, e: Event) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this link from your inbox?")) return;

    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        await invoke("delete_inbox_url", { slug });
        fetchInbox();
      } catch (err: any) {
        console.error("Failed to delete inbox item:", err);
      }
    } else {
      setInboxItems(prev => prev.filter(item => item.slug !== slug));
    }
  };

  const filteredItems = () => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return inboxItems();
    return inboxItems().filter(item => item.url.toLowerCase().includes(query));
  };

  const pendingCount = () => inboxItems().filter(item => item.status === "pending").length;

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "n/a";
    }
  };

  const formatTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "n/a";
    }
  };

  return (
    <div class="space-y-4 max-w-4xl mx-auto py-2 select-none animate-fade-in text-xs sm:text-sm font-sans text-left">
      
      {/* Header */}
      <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm">
            <Inbox class="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 class="text-base font-bold text-zinc-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
              Inbox Queue
              <Show when={pendingCount() > 0}>
                <span class="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500 text-white rounded-full animate-bounce">
                  {pendingCount()} New
                </span>
              </Show>
            </h1>
            <p class="text-[10px] text-zinc-400">Manage pending assets sent directly from your browser extension</p>
          </div>
        </div>
        <button
          onClick={fetchInbox}
          class="p-2 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-800"
          title="Refresh Inbox Queue"
        >
          <RefreshCw class={`w-4 h-4 ${loading() ? "animate-spin text-blue-500" : ""}`} />
        </button>
      </div>

      {/* Filter / Search bar */}
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
            <Search class="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search received links and domains..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/10 transition-all outline-none text-xs sm:text-sm text-zinc-900 dark:text-white shadow-inner"
          />
        </div>
      </div>

      {/* Main Inbox Queue */}
      <Show when={!loading()} fallback={
        <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-zinc-400 text-xs font-semibold">Scanning SQLite pipeline database...</p>
        </div>
      }>
        <Show when={!errorMsg()} fallback={
          <div class="border border-red-200/60 dark:border-red-900/40 bg-red-500/5 p-4 rounded-xl text-center text-red-500 font-semibold text-xs flex items-center justify-center gap-2">
            <span>{errorMsg()}</span>
          </div>
        }>
          <Show when={filteredItems().length > 0} fallback={
            <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div class="w-12 h-12 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-full">
                <Inbox class="w-6 h-6" />
              </div>
              <div class="space-y-1">
                <h3 class="font-bold text-zinc-900 dark:text-white text-sm">No items in inbox</h3>
                <p class="text-zinc-400 text-[11px] max-w-xs leading-relaxed">
                  Your inbox is currently empty. Use the browser extension or send a POST request to 
                  <code class="mx-1 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-[10px] text-blue-600 dark:text-blue-400">
                    http://localhost:14221/add
                  </code> 
                  to populate this queue.
                </p>
              </div>
            </div>
          }>
            <div class="grid gap-3">
              <For each={filteredItems()}>
                {(item) => (
                  <div
                    onClick={() => navigate(`/inbox/${item.slug}`)}
                    class="group relative border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 p-4 rounded-xl shadow-sm hover:shadow transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    {/* Left: Info */}
                    <div class="flex-1 min-w-0 space-y-1.5">
                      <div class="flex items-center gap-2 flex-wrap">
                        {/* Status Badge */}
                        <Show when={item.status === "pending"}>
                          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                            Pending
                          </span>
                        </Show>
                        <Show when={item.status === "parsed"}>
                          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Parsed
                          </span>
                        </Show>
                        <Show when={item.status === "downloaded"}>
                          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Downloaded
                          </span>
                        </Show>

                        {/* Date details */}
                        <div class="flex items-center gap-3 text-zinc-400 dark:text-zinc-500 text-[10px] font-medium">
                          <span class="flex items-center gap-1">
                            <Calendar class="w-3 h-3" />
                            {formatDate(item.created_at)}
                          </span>
                          <span class="flex items-center gap-1">
                            <Clock class="w-3 h-3" />
                            {formatTime(item.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* URL String */}
                      <div class="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 font-semibold break-all text-xs">
                        <Link2 class="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                        <span class="truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                          {item.url}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div class="flex items-center gap-2.5 sm:self-center">
                      <button
                        onClick={(e) => handleDelete(item.slug, e)}
                        class="p-2 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/5 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/10"
                        title="Remove link"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                      <div
                        class="p-2 text-zinc-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent group-hover:border-blue-500/10"
                        title="View action panel"
                      >
                        <ArrowRight class="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Show>

    </div>
  );
}
