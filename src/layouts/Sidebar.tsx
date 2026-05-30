import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { Home, Info, Download, Settings, FileText, PanelLeftClose, PanelLeftOpen, GlobeLock, Moon, Sun, Monitor, Database } from "lucide-solid";
import { useUIStore } from "../store/useUIStore";

export default function Sidebar() {
  const ui = useUIStore.state;

  const navItems = [
    { path: "/", label: "New Task", icon: Home, badgeKey: "home" as const },
    { path: "/downloads", label: "Queue", icon: Download, badgeKey: "downloads" as const },
    { path: "/parsed_files", label: "Library", icon: FileText, badgeKey: "parsedFiles" as const },
  ];

  const bottomNavItems = [
    { path: "/sites_config", label: "Sites & Rules", icon: GlobeLock, badgeKey: "sites" as const },
    { path: "/logs", label: "Logs", icon: Database, badgeKey: "logs" as const },
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
                  class={`flex items-center gap-3 px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-300 relative group overflow-hidden ${
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
                  <span class={`block sm:inline tracking-tight line-clamp-1 text-center w-full ${ui.isSidebarExpanded ? "" : "sm:hidden"}`}>
                    {item.label}
                  </span>
                </A>
              );
            }}
          </For>
        </nav>
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
