"use client";

import { useMemo } from "react";
import { Flame, Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StreakDisplay - Shows current streak with flame animation and calendar heatmap
 */

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  activityDates?: string[]; // ISO date strings for calendar heatmap
  className?: string;
  variant?: "compact" | "full";
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  lastActivityDate,
  activityDates = [],
  className,
  variant = "compact"
}: StreakDisplayProps) {
  // Generate last 30 days for heatmap
  const heatmapDays = useMemo(() => {
    const days: { date: string; hasActivity: boolean }[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        hasActivity: activityDates.includes(dateStr)
      });
    }
    
    return days;
  }, [activityDates]);

  // Check if streak is active today
  const today = new Date().toISOString().split('T')[0];
  const isActiveToday = lastActivityDate === today;

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all",
          currentStreak > 0 
            ? "bg-gradient-to-r from-orange-500/20 to-yellow-500/20 text-orange-500" 
            : "bg-secondary text-muted-foreground"
        )}>
          <Flame className={cn(
            "h-5 w-5",
            currentStreak > 0 && "animate-pulse"
          )} />
          <span className="font-bold text-lg">{currentStreak}</span>
          <span className="text-xs opacity-70">day{currentStreak !== 1 ? 's' : ''}</span>
        </div>
        
        {!isActiveToday && currentStreak > 0 && (
          <span className="text-xs text-amber-500 animate-pulse">
            Learn today to keep your streak!
          </span>
        )}
      </div>
    );
  }

  // Full variant with calendar heatmap
  return (
    <div className={cn("space-y-4", className)}>
      {/* Streak header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center h-14 w-14 rounded-2xl",
            currentStreak > 0 
              ? "bg-gradient-to-br from-orange-500 to-yellow-500" 
              : "bg-secondary"
          )}>
            <Flame className={cn(
              "h-8 w-8",
              currentStreak > 0 ? "text-white" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <div className="text-3xl font-bold">{currentStreak}</div>
            <div className="text-sm text-muted-foreground">
              day streak
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1 text-yellow-500">
            <Trophy className="h-4 w-4" />
            <span className="font-semibold">{longestStreak}</span>
          </div>
          <div className="text-xs text-muted-foreground">best streak</div>
        </div>
      </div>
      
      {/* Streak warning */}
      {!isActiveToday && currentStreak > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
          🔥 Learn today to keep your {currentStreak}-day streak alive!
        </div>
      )}
      
      {/* Calendar heatmap */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Last 30 days</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {heatmapDays.map(({ date, hasActivity }) => (
            <div
              key={date}
              className={cn(
                "h-3 w-3 rounded-sm transition-colors",
                hasActivity 
                  ? "bg-green-500" 
                  : "bg-secondary/50",
                date === today && "ring-1 ring-primary"
              )}
              title={`${date}${hasActivity ? ' ✓' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
