import { useEffect } from "react";
import { useUIStore } from "../store/useUIStore";
import { Card, CardHeader, CardBody, Divider, Code, Chip } from "@heroui/react";
import { Cpu, Layers, Info } from "lucide-react";

export default function About() {
  const { setActivePath } = useUIStore();

  useEffect(() => {
    setActivePath("/about");
  }, [setActivePath]);

  const specs = [
    { label: "Core Host Architecture", val: "Tauri v2.0 Sandbox" },
    { label: "Rendering Engine", val: "WebKit / Chromium" },
    { label: "Application State", val: "Zustand v5.0.5 Store" },
    { label: "Design System Tokens", val: "HeroUI & TailwindCSS" },
    { label: "Motion Micro-animations", val: "Framer Motion 12" },
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-10 w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <div className="p-3 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <Info className="w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mt-1">
          System <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">Specifications</span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-400 max-w-lg leading-relaxed">
          Deep-dive analysis of the environment running the OSGUI frontend architecture and system integration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4">
        {/* Tech Stack Card */}
        <Card className="bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl text-white">
          <CardHeader className="flex gap-3 p-5 border-b border-white/5 bg-gradient-to-r from-purple-950/20 to-indigo-950/20">
            <Layers className="w-5 h-5 text-purple-400" />
            <div className="flex flex-col">
              <p className="text-sm font-bold text-zinc-100">Frontend Stack</p>
              <p className="text-[10px] text-zinc-400">Main technology stack parameters</p>
            </div>
          </CardHeader>
          <CardBody className="p-5 flex flex-col gap-4">
            {specs.map((spec, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-medium">{spec.label}</span>
                <Code className="bg-zinc-800/40 border border-white/5 text-purple-300 font-mono text-[11px] px-2 py-0.5 rounded">
                  {spec.val}
                </Code>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* System Diagnostics */}
        <Card className="bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl text-white">
          <CardHeader className="flex gap-3 p-5 border-b border-white/5 bg-gradient-to-r from-pink-950/20 to-red-950/20">
            <Cpu className="w-5 h-5 text-pink-400" />
            <div className="flex flex-col">
              <p className="text-sm font-bold text-zinc-100">Performance Diagnostics</p>
              <p className="text-[10px] text-zinc-400">Simulated diagnostics metrics</p>
            </div>
          </CardHeader>
          <CardBody className="p-5 flex flex-col gap-5 justify-center">
            <div className="flex items-center gap-4">
              <div className="flex-grow flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-zinc-300">
                  <span>Resource Consumption</span>
                  <span className="text-zinc-400">12% Idle</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" style={{ width: "12%" }}></div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-grow flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-zinc-300">
                  <span>RAM Allocations</span>
                  <span className="text-zinc-400">42 MB / 16 GB</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full" style={{ width: "24%" }}></div>
                </div>
              </div>
            </div>

            <Divider className="bg-white/5" />

            <div className="flex flex-wrap gap-2">
              <Chip size="sm" className="bg-zinc-800/40 border border-white/5 text-zinc-300">
                Sandboxed OS
              </Chip>
              <Chip size="sm" className="bg-zinc-800/40 border border-white/5 text-zinc-300">
                GPU Accelerated
              </Chip>
              <Chip size="sm" className="bg-zinc-800/40 border border-white/5 text-zinc-300">
                Bridges Enabled
              </Chip>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
