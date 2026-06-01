import { A } from "@solidjs/router";
import { For, Show, onMount, onCleanup } from "solid-js";
import { 
  Home, 
  Info, 
  Download, 
  Settings, 
  FileText, 
  PanelLeftClose, 
  PanelLeftOpen, 
  GlobeLock, 
  Moon, 
  Sun, 
  Monitor, 
  Database,
  Inbox,
  Layers
} from "lucide-solid";
import { useUIStore } from "../store/useUIStore";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export default function Sidebar() {
  const ui = useUIStore.state;
  let unlistenInbox: (() => void) | null = null;

  const updateInboxBadge = async () => {
    const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        const items = await invoke<any[]>("get_inbox_urls");
        const pendingCount = items.filter(item => item.status === "pending").length;
        useUIStore.setBadge("inbox", pendingCount);
      } catch (e) {
        console.error("Failed to query inbox count for badge:", e);
      }
    }
  };

  onMount(() => {
    updateInboxBadge();
    const setupListener = async () => {
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        try {
          unlistenInbox = await listen("inbox-updated", () => {
            updateInboxBadge();
          });
        } catch (e) {
          console.error("Failed to setup sidebar inbox badge listener:", e);
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

  const navItems = [
    { path: "/", label: "New Task", icon: Home, badgeKey: "home" as const },
    { path: "/inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox" as const },
    { path: "/downloads", label: "Queue", icon: Download, badgeKey: "downloads" as const },
    { path: "/parsed_files", label: "Library", icon: FileText, badgeKey: "parsedFiles" as const },
  ];

  const bottomNavItems = [
    { path: "/sites_config", label: "Sites & Rules", icon: GlobeLock, badgeKey: "sites" as const },
    { path: "/logs", label: "Logs", icon: Database, badgeKey: "logs" as const },
    { path: "/extentions", label: "Extensions", icon: Layers, badgeKey: "extentions" as const },
    { path: "/settings", label: "Preferences", icon: Settings, badgeKey: "settings" as const },
    { path: "/about", label: "About", icon: Info, badgeKey: "about" as const },
  ];

  const allItems = [...navItems, ...bottomNavItems];

  return (
    <div class={`w-full ${ui.isSidebarExpanded ? "sm:w-56" : "sm:w-16"} transition-all duration-300 ease-in-out h-auto sm:h-full border-t sm:border-t-0 sm:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-row sm:flex-col flex-shrink-0 sm:pt-4 sm:pb-4 select-none z-20 shadow-[0_-1px_10px_rgba(0,0,0,0.02)] sm:shadow-[1px_0_10px_rgba(0,0,0,0.02)] relative`}>
      <div class={`flex-1 overflow-x-auto sm:overflow-y-auto px-1 ${ui.isSidebarExpanded ? "sm:px-3" : "sm:px-2"} py-1 sm:py-0 flex items-center sm:items-stretch scrollbar-hide`}>
        <nav class="flex flex-row sm:flex-col gap-1 sm:gap-1 w-full justify-around sm:justify-start">
          <For each={allItems}>
            {(item) => {
              const isActive = () =>
                item.path === "/"
                  ? ui.activePath === "/"
                  : ui.activePath.startsWith(item.path);

              const badgeCount = () => ui.badges[item.badgeKey];
              const Icon = item.icon;

              return (
                <A
                  href={item.path}
                  class={`flex-1 sm:flex-initial flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 px-1 sm:px-3 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-300 relative group overflow-hidden ${
                    isActive()
                      ? "bg-white dark:bg-white/10 text-blue-600 dark:text-white font-bold shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white font-medium"
                  }`}
                >
                  <div class="relative flex items-center justify-center">
                    <Icon class={`w-5 h-5 sm:w-4 sm:h-4 ${isActive() ? "text-blue-600 dark:text-white" : "text-zinc-400 dark:text-zinc-500"}`} />
                    <Show when={badgeCount() > 0}>
                      <span
                        class={`absolute -top-1.5 -right-2.5 flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full text-[8px] sm:text-[10px] font-bold sm:h-4 sm:min-w-4 ${
                          ui.isSidebarExpanded ? "sm:static sm:top-0 sm:right-0 sm:ml-auto" : "sm:absolute sm:-top-1.5 sm:-right-2"
                        } ${
                          isActive()
                            ? "bg-blue-600 text-white sm:bg-white sm:text-blue-600"
                            : "bg-blue-500 text-white"
                        }`}
                      >
                        {badgeCount()}
                      </span>
                    </Show>
                  </div>
                  <span class={`block sm:inline tracking-tight text-[9px] sm:text-xs font-semibold text-center sm:text-left truncate w-full sm:w-auto ${ui.isSidebarExpanded ? "" : "sm:hidden"}`}>
                    {item.label}
                  </span>
                </A>
              );
            }}
          </For>
        </nav>
      </div>

      {/* External Resources */}
      <div class={`hidden sm:flex flex-col gap-1 px-3 mb-2 border-t border-zinc-200 dark:border-zinc-800/80 pt-3 ${ui.isSidebarExpanded ? "" : "items-center"}`}>
        <a
          href="https://github.com/AhmedTrooper/Synclime"
          target="_blank"
          rel="noopener noreferrer"
          class={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white font-semibold text-[11px] transition-colors ${ui.isSidebarExpanded ? "" : "justify-center"}`}
          title="Source Code (GitHub)"
        >
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          <span class={ui.isSidebarExpanded ? "" : "hidden"}>Source Code</span>
        </a>
        <a
          href="https://www.youtube.com/@AhmedTrooper"
          target="_blank"
          rel="noopener noreferrer"
          class={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white font-semibold text-[11px] transition-colors ${ui.isSidebarExpanded ? "" : "justify-center"}`}
          title="AhmedTrooper YouTube"
        >
          <svg class="w-4 h-4 flex-shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
            <polygon points="10 15 15 12 10 9" />
          </svg>
          <span class={ui.isSidebarExpanded ? "" : "hidden"}>YouTube</span>
        </a>
      </div>

      {/* Desktop Controls */}
      <div class="hidden sm:flex flex-col gap-2 px-3 mt-auto pt-4">
        <button
          onClick={() => {
            if (ui.theme === "system") useUIStore.setTheme("dark");
            else if (ui.theme === "dark") useUIStore.setTheme("light");
            else useUIStore.setTheme("system");
          }}
          class="flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
          title={`Theme: ${ui.theme.charAt(0).toUpperCase() + ui.theme.slice(1)}`}
        >
          <Show when={ui.theme === "dark"}><Moon class="w-4 h-4" /></Show>
          <Show when={ui.theme === "light"}><Sun class="w-4 h-4" /></Show>
          <Show when={ui.theme === "system"}><Monitor class="w-4 h-4" /></Show>
        </button>
        <button
          onClick={useUIStore.toggleSidebar}
          class="flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
          title={ui.isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <Show when={ui.isSidebarExpanded} fallback={<PanelLeftOpen class="w-4 h-4" />}>
            <PanelLeftClose class="w-4 h-4" />
          </Show>
        </button>
      </div>
    </div>
  );
}
