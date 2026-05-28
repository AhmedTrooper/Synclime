import { Outlet } from "react-router-dom";
import BottomDock from "../features/navigation/components/BottomDock";

export default function MainLayout() {
  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors duration-300 overflow-x-hidden flex flex-col font-sans">
      {/* Background Gradients */}
      <div className="absolute inset-0 -z-50 h-full w-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.06),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      
      {/* Background subtle noise or grid effect */}
      <div className="absolute inset-0 -z-50 h-full w-full bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />


      {/* Main content container */}
      <main className="flex-grow flex flex-col px-4 py-8 pb-32 w-full mx-auto relative z-10">
        <Outlet />
      </main>

      {/* Sticky Premium Bottom Dock */}
      <BottomDock />
    </div>
  );
}
