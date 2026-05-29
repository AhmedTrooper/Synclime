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
    <div className="w-56 h-full border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col flex-shrink-0 pt-2 pb-4 select-none z-20 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
      <div className="px-3 flex-1 overflow-y-auto">
        <h2 className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-3 mb-2 mt-2">
          Synclime
        </h2>
        <nav className="flex flex-col gap-0.5">
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
                className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-400 dark:text-zinc-500"}`} />
                {item.label}
                {badgeCount > 0 && (
                  <span
                    className={`ml-auto flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-white text-blue-600"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
