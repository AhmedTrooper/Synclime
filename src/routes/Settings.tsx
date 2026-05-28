import { useEffect, useState } from "react";
import { useUIStore } from "../store/useUIStore";
import { Card, CardHeader, CardBody, Switch, Slider, Button, Divider } from "@heroui/react";
import { Settings as SettingsIcon, Shield, Monitor, RefreshCw } from "lucide-react";

export default function Settings() {
  const { setActivePath } = useUIStore();
  const [glassEffect, setGlassEffect] = useState(true);
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);
  const [developerConsole, setDeveloperConsole] = useState(false);
  const [dockSize, setDockSize] = useState<number>(64);
  const [savingState, setSavingState] = useState(false);

  useEffect(() => {
    setActivePath("/settings");
  }, [setActivePath]);

  const saveSettings = () => {
    if (savingState) return;
    setSavingState(true);
    setTimeout(() => {
      setSavingState(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-10 w-full max-w-4xl mx-auto px-4 py-8 text-white">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <SettingsIcon className="w-6 h-6 animate-spin-slow" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mt-1">
          Settings <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">Console</span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-400 max-w-lg leading-relaxed">
          Configure rendering, system limits, desktop visual tokens, and local sandboxing policies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4">
        {/* Customization Settings */}
        <Card className="bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl text-white">
          <CardHeader className="flex gap-3 p-5 border-b border-white/5 bg-gradient-to-r from-amber-950/20 to-orange-950/20">
            <Monitor className="w-5 h-5 text-amber-400" />
            <div className="flex flex-col">
              <p className="text-sm font-bold text-zinc-100">Visual Engine</p>
              <p className="text-[10px] text-zinc-400">Dock & window customizations</p>
            </div>
          </CardHeader>
          <CardBody className="p-5 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-zinc-200">Glassmorphic Blur</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Enable backdrop filtering and reflections</span>
                </div>
                <Switch
                  isSelected={glassEffect}
                  onValueChange={setGlassEffect}
                  size="sm"
                  color="warning"
                />
              </div>

              <Divider className="bg-white/5" />

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-zinc-200">Dock Magnification Scale</span>
                    <span className="text-[10px] text-zinc-400 font-normal">Base dock sizing in pixels</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">{dockSize}px</span>
                </div>
                <Slider
                  aria-label="Dock size slider"
                  step={4}
                  maxValue={80}
                  minValue={48}
                  value={dockSize}
                  onChange={(val) => setDockSize(val as number)}
                  className="max-w-full"
                  color="warning"
                  size="sm"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Security & System Settings */}
        <Card className="bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl text-white">
          <CardHeader className="flex gap-3 p-5 border-b border-white/5 bg-gradient-to-r from-yellow-950/20 to-amber-950/20">
            <Shield className="w-5 h-5 text-yellow-400" />
            <div className="flex flex-col">
              <p className="text-sm font-bold text-zinc-100">System Sandboxing</p>
              <p className="text-[10px] text-zinc-400">Client performance parameters</p>
            </div>
          </CardHeader>
          <CardBody className="p-5 flex flex-col gap-5 justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-zinc-200">GPU Hardware Acceleration</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Boost physics animations & 3D graphics</span>
                </div>
                <Switch
                  isSelected={hardwareAcceleration}
                  onValueChange={setHardwareAcceleration}
                  size="sm"
                  color="warning"
                />
              </div>

              <Divider className="bg-white/5" />

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-zinc-200">Developer Debug Terminal</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Expose terminal shells and raw metrics</span>
                </div>
                <Switch
                  isSelected={developerConsole}
                  onValueChange={setDeveloperConsole}
                  size="sm"
                  color="warning"
                />
              </div>
            </div>

            <Button
              className="bg-warning/15 hover:bg-warning/25 text-amber-300 font-semibold border border-warning/20 mt-4 w-full"
              isLoading={savingState}
              onClick={saveSettings}
            >
              {!savingState && <RefreshCw className="w-4 h-4 mr-1.5" />}
              Save Systems Settings
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
