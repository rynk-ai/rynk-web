/**
 * Saved Surfaces Pill - Floating indicator showing saved surface progress
 * 
 * Displays when conversation has saved surfaces (learning/guide).
 * Click to navigate directly to saved surface (no regeneration).
 */

"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ListChecks, ChevronRight, Target, Scale, Layers, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedSurfacesPillProps {
  conversationId: string;
  surfaceStates?: Record<string, any>;
  className?: string;
}

const SURFACE_CONFIG = {
  learning: {
    icon: BookOpen,
    label: "Course",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  guide: {
    icon: ListChecks,
    label: "Guide", 
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  quiz: {
    icon: Target,
    label: "Quiz",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  comparison: {
    icon: Scale,
    label: "Compare",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  flashcard: {
    icon: Layers,
    label: "Flashcards",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
  },
  timeline: {
    icon: Calendar,
    label: "Timeline",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  wiki: {
    icon: BookOpen,
    label: "Wiki",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
} as const;

export const SavedSurfacesPill = memo(function SavedSurfacesPill({
  conversationId,
  surfaceStates,
  className,
}: SavedSurfacesPillProps) {
  const router = useRouter();

  // Get available saved surfaces
  const savedTypes = Object.keys(surfaceStates || {}).filter(
    (type) => surfaceStates?.[type] && SURFACE_CONFIG[type as keyof typeof SURFACE_CONFIG]
  ) as Array<keyof typeof SURFACE_CONFIG>;

  if (savedTypes.length === 0) return null;

  const handleClick = (type: keyof typeof SURFACE_CONFIG) => {
    // Navigate without query param to load saved state
    router.push(`/surface/${type}/${conversationId}`);
  };

  return (
    <div 
      className={cn(
        "absolute top-2 left-1/2 -translate-x-1/2 z-20",
        "animate-in fade-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border/50 rounded-full px-2 py-1 shadow-sm">
        <span className="text-[10px] text-muted-foreground font-medium pl-1">
          Continue:
        </span>
        {savedTypes.map((type) => {
          const config = SURFACE_CONFIG[type];
          const Icon = config.icon;
          
          return (
            <button
              key={type}
              onClick={() => handleClick(type)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                "transition-colors hover:opacity-80",
                config.bgColor,
                config.color
              )}
            >
              <Icon className="h-3 w-3" />
              {config.label}
              <ChevronRight className="h-3 w-3 opacity-60" />
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default SavedSurfacesPill;
