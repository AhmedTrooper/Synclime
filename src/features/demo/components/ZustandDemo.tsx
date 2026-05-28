import { Card, CardHeader, CardBody, Button, ButtonGroup, Divider } from "@heroui/react";
import { useUIStore } from "../../../store/useUIStore";
import { Home, Info, Download, Settings, Plus, Minus } from "lucide-react";

export default function ZustandDemo() {
  const { badges, incrementBadge, decrementBadge, clearBadge } = useUIStore();

  const badgeControllers = [
    { key: "home" as const, label: "Home Badge", icon: Home, color: "text-blue-500" },
    { key: "about" as const, label: "About Badge", icon: Info, color: "text-purple-500" },
    { key: "downloads" as const, label: "Downloads Badge", icon: Download, color: "text-emerald-500" },
    { key: "settings" as const, label: "Settings Badge", icon: Settings, color: "text-amber-500" },
  ];

  return (
    <Card className="w-full max-w-2xl bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden text-zinc-950 dark:text-white transition-all duration-300">
      <CardHeader className="flex flex-col gap-1.5 p-6 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 dark:from-blue-600/20 dark:via-indigo-600/20 dark:to-purple-600/20 border-b border-zinc-200/50 dark:border-white/5 transition-all duration-300">
        <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
          Zustand Live State Controller
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Modify global notifications in real-time. Notice how the bottom dock items instantly animate and display the updated badges!
        </p>
      </CardHeader>
      
      <CardBody className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {badgeControllers.map(({ key, label, icon: Icon, color }) => (
            <div
              key={key}
              className="flex flex-col gap-3 p-4 bg-zinc-800/5 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 rounded-xl hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg bg-zinc-800/5 dark:bg-white/5 ${color}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
                </div>
                <div className="relative">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg shadow-red-500/30 transition-transform duration-300">
                    {badges[key]}
                  </span>
                </div>
              </div>

              <Divider className="bg-zinc-800/10 dark:bg-white/5" />

              <div className="flex items-center justify-between gap-2 mt-1">
                <ButtonGroup size="sm" className="w-full border border-zinc-200 dark:border-white/5 rounded-lg overflow-hidden">
                  <Button
                    isIconOnly
                    className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-white/5"
                    onClick={() => decrementBadge(key)}
                    aria-label={`Decrease ${label}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 flex-grow text-xs font-semibold px-2"
                    onClick={() => clearBadge(key)}
                  >
                    Clear
                  </Button>
                  <Button
                    isIconOnly
                    className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 border-l border-zinc-200 dark:border-white/5"
                    onClick={() => incrementBadge(key)}
                    aria-label={`Increase ${label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </ButtonGroup>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
