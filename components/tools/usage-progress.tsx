"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface UsageProgressProps {
  current: number;
  max: number;
  isGuest: boolean;
  className?: string;
}

export function UsageProgress({ current, max, isGuest, className }: UsageProgressProps) {
  const percentage = Math.min(100, (current / max) * 100);
  const remaining = Math.max(0, max - current);
  
  // Color logic
  let colorClass = "bg-emerald-500";
  if (percentage > 60) colorClass = "bg-amber-500";
  if (percentage >= 100) colorClass = "bg-red-500";
  
  if (!isGuest) return null; // Only show strictly for guests for now

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex flex-col items-end gap-1 cursor-help", className)}>
            <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", colorClass)} 
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              {remaining} free left
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
          <p>
            You&apos;ve used {current} of {max} free daily credits. 
            <span className="block font-bold mt-1 text-primary">Sign up for more.</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
