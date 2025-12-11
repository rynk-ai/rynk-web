/**
 * Surface Trigger - Smart Recommended Actions
 * 
 * Component: Displays context-aware buttons to open relevant surfaces
 * Usage: Rendered within ChatMessageItem
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  ListChecks, 
  Target, 
  Scale, 
  Layers, 
  Calendar,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SurfaceType } from "@/lib/services/domain-types";

interface SurfaceTriggerProps {
  messageId: string;
  content: string;
  role: string;
  conversationId?: string;
}

// Surface definitions with styling and metadata
const SURFACE_CONFIG: Record<string, {
  label: string;
  description: string;
  icon: any; // LucideIcon
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  learning: {
    label: "Course",
    description: "Start a structured learning path",
    icon: BookOpen,
    color: "text-blue-500",
    bgColor: "bg-blue-500/5 hover:bg-blue-500/10",
    borderColor: "border-blue-500/20 hover:border-blue-500/30",
  },
  guide: {
    label: "Guide",
    description: "View step-by-step instructions",
    icon: ListChecks,
    color: "text-green-500",
    bgColor: "bg-green-500/5 hover:bg-green-500/10",
    borderColor: "border-green-500/20 hover:border-green-500/30",
  },
  quiz: {
    label: "Quiz",
    description: "Test your knowledge",
    icon: Target,
    color: "text-pink-500",
    bgColor: "bg-pink-500/5 hover:bg-pink-500/10",
    borderColor: "border-pink-500/20 hover:border-pink-500/30",
  },
  comparison: {
    label: "Compare",
    description: "See side-by-side analysis",
    icon: Scale,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/5 hover:bg-indigo-500/10",
    borderColor: "border-indigo-500/20 hover:border-indigo-500/30",
  },
  flashcard: {
    label: "Flashcards",
    description: "Review key concepts",
    icon: Layers,
    color: "text-teal-500",
    bgColor: "bg-teal-500/5 hover:bg-teal-500/10",
    borderColor: "border-teal-500/20 hover:border-teal-500/30",
  },
  timeline: {
    label: "Timeline",
    description: "View chronological events",
    icon: Calendar,
    color: "text-amber-500",
    bgColor: "bg-amber-500/5 hover:bg-amber-500/10",
    borderColor: "border-amber-500/20 hover:border-amber-500/30",
  },
  wiki: {
    label: "Wiki",
    description: "Read encyclopedic overview",
    icon: BookOpen,
    color: "text-orange-500",
    bgColor: "bg-orange-500/5 hover:bg-orange-500/10",
    borderColor: "border-orange-500/20 hover:border-orange-500/30",
  },
};

export const SurfaceTrigger = function SurfaceTrigger({
  messageId,
  content,
  role,
  conversationId,
}: SurfaceTriggerProps) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<SurfaceType[]>([]);
  const [existingSurfaces, setExistingSurfaces] = useState<SurfaceType[]>([]);
  const [isDetecting, setIsDetecting] = useState(true);

  // Parse content to find existing triggers or detect new ones
  useEffect(() => {
    // Only show for assistant messages
    if (role !== "assistant" || !content) {
      setIsDetecting(false);
      return;
    }

    // 1. Check for existing saved surfaces for this message
    // In a real app, this might come from the message metadata or a quick API check
    // For now, we'll simulate it based on keywords or if the user has visited them
    
    // 2. Detect relevant surfaces based on content keywords
    const detected = detectSurfaceRecommendations(content);
    setRecommendations(detected);
    setIsDetecting(false);
  }, [content, role]);

  const handleOpenSurface = (type: SurfaceType) => {
    if (!conversationId) return; // Should have conversationId
    
    // Pass the message content snippet as a query context
    const query = content.slice(0, 100).replace(/\n/g, " ");
    router.push(`/surface/${type}/${conversationId}?q=${encodeURIComponent(query)}`);
  };

  if (isDetecting || recommendations.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
      {recommendations.map((type) => {
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
            
            <ArrowRight className={cn(
              "h-4 w-4 ml-2 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0",
              config.color
            )} />
          </button>
        );
      })}
    </div>
  );
};

// Simple heuristic to detect relevant surfaces
function detectSurfaceRecommendations(content: string): SurfaceType[] {
  const text = content.toLowerCase();
  const types: SurfaceType[] = [];
  
  // Flashcards: "key terms", "vocabulary", "definitions"
  if (text.includes("term") || text.includes("vocabulary") || text.includes("definition") || text.includes("remember")) {
    types.push("flashcard");
  }
  
  // Quiz: "question", "quiz", "test", "knowledge"
  if (text.includes("quiz") || text.includes("test") || text.includes("question") || text.includes("check knowledge")) {
    types.push("quiz");
  }
  
  // Comparison: "difference between", "vs", "compare", "pros and cons"
  if (text.includes("difference") || text.includes(" vs ") || text.includes("compare") || text.includes("pros and cons")) {
    types.push("comparison");
  }
  
  // Timeline: "history", "timeline", "dates", "chronology", "years"
  if (text.includes("history") || text.includes("timeline") || text.includes("chronolog") || (text.match(/\d{4}/g) || []).length > 2) {
    types.push("timeline");
  }
  
  // Guide: "step by step", "how to", "instructions", "guide"
  if (text.includes("step by step") || text.includes("how to") || text.includes("guide") || text.includes("instruction")) {
    types.push("guide");
  }
  
  // Wiki: "what is", "explain", "overview", "concept", encyclopedic queries
  if (text.includes("what is") || text.includes("explain") || text.includes("overview") || text.includes("concept") || text.includes("meaning of")) {
    types.push("wiki");
  }
  
  // Learning: General fallback for long informational text
  if (text.length > 500 && types.length === 0) {
    types.push("learning");
  }
  
  // Limit to max 2 recommendations to avoid clutter
  return types.slice(0, 2);
}

export default SurfaceTrigger;
