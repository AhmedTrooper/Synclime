import { useEffect } from "react";
import ZustandDemo from "../features/demo/components/ZustandDemo";
import { useUIStore } from "../store/useUIStore";
import { Sparkles, Terminal, Shield, Zap } from "lucide-react";
import { Card, CardBody } from "@heroui/react";

export default function Home() {
  const { setActivePath } = useUIStore();

  useEffect(() => {
    setActivePath("/");
  }, [setActivePath]);

  const cards = [
    {
      icon: Terminal,
      title: "Tauri Native Core",
      desc: "Blazing fast Rust back-end with secure system bindings.",
      color: "from-blue-500/20 to-cyan-500/20 text-cyan-400",
    },
    {
      icon: Shield,
      title: "Hardened Security",
      desc: "Robust sandbox configuration and strict IPC capabilities.",
      color: "from-purple-500/20 to-indigo-500/20 text-indigo-400",
    },
    {
      icon: Zap,
      title: "Liquid Smooth UI",
      desc: "Dynamic glassmorphism powered by HeroUI & Framer Motion.",
      color: "from-amber-500/20 to-orange-500/20 text-orange-400",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-12 w-full max-w-5xl mx-auto px-4 py-8">
      {/* Hero Header */}
      <div className="text-center flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-semibold text-blue-600 dark:text-blue-300 tracking-wide animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          SYSTEM OPERATIONAL
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-white mt-2 transition-colors duration-300">
          Welcome to <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">OSGUI Client</span>
        </h1>
        <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed transition-colors duration-300">
          A high-performance shell interface engineered for seamless desktop operations. Fully modular, premium-designed, and lightning-fast.
        </p>
      </div>

      {/* Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {cards.map(({ icon: Icon, title, desc, color }, i) => (
          <Card
            key={i}
            className="bg-white/50 dark:bg-black/30 border border-zinc-200/50 dark:border-white/5 backdrop-blur-md rounded-2xl hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300 group hover:-translate-y-1 text-zinc-950 dark:text-white"
          >
            <CardBody className="p-6 flex flex-col gap-3">
              <div className={`p-3 rounded-xl w-fit bg-gradient-to-br ${color} transition-transform duration-300 group-hover:scale-110`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-md font-bold text-zinc-800 dark:text-white tracking-wide mt-1 transition-colors duration-300">{title}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed transition-colors duration-300">{desc}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Zustand Demo Control Panel */}
      <div className="w-full flex justify-center mt-4">
        <ZustandDemo />
      </div>
    </div>
  );
}
