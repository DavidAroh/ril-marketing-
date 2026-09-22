import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  unit?: string;
  className?: string;
  showPercentage?: boolean;
}

export function ProgressBar({
  current,
  target,
  label,
  unit = "",
  className,
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  const filledBlocks = Math.floor(percentage / 5); // 20 blocks total
  const totalBlocks = 20;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="tnum text-xs text-muted-foreground">
            {current.toLocaleString()} / {target.toLocaleString()} {unit}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-[2px] h-2">
          {Array.from({ length: totalBlocks }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-sm transition-colors duration-200",
                i < filledBlocks
                  ? "bg-primary"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
        {showPercentage && (
          <span className="tnum text-xs font-medium w-9 text-right">
            {percentage}%
          </span>
        )}
      </div>
    </div>
  );
}
