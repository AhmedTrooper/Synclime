import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#09090b] text-white select-none overflow-hidden"
    >
      {/* Sleek backing blur shapes */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-purple-500/10 rounded-full blur-2xl" />

      {/* Main loading cluster */}
      <div className="relative flex flex-col items-center gap-6 z-10">
        
        {/* Pulsing Core Icon Container */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]"
        >
          <Sparkles className="w-10 h-10 text-blue-400" />
        </motion.div>

        {/* Text Headers */}
        <div className="text-center flex flex-col gap-1.5">
          <h1 className="text-2xl font-black tracking-widest bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent uppercase">
            Synclime Client
          </h1>
          <span className="text-[10px] tracking-wider text-zinc-500 font-bold uppercase font-mono animate-pulse">
            yt-dlp GUI System Wrapper
          </span>
        </div>

        {/* Cohesive loading line */}
        <div className="relative w-48 h-[3px] bg-zinc-800 rounded-full overflow-hidden border border-white/5">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          />
        </div>

        {/* Subtext info */}
        <span className="text-[10px] font-mono text-zinc-500 mt-2">
          Initializing Core Host Systems...
        </span>
      </div>
    </motion.div>
  );
}
