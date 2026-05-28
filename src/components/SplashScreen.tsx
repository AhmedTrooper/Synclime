import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BOOT_STEPS = [
  "ESTABLISHING SECURE PORT PIPELINE...",
  "OPTIMIZING HIGH-SPEED YT-DLP CORE...",
  "INITIALIZING NATIVE DESKTOP SHELL...",
  "SYNCLIME ENGINE IS READY",
];

export default function SplashScreen() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const intervals = [400, 900, 1400];
    const timers = intervals.map((time, index) =>
      setTimeout(() => {
        setCurrentStep(index + 1);
      }, time)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050507] text-white select-none overflow-hidden"
    >
      {/* Sleek backing glowing orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-purple-600/5 rounded-full blur-[80px]" />

      {/* Modern thin decorative grid layout for extreme high-tech aesthetic */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
      
      {/* Main loading cluster */}
      <div className="relative flex flex-col items-center gap-8 z-10">
        
        {/* Pulsing Core SVG Logo Container */}
        <motion.div
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative flex items-center justify-center p-6 rounded-3xl bg-white/[0.02] border border-white/5 shadow-[0_0_80px_-20px_rgba(59,130,246,0.2)] backdrop-blur-md"
        >
          {/* Custom Luxury Rotating SVG Logo */}
          <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
              <linearGradient id="violetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Outer dotted tracking orbit ring */}
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              stroke="url(#blueGrad)"
              strokeWidth="1.5"
              strokeDasharray="4 8 12 8"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
            />

            {/* Inner reversing orbital ring */}
            <motion.circle
              cx="32"
              cy="32"
              r="22"
              stroke="url(#violetGrad)"
              strokeWidth="1"
              strokeDasharray="5 5"
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            />

            {/* Glowing Core Down Arrow (Sleek geometric lines representing high-speed extraction) */}
            <motion.path
              d="M32 18 V38 M24 30 L32 38 L40 30"
              stroke="url(#blueGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{
                y: [0, 2, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Minimal base bar */}
            <path
              d="M22 44 H42"
              stroke="#4b5563"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.6"
            />
          </svg>
        </motion.div>

        {/* Text Headers */}
        <div className="text-center flex flex-col gap-2 mt-1">
          <h1 className="text-4xl font-extrabold tracking-[0.25em] bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent uppercase select-none font-sans drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] pl-[0.25em]">
            Synclime
          </h1>
          <span className="text-[9px] font-semibold tracking-[0.3em] text-zinc-500 uppercase select-none pl-[0.3em] opacity-80">
            High-Performance Media Engine
          </span>
        </div>

        {/* Progress bar tracking the boot sequence */}
        <div className="flex flex-col items-center gap-3 mt-2">
          {/* Minimal Cohesive Loader Line */}
          <div className="relative w-56 h-[3px] bg-zinc-900 rounded-full overflow-hidden border border-white/[0.03]">
            <motion.div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]"
              initial={{ width: "15%" }}
              animate={{
                width:
                  currentStep === 0
                    ? "25%"
                    : currentStep === 1
                    ? "55%"
                    : currentStep === 2
                    ? "85%"
                    : "100%",
              }}
              transition={{
                duration: 0.5,
                ease: "easeOut",
              }}
            />
          </div>

          {/* Dynamic Status Text */}
          <div className="h-4 overflow-hidden relative w-72 flex justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentStep}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute text-[9px] font-mono tracking-widest text-zinc-400 select-none text-center"
              >
                {BOOT_STEPS[currentStep]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Subtle version metadata footer for native quality feel */}
      <div className="absolute bottom-6 left-8 right-8 flex justify-between text-[8px] font-mono text-zinc-600 tracking-wider">
        <span>ENGINE STATUS: OK</span>
        <span>BUILD v1.0.0-STABLE</span>
      </div>
    </motion.div>
  );
}
