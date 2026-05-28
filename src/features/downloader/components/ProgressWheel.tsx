interface ProgressWheelProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressWheel({ progress, size = 60, strokeWidth = 5 }: ProgressWheelProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center animate-fadeIn" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background track circle */}
        <circle
          className="text-zinc-200 dark:text-zinc-800"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Foreground dynamic progress circle */}
        <circle
          className="text-blue-500 transition-all duration-300"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[10px] font-bold font-mono text-zinc-900 dark:text-white">
        {Math.round(progress)}%
      </span>
    </div>
  );
}
