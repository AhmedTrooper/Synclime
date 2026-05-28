import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useUIStore } from "../store/useUIStore";
import { Card, CardBody, Button, Progress, Chip } from "@heroui/react";
import { Download, ExternalLink, HardDrive, Cpu, Layers } from "lucide-react";

export interface DownloadItem {
  slug: string;
  name: string;
  category: string;
  size: string;
  status: "Completed" | "Downloading" | "Queued" | "Failed";
  progress: number;
  speed?: string;
  description: string;
  iconColor: string;
}

export const mockDownloads: DownloadItem[] = [
  {
    slug: "ubuntu-desktop",
    name: "Ubuntu Desktop v24.04 LTS",
    category: "Operating System",
    size: "4.1 GB",
    status: "Downloading",
    progress: 68,
    speed: "24.5 MB/s",
    description: "The complete Ubuntu desktop operating system, featuring the GNOME desktop environment and LTS security support.",
    iconColor: "text-orange-500",
  },
  {
    slug: "arch-minimal",
    name: "Arch Linux Minimal ISO",
    category: "Operating System",
    size: "890 MB",
    status: "Completed",
    progress: 100,
    description: "A lightweight, flexible Linux distribution that puts you in complete control of your system configurations.",
    iconColor: "text-cyan-400",
  },
  {
    slug: "fedora-workstation",
    name: "Fedora Workstation v40",
    category: "Operating System",
    size: "2.3 GB",
    status: "Queued",
    progress: 0,
    description: "A polished, easy-to-use operating system for laptop and desktop computers, featuring the latest GNOME environment.",
    iconColor: "text-blue-500",
  },
];

export default function Downloads() {
  const { setActivePath } = useUIStore();

  useEffect(() => {
    setActivePath("/downloads");
  }, [setActivePath]);

  return (
    <div className="flex flex-col items-center justify-center gap-10 w-full max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <Download className="w-6 h-6 animate-bounce" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white mt-1 transition-colors duration-300">
          Downloads <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">Manager</span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed transition-colors duration-300">
          Monitor your active transfers, system image builds, and virtual OS allocations in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 w-full mt-4">
        {mockDownloads.map((item) => {
          const statusColors = {
            Completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            Downloading: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
            Queued: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
            Failed: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
          };

          return (
            <Card key={item.slug} className="bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl shadow-xl rounded-2xl text-zinc-950 dark:text-white overflow-hidden transition-all duration-300 hover:border-zinc-300 dark:hover:border-white/15">
              <CardBody className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
                
                {/* Core Info */}
                <div className="flex items-start gap-4 flex-grow max-w-xl">
                  <div className="p-3 rounded-xl bg-zinc-800/5 dark:bg-white/5 border border-zinc-200 dark:border-white/5 mt-1">
                    <HardDrive className={`w-6 h-6 ${item.iconColor}`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-wide transition-colors duration-300">{item.name}</h3>
                      <Chip size="sm" variant="bordered" className={statusColors[item.status]}>
                        {item.status}
                      </Chip>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal mt-0.5 transition-colors duration-300">{item.description}</p>
                    <div className="flex items-center gap-4 text-[10px] text-zinc-500 mt-2 font-mono transition-colors duration-300">
                      <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {item.category}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {item.size}</span>
                    </div>
                  </div>
                </div>

                {/* Progress and Actions */}
                <div className="flex flex-col gap-3 w-full md:w-64 flex-shrink-0 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-white/5 pt-4 md:pt-0 md:pl-6 transition-colors duration-300">
                  {item.status === "Downloading" && (
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400 transition-colors duration-300">
                        <span>{item.speed}</span>
                        <span>{item.progress}%</span>
                      </div>
                      <Progress 
                        value={item.progress} 
                        size="sm" 
                        color="primary"
                        className="w-full"
                      />
                    </div>
                  )}

                  {item.status === "Completed" && (
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400 transition-colors duration-300">
                        <span className="text-emerald-600 dark:text-emerald-400">Finished</span>
                        <span>100%</span>
                      </div>
                      <Progress 
                        value={100} 
                        size="sm" 
                        color="success"
                        className="w-full"
                      />
                    </div>
                  )}

                  {item.status === "Queued" && (
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex justify-between text-xs font-mono text-zinc-500 transition-colors duration-300">
                        <span>Waiting...</span>
                        <span>0%</span>
                      </div>
                      <Progress 
                        value={0} 
                        size="sm" 
                        color="default"
                        className="w-full"
                      />
                    </div>
                  )}

                  <Button
                    as={Link}
                    to={`/downloads/${item.slug}`}
                    size="sm"
                    className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-white font-medium border border-zinc-200 dark:border-white/10 mt-1 transition-all duration-300"
                    endContent={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    View Details
                  </Button>
                </div>

              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
