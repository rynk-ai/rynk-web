/**
 * Surface Trigger - Smart buttons to open surfaces from chat messages
 * 
 * Uses surface-detector to recommend only relevant surfaces based on content type.
 * Shows "Continue" for existing saved surfaces (no regeneration).
 */

"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  BookOpen, 
  ListChecks, 
  ArrowRight, 
  FlaskConical,
  FileText,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { detectSurfaceRecommendations, shouldShowSurfaceTrigger } from "@/lib/utils/surface-detector";
import type { SurfaceType } from "@/lib/services/domain-types";

interface SurfaceTriggerProps {
  conversationId: string;
  messageContent: string;
  /** Existing saved surface types for this conversation */
  savedSurfaces?: Record<string, any>;
  className?: string;
}

const SURFACE_CONFIG: Record<SurfaceType, {
  icon: typeof BookOpen;
  label: string;
  continueLabel: string;
  color: string;
  bgColor: string;
}> = {
  learning: {
    icon: BookOpen,
    label: "Course",
    continueLabel: "Continue Course",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
  },
  guide: {
    icon: ListChecks,
    label: "Guide",
    continueLabel: "Continue Guide",
    color: "text-green-600",
    bgColor: "bg-green-500/10",
  },
  research: {
    icon: FlaskConical,
    label: "Research",
    continueLabel: "Continue Research",
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
  },
  wiki: {
    icon: FileText,
    label: "Wiki",
    continueLabel: "Open Wiki",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  quiz: {
    icon: Sparkles,
    label: "Quiz Me",
    continueLabel: "Resume Quiz",
    color: "text-pink-600",
    bgColor: "bg-pink-500/10",
  },
  comparison: {
    icon: FileText,
    label: "Compare",
    continueLabel: "View Comparison",
    color: "text-indigo-600",
    bgColor: "bg-indigo-500/10",
  },
  flashcard: {
    icon: BookOpen,
    label: "Flashcards",
    continueLabel: "Continue Cards",
    color: "text-teal-600",
    bgColor: "bg-teal-500/10",
  },
  timeline: {
    icon: FileText,
    label: "Timeline",
    continueLabel: "View Timeline",
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10",
  },
  events: {
    icon: FileText,
    label: "Events",
    continueLabel: "View Events",
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
  },
  professional: {
    icon: FileText,
    label: "Analysis",
    continueLabel: "View Analysis",
    color: "text-cyan-600",
    bgColor: "bg-cyan-500/10",
  },
  creative: {
    icon: Sparkles,
    label: "Creative",
    continueLabel: "Open Canvas",
    color: "text-rose-600",
    bgColor: "bg-rose-500/10",
  },
  chat: {
    icon: FileText,
    label: "Chat",
    continueLabel: "Chat",
    color: "text-gray-600",
    bgColor: "bg-gray-500/10",
  },
};

export const SurfaceTrigger = memo(function SurfaceTrigger({
  conversationId,
  messageContent,
  savedSurfaces,
  className,
}: SurfaceTriggerProps) {
  const router = useRouter();

  // Detect recommended surfaces based on content
  const recommendations = useMemo(() => {
    // Check for saved surfaces first (always show those)
    const saved = Object.keys(savedSurfaces || {})
      .filter(type => savedSurfaces?.[type] && SURFACE_CONFIG[type as SurfaceType])
      .map(type => ({
        type: type as SurfaceType,
        confidence: 1, // Saved surfaces have highest priority
        label: SURFACE_CONFIG[type as SurfaceType].continueLabel,
        contextMessage: 'Continue your progress',
        isSaved: true,
      }));

    // Detect new recommendations only if content is substantial
    if (!shouldShowSurfaceTrigger(messageContent)) {
      return saved;
    }

    const detected = detectSurfaceRecommendations(messageContent)
      .filter(r => !savedSurfaces?.[r.type]) // Don't duplicate saved surfaces
      .slice(0, 2) // Limit to top 2 recommendations
      .map(r => ({ ...r, isSaved: false }));

    return [...saved, ...detected];
  }, [messageContent, savedSurfaces]);

  // Don't show if no recommendations
  if (recommendations.length === 0) {
    return null;
  }

  const handleOpen = (type: SurfaceType, isSaved: boolean) => {
    if (isSaved) {
      // Surface exists - load saved state (no query param)
      router.push(`/surface/${type}/${conversationId}`);
    } else {
      // Generate new surface
      const query = encodeURIComponent(messageContent.slice(0, 500));
      router.push(`/surface/${type}/${conversationId}?q=${query}`);
    }
  };

  // Get the best context message for the trigger area
  const contextMessage = recommendations.find(r => !r.isSaved)?.contextMessage;

  return (
    <div className={cn(
      "flex flex-col gap-1.5 pt-3 mt-3 border-t border-border/40",
      className
    )}>
      {contextMessage && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          {contextMessage}
        </span>
      )}
      <div className="flex items-center flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground mr-0.5">
          Open as:
        </span>
        {recommendations.map((rec) => {
          const config = SURFACE_CONFIG[rec.type];
          const Icon = config.icon;
          
          return (
            <Button
              key={rec.type}
              variant="ghost"
              size="sm"
              onClick={() => handleOpen(rec.type, rec.isSaved)}
              className={cn(
                "h-7 gap-1.5 text-xs hover:opacity-80 transition-colors",
                rec.isSaved ? [config.bgColor, config.color] : "hover:bg-primary/10 hover:text-primary"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {rec.isSaved ? config.continueLabel : config.label}
              {rec.isSaved && <ArrowRight className="h-3 w-3 ml-0.5 opacity-60" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
});

export default SurfaceTrigger;
