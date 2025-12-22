"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * SectionComplete - Button to mark section as complete with XP reward
 */

interface SectionCompleteProps {
  sectionId: string;
  isCompleted: boolean;
  onComplete: (sectionId: string) => void;
  xpReward?: number;
  hasNextSection?: boolean;
  onNextSection?: () => void;
  className?: string;
}

export function SectionComplete({
  sectionId,
  isCompleted,
  onComplete,
  xpReward = 10,
  hasNextSection = false,
  onNextSection,
  className
}: SectionCompleteProps) {
  const [showReward, setShowReward] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const handleComplete = () => {
    if (isCompleted) return;
    
    setShowReward(true);
    setJustCompleted(true);
    onComplete(sectionId);
    
    setTimeout(() => setShowReward(false), 2000);
  };

  if (isCompleted && !justCompleted) {
    return (
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/20",
        className
      )}>
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Section Completed</span>
        </div>
        
        {hasNextSection && onNextSection && (
          <Button onClick={onNextSection} variant="ghost" size="sm" className="gap-1">
            Next Section
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* XP Reward popup */}
      {showReward && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <Sparkles className="h-4 w-4" />
            <span className="font-bold">+{xpReward} XP</span>
          </div>
        </div>
      )}
      
      <Button
        onClick={handleComplete}
        disabled={isCompleted}
        className={cn(
          "w-full gap-2 h-12 text-base",
          justCompleted && "bg-green-600 hover:bg-green-600"
        )}
      >
        {justCompleted ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Completed! +{xpReward} XP
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Mark Section Complete
          </>
        )}
      </Button>
      
      {/* Next section button after completion */}
      {justCompleted && hasNextSection && onNextSection && (
        <Button 
          onClick={onNextSection}
          variant="outline"
          className="w-full mt-2 gap-2"
        >
          Continue to Next Section
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
