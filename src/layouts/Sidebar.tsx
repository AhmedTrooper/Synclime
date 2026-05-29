import { Link } from "react-router-dom";
import { Home, Info, Download, Settings, FileText } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

export default function Sidebar() {
  const { activePath, badges } = useUIStore();

  const navItems = [
    { path: "/", label: "New Task", icon: Home, badgeKey: "home" as const },
    { path: "/downloads", label: "Queue", icon: Download, badgeKey: "downloads" as const },
    { path: "/parsed_files", label: "Library", icon: FileText, badgeKey: "parsedFiles" as const },
    { path: "/settings", label: "Preferences", icon: Settings, badgeKey: "settings" as const },
    { path: "/about", label: "About", icon: Info, badgeKey: "about" as const },
  ];

  return (
    <div className="w-full sm:w-56 h-auto sm:h-full border-t sm:border-t-0 sm:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-row sm:flex-col flex-shrink-0 sm:pt-2 sm:pb-4 select-none z-20 shadow-[0_-1px_10px_rgba(0,0,0,0.02)] sm:shadow-[1px_0_10px_rgba(0,0,0,0.02)] relative">
      <div className="flex-1 overflow-x-auto sm:overflow-y-auto px-1 sm:px-3 py-1 sm:py-0 flex items-center sm:items-stretch scrollbar-hide">
        <h2 className="hidden sm:block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-3 mb-2 mt-2">
          Synclime
        </h2>
        <nav className="flex flex-row sm:flex-col gap-1 sm:gap-0.5 w-full justify-around sm:justify-start">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? activePath === "/"
                : activePath.startsWith(item.path);

            const badgeCount = badges[item.badgeKey];
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-[13px] font-medium transition-colors min-w-[64px] sm:min-w-0 flex-1 sm:flex-none ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 sm:bg-blue-600 sm:text-white shadow-none sm:shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 sm:text-zinc-600 sm:dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className={`w-5 h-5 sm:w-4 sm:h-4 ${isActive ? "text-blue-600 dark:text-blue-400 sm:text-white" : "text-zinc-400 dark:text-zinc-500"}`} />
                  {badgeCount > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 sm:static sm:top-0 sm:right-0 flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full text-[8px] sm:text-[10px] font-bold sm:ml-auto sm:h-4 sm:min-w-4 ${
                        isActive
                          ? "bg-blue-600 text-white sm:bg-white sm:text-blue-600"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </div>
                <span className="block sm:inline tracking-tight line-clamp-1 text-center w-full">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
