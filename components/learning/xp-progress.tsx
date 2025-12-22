"use client";

import { useEffect, useState } from "react";
import { Sparkles, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * XPProgress - XP bar with level progression and gain animations
 */

interface XPProgressProps {
  xp: number;
  level: number;
  className?: string;
  showGain?: number; // Show +XP animation
}

// XP required per level (increases each level)
function getXPForLevel(level: number): number {
  return level * 100 + Math.floor(level * level * 10);
}

function getLevelProgress(xp: number): { level: number; currentXP: number; requiredXP: number; percentage: number } {
  let level = 1;
  let totalRequired = getXPForLevel(1);
  
  while (xp >= totalRequired && level < 100) {
    level++;
    totalRequired += getXPForLevel(level);
  }
  
  const previousTotal = totalRequired - getXPForLevel(level);
  const currentLevelXP = xp - previousTotal;
  const requiredForCurrentLevel = getXPForLevel(level);
  
  return {
    level,
    currentXP: currentLevelXP,
    requiredXP: requiredForCurrentLevel,
    percentage: Math.min(100, (currentLevelXP / requiredForCurrentLevel) * 100)
  };
}

export function XPProgress({ xp, level: providedLevel, className, showGain }: XPProgressProps) {
  const [animatingGain, setAnimatingGain] = useState<number | null>(null);
  const progress = getLevelProgress(xp);
  
  // Animate XP gain
  useEffect(() => {
    if (showGain && showGain > 0) {
      setAnimatingGain(showGain);
      const timer = setTimeout(() => setAnimatingGain(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [showGain]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Level and XP header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
            <Star className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold">Level {progress.level}</div>
            <div className="text-xs text-muted-foreground">
              {progress.currentXP.toLocaleString()} / {progress.requiredXP.toLocaleString()} XP
            </div>
          </div>
        </div>
        
        {/* XP gain animation */}
        {animatingGain && (
          <div className="animate-bounce text-green-500 font-bold flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            +{animatingGain} XP
          </div>
        )}
        
        {/* Total XP */}
        <div className="text-right text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {xp.toLocaleString()} total XP
          </div>
        </div>
      </div>
      
      {/* XP Progress bar */}
      <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${progress.percentage}%` }}
        />
        {/* Shine effect */}
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
          style={{ 
            width: `${progress.percentage}%`,
            animation: 'shine 2s ease-in-out infinite'
          }}
        />
      </div>
    </div>
  );
}

// XP reward display component
interface XPRewardProps {
  amount: number;
  reason: string;
  onComplete?: () => void;
}

export function XPReward({ amount, reason, onComplete }: XPRewardProps) {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="animate-in zoom-in-50 fade-in duration-300 bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 animate-spin" />
          <div>
            <div className="text-3xl font-bold">+{amount} XP</div>
            <div className="text-sm opacity-90">{reason}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
