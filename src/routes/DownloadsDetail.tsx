import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { mockDownloads } from "./Downloads";
import { useUIStore } from "../store/useUIStore";
import { Card, CardHeader, CardBody, Button, Progress, Chip } from "@heroui/react";
import { ArrowLeft, HardDrive, RefreshCw, Terminal, Clock, ShieldCheck } from "lucide-react";

export default function DownloadsDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { setActivePath } = useUIStore();
  const [simulatedLog, setSimulatedLog] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setActivePath("/downloads");
  }, [setActivePath]);

  const item = mockDownloads.find((d) => d.slug === slug);

  useEffect(() => {
    if (item) {
      setSimulatedLog([
        `[SYSTEM] Initializing stream hook for ${item.name}...`,
        `[SYSTEM] Hook established. Fetching segment chunk metadata...`,
        `[SEGMENT] Found 2,451 payload segments. Allocating local filesystem buffer.`,
        item.status === "Completed"
          ? `[SUCCESS] Local verify completed. Hash SHA-256 match: 0x9f88a8d...`
          : `[DOWNLOADING] Downloading chunks from nearest CDN node...`,
      ]);
    }
  }, [item]);

  const triggerVerification = () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setSimulatedLog((prev) => [...prev, "[DIAG] Triggering full integrity scan on local chunks..."]);
    
    setTimeout(() => {
      setSimulatedLog((prev) => [
        ...prev,
        "[DIAG] Scan complete. Block verification: 100% OK.",
        "[SUCCESS] Sandbox environment ready to initialize virtual launch."
      ]);
      setIsVerifying(false);
    }, 1500);
  };

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 text-white min-h-[400px]">
        <Card className="bg-red-500/10 border border-red-500/20 backdrop-blur-xl p-8 max-w-md text-center">
          <CardBody className="flex flex-col gap-4 items-center">
            <h2 className="text-xl font-bold text-red-400">Resource Not Found</h2>
            <p className="text-sm text-zinc-400">
              The requested package identifier "{slug}" does not exist in our active repositories.
            </p>
            <Button as={Link} to="/downloads" className="bg-white/5 border border-white/10 hover:bg-white/10 text-white mt-2">
              Back to Downloads
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-8 w-full max-w-4xl mx-auto px-4 py-8 text-zinc-950 dark:text-white transition-colors duration-300">
      {/* Back Button */}
      <Button
        as={Link}
        to="/downloads"
        size="sm"
        className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-white/10 transition-all duration-300"
        startContent={<ArrowLeft className="w-4 h-4" />}
      >
        Back to Downloads
      </Button>

      {/* Hero card */}
      <Card className="w-full bg-white/70 dark:bg-black/40 border border-zinc-200 dark:border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 dark:from-blue-900/10 dark:to-indigo-900/10 border-b border-zinc-200/50 dark:border-white/5 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-zinc-800/5 dark:bg-white/5 border border-zinc-200 dark:border-white/5">
              <HardDrive className={`w-8 h-8 ${item.iconColor}`} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white transition-colors duration-300">{item.name}</h2>
                <Chip size="sm" variant="flat" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {item.category}
                </Chip>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 transition-colors duration-300">Package Identifier: {item.slug}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono transition-colors duration-300">Size: {item.size}</span>
          </div>
        </CardHeader>

        <CardBody className="p-6 flex flex-col gap-6">
          {/* Main Specs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 p-4 bg-zinc-800/5 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl transition-all duration-300">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider transition-colors duration-300">Status Code</span>
              <span className="text-sm font-semibold flex items-center gap-1.5 mt-1 text-blue-600 dark:text-blue-400 transition-colors duration-300">
                <Clock className="w-4 h-4" />
                {item.status}
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4 bg-zinc-800/5 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl transition-all duration-300">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider transition-colors duration-300">Security Integrity</span>
              <span className="text-sm font-semibold flex items-center gap-1.5 mt-1 text-emerald-600 dark:text-emerald-400 transition-colors duration-300">
                <ShieldCheck className="w-4 h-4" />
                SHA-256 Validated
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4 bg-zinc-800/5 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl transition-all duration-300">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider transition-colors duration-300">Storage Target</span>
              <span className="text-sm font-semibold flex items-center gap-1.5 mt-1 text-zinc-700 dark:text-zinc-300 transition-colors duration-300">
                <HardDrive className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                /var/opt/osgui/images
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 transition-colors duration-300">Description</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal transition-colors duration-300">{item.description}</p>
          </div>

          {/* Progress Tracker */}
          <div className="flex flex-col gap-3 p-4 bg-zinc-800/5 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl transition-all duration-300">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 transition-colors duration-300">Transfer Progress</span>
              <span className="font-mono text-zinc-500 dark:text-zinc-400 font-bold transition-colors duration-300">{item.progress}%</span>
            </div>
            <Progress
              value={item.progress}
              color={item.progress === 100 ? "success" : "primary"}
              className="w-full"
            />
            {item.speed && (
              <span className="text-[10px] text-zinc-500 font-mono self-end transition-colors duration-300">
                Current Speed: <strong className="text-blue-600 dark:text-blue-400">{item.speed}</strong>
              </span>
            )}
          </div>

          {/* Dynamic Console / Logs */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 transition-colors duration-300">
                <Terminal className="w-4.5 h-4.5 text-zinc-500" />
                <span className="text-xs font-bold font-mono">System Live Shell</span>
              </div>
              <Button
                size="sm"
                onClick={triggerVerification}
                isLoading={isVerifying}
                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 px-3 py-1.5 h-auto min-w-0 transition-all duration-300"
              >
                {!isVerifying && <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                Scan Integrity
              </Button>
            </div>

            <div className="bg-zinc-950/90 dark:bg-black/60 border border-zinc-200 dark:border-white/5 rounded-xl p-4 font-mono text-[10px] text-zinc-600 dark:text-zinc-400 flex flex-col gap-1.5 min-h-[120px] shadow-inner custom-scrollbar overflow-y-auto transition-all duration-300">
              {simulatedLog.map((log, index) => {
                let colorClass = "text-zinc-500 dark:text-zinc-400";
                if (log.startsWith("[SUCCESS]")) colorClass = "text-emerald-600 dark:text-emerald-400";
                if (log.startsWith("[SYSTEM]")) colorClass = "text-blue-600 dark:text-blue-400";
                if (log.startsWith("[DIAG]")) colorClass = "text-amber-600 dark:text-amber-300/80";
                return (
                  <div key={index} className={colorClass}>
                    {log}
                  </div>
                );
              })}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
