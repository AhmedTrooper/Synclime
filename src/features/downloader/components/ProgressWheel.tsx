interface ProgressWheelProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressWheel(props: ProgressWheelProps) {
  const size = () => props.size || 60;
  const strokeWidth = () => props.strokeWidth || 5;
  const radius = () => (size() - strokeWidth()) / 2;
  const circumference = () => radius() * 2 * Math.PI;
  const offset = () => circumference() - (props.progress / 100) * circumference();

  return (
    <div class="relative flex items-center justify-center animate-fadeIn" style={{ width: `${size()}px`, height: `${size()}px` }}>
      <svg class="transform -rotate-90" width={size()} height={size()}>
        {/* Background track circle */}
        <circle
          class="text-zinc-200 dark:text-zinc-800"
          stroke="currentColor"
          stroke-width={strokeWidth()}
          fill="transparent"
          r={radius()}
          cx={size() / 2}
          cy={size() / 2}
        />
        {/* Foreground dynamic progress circle */}
        <circle
          class="text-blue-500 transition-all duration-300"
          stroke="currentColor"
          stroke-width={strokeWidth()}
          stroke-dasharray={circumference()}
          stroke-dashoffset={offset()}
          stroke-linecap="round"
          fill="transparent"
          r={radius()}
          cx={size() / 2}
          cy={size() / 2}
        />
      </svg>
      <span class="absolute text-[10px] font-bold font-mono text-zinc-900 dark:text-white">
        {Math.round(props.progress)}%
      </span>
    </div>
  );
}
