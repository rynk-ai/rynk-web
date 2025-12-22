/**
 * Saved Surfaces Pill - Floating indicator showing saved surface progress
 * 
 * Displays when conversation has saved surfaces (learning/guide).
 * Hover to see dropdown of all surfaces of that type.
 * Click to navigate directly to saved surface (no regeneration).
 */

"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  PiBookOpenText, 
  PiListChecks, 
  PiCaretRight, 
  PiTarget, 
  PiScales, 
  PiStack, 
  PiCalendar, 
  PiCaretDown, 
  PiTrendUp, 
  PiFlask 
} from "react-icons/pi";
import { cn } from "@/lib/utils";

interface SavedSurfacesPillProps {
  conversationId: string;
  surfaceStates?: Record<string, any>;
  className?: string;
}

interface SurfaceItem {
  id: string;
  title?: string;
  savedAt?: number;
  metadata?: {
    title?: string;
  };
}

const SURFACE_CONFIG = {
  learning: {
    icon: PiBookOpenText,
    label: "Course",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    hoverBg: "hover:bg-blue-500/20",
  },
  guide: {
    icon: PiListChecks,
    label: "Guide", 
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    hoverBg: "hover:bg-green-500/20",
  },
  quiz: {
    icon: PiTarget,
    label: "Quiz",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    hoverBg: "hover:bg-pink-500/20",
  },
  comparison: {
    icon: PiScales,
    label: "Compare",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    hoverBg: "hover:bg-indigo-500/20",
  },
  flashcard: {
    icon: PiStack,
    label: "Flashcards",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    hoverBg: "hover:bg-teal-500/20",
  },
  timeline: {
    icon: PiCalendar,
    label: "Timeline",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    hoverBg: "hover:bg-amber-500/20",
  },
  wiki: {
    icon: PiBookOpenText,
    label: "Wiki",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    hoverBg: "hover:bg-orange-500/20",
  },
  finance: {
    icon: PiTrendUp,
    label: "Finance",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    hoverBg: "hover:bg-emerald-500/20",
  },
  research: {
    icon: PiFlask,
    label: "Research",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    hoverBg: "hover:bg-purple-500/20",
  },
} as const;

type SurfaceTypeKey = keyof typeof SURFACE_CONFIG;

// Extract surfaces from data (handles both array and legacy formats)
function getSurfacesForType(data: any): SurfaceItem[] {
  if (Array.isArray(data)) {
    return data;
  } else if (data && typeof data === 'object') {
    // Legacy single-object format
    return [{
      id: data.id || 'legacy',
      title: data.metadata?.title,
      savedAt: data.savedAt,
      metadata: data.metadata,
    }];
  }
  return [];
}

// Get display title for a surface
function getSurfaceTitle(surface: SurfaceItem, index: number, typeName: string): string {
  if (surface.metadata?.title) {
    // Truncate long titles
    const title = surface.metadata.title;
    return title.length > 30 ? title.slice(0, 30) + '...' : title;
  }
  return `${typeName} ${index + 1}`;
}

export const SavedSurfacesPill = memo(function SavedSurfacesPill({
  conversationId,
  surfaceStates,
  className,
}: SavedSurfacesPillProps) {
  const router = useRouter();
  const [hoveredType, setHoveredType] = useState<SurfaceTypeKey | null>(null);

  // Get available saved surface types
  const savedTypes = Object.keys(surfaceStates || {}).filter((type) => {
    const data = surfaceStates?.[type];
    return data && SURFACE_CONFIG[type as SurfaceTypeKey] && 
      (Array.isArray(data) ? data.length > 0 : true);
  }) as Array<SurfaceTypeKey>;

  if (savedTypes.length === 0) return null;

  const handleClick = (type: SurfaceTypeKey, surfaceId?: string) => {
    // Navigate with surfaceId if specified
    const url = surfaceId 
      ? `/surface/${type}/${conversationId}?sid=${surfaceId}`
      : `/surface/${type}/${conversationId}`;
    router.push(url);
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
          const surfaces = getSurfacesForType(surfaceStates?.[type]);
          const hasMultiple = surfaces.length > 1;
          
          return (
            <div 
              key={type}
              className="relative"
              onMouseEnter={() => setHoveredType(type)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <button
                onClick={() => !hasMultiple && handleClick(type)}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  "transition-colors",
                  config.bgColor,
                  config.color,
                  config.hoverBg
                )}
              >
                <Icon className="h-3 w-3" />
                {config.label}
                {hasMultiple ? (
                  <>
                    <span className="text-[10px] opacity-70 ml-0.5">
                      ({surfaces.length})
                    </span>
                    <PiCaretDown className="h-3 w-3 opacity-60" />
                  </>
                ) : (
                  <PiCaretRight className="h-3 w-3 opacity-60" />
                )}
              </button>
              
              {/* Dropdown for multiple surfaces */}
              {hasMultiple && hoveredType === type && (
                <div 
                  className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 mt-1",
                    "bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg",
                    "py-1 min-w-[180px] max-w-[250px]",
                    "animate-in fade-in slide-in-from-top-1 duration-150"
                  )}
                >
                  {surfaces.map((surface, index) => (
                    <button
                      key={surface.id}
                      onClick={() => handleClick(type, surface.id)}
                      className={cn(
                        "w-full px-3 py-1.5 text-left text-xs",
                        "flex items-center gap-2",
                        "hover:bg-muted/50 transition-colors",
                        config.color
                      )}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {getSurfaceTitle(surface, index, config.label)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default SavedSurfacesPill;
