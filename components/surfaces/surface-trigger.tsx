/**
 * Surface Trigger - Smart Recommended Actions
 * 
 * Component: Displays context-aware buttons to open relevant surfaces
 * Usage: Rendered within ChatMessageItem
 * 
 * Uses LLM-based detection via /api/surface-detect for accurate recommendations.
 * The API call is made after the response is received (non-blocking).
 */

"use client";

import { useRouter } from "next/navigation";
import { 
  PiArrowRight, 
  PiBookOpenText, 
  PiListChecks, 
  PiTarget, 
  PiScales, 
  PiStack, 
  PiCalendar,
  PiTrendUp,
  PiMagnifyingGlass
} from "react-icons/pi";
import { cn } from "@/lib/utils";
import type { SurfaceType } from "@/lib/services/domain-types";

interface SurfaceTriggerProps {
  surfaces: string[]; // Receives detected surfaces directly
  conversationId?: string;
  userQuery?: string;
}

// Surface definitions with styling and metadata
const SURFACE_CONFIG: Record<string, {
  label: string;
  description: string;
  icon: any; 
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  learning: {
    label: "Course",
    description: "Start a structured learning path",
    icon: PiBookOpenText,
    color: "text-blue-500",
    bgColor: "bg-blue-500/5 hover:bg-blue-500/10",
    borderColor: "border-blue-500/20 hover:border-blue-500/30",
  },
  guide: {
    label: "Guide",
    description: "View step-by-step instructions",
    icon: PiListChecks,
    color: "text-green-500",
    bgColor: "bg-green-500/5 hover:bg-green-500/10",
    borderColor: "border-green-500/20 hover:border-green-500/30",
  },
  quiz: {
    label: "Quiz",
    description: "Test your knowledge",
    icon: PiTarget,
    color: "text-pink-500",
    bgColor: "bg-pink-500/5 hover:bg-pink-500/10",
    borderColor: "border-pink-500/20 hover:border-pink-500/30",
  },
  comparison: {
    label: "Compare",
    description: "See side-by-side analysis",
    icon: PiScales,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/5 hover:bg-indigo-500/10",
    borderColor: "border-indigo-500/20 hover:border-indigo-500/30",
  },
  flashcard: {
    label: "Flashcards",
    description: "Review key concepts",
    icon: PiStack,
    color: "text-teal-500",
    bgColor: "bg-teal-500/5 hover:bg-teal-500/10",
    borderColor: "border-teal-500/20 hover:border-teal-500/30",
  },
  timeline: {
    label: "Timeline",
    description: "View chronological events",
    icon: PiCalendar,
    color: "text-amber-500",
    bgColor: "bg-amber-500/5 hover:bg-amber-500/10",
    borderColor: "border-amber-500/20 hover:border-amber-500/30",
  },
  wiki: {
    label: "Wiki",
    description: "Read encyclopedic overview",
    icon: PiBookOpenText,
    color: "text-orange-500",
    bgColor: "bg-orange-500/5 hover:bg-orange-500/10",
    borderColor: "border-orange-500/20 hover:border-orange-500/30",
  },
  finance: {
    label: "Finance",
    description: "View charts and market data",
    icon: PiTrendUp,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/5 hover:bg-emerald-500/10",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/30",
  },
  research: {
    label: "Research",
    description: "Deep-dive analysis with sources",
    icon: PiMagnifyingGlass,
    color: "text-violet-500",
    bgColor: "bg-violet-500/5 hover:bg-violet-500/10",
    borderColor: "border-violet-500/20 hover:border-violet-500/30",
  },
};

export const SurfaceTrigger = function SurfaceTrigger({
  surfaces,
  conversationId,
  userQuery,
}: SurfaceTriggerProps) {
  const router = useRouter();

  const handleOpenSurface = (type: string) => {
    if (!conversationId) return;
    
    // Pass the user query or use a fallback
    const query = userQuery || "";
    router.push(`/surface/${type}/${conversationId}?q=${encodeURIComponent(query)}`);
  };

  if (!surfaces || surfaces.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
      {surfaces.map((type) => {
        const config = SURFACE_CONFIG[type];
        if (!config) return null;
        
        const Icon = config.icon;
        
        return (
          <button
            key={type}
            onClick={() => handleOpenSurface(type)}
            className={cn(
              "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left border",
              config.bgColor,
              config.borderColor,
              "hover:shadow-sm"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm border border-border/50 transition-transform group-hover:scale-110",
              config.color
            )}>
              <Icon className="h-5 w-5" />
            </div>
            
            <div className="flex flex-col">
              <span className={cn("text-sm font-semibold", config.color)}>
                Open {config.label}
              </span>
              <span className="text-xs text-muted-foreground/80">
                {config.description}
              </span>
            </div>
            
            <PiArrowRight className={cn(
              "h-4 w-4 ml-2 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0",
              config.color
            )} />
          </button>
        );
      })}
    </div>
  );
};

export default SurfaceTrigger;
