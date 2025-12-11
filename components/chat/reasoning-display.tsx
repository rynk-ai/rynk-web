"use client";

import { useMemo } from "react";
import {
  LiveSourcePills,
  type DiscoveredSource,
} from "@/components/chat/live-source-pills";
import { getFaviconUrl, getDomainName } from "@/lib/types/citation";
import { DotsLoader } from "@/components/prompt-kit/loader";
import { Globe, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Loader } from "../ui/loader";

interface StatusPill {
  status: "analyzing" | "searching" | "synthesizing" | "complete";
  message: string;
  timestamp: number;
}

interface SearchSource {
  type: "exa" | "perplexity" | "wikipedia";
  url: string;
  title: string;
  snippet: string;
  score?: number;
  publishedDate?: string;
  author?: string;
  highlights?: string[];
  thumbnail?: string;
}

interface SearchResults {
  query: string;
  sources: SearchSource[];
  strategy: string[];
  totalResults: number;
}

interface ReasoningDisplayProps {
  statuses: StatusPill[];
  searchResults?: SearchResults | null;
  isComplete?: boolean;
  defaultCollapsed?: boolean;
}

// User-friendly status message translations
const STATUS_MESSAGES: Record<string, string> = {
  "analyzing": "Thinking",
  "searching": "Searching",
  "synthesizing": "Writing",
  "complete": "Done",
};

// Get the best user-facing status message
function getCurrentPhase(statuses: StatusPill[]): { message: string; status: string } {
  if (!statuses || statuses.length === 0) {
    return { message: "Thinking", status: "analyzing" };
  }
  
  const current = statuses[statuses.length - 1];
  const lowerMessage = current.message.toLowerCase();
  
  // Map internal messages to simple phases
  if (lowerMessage.includes("exa") || lowerMessage.includes("perplexity") || lowerMessage.includes("searching")) {
    return { message: "Searching", status: "searching" };
  }
  if (lowerMessage.includes("synthesizing") || lowerMessage.includes("crafting")) {
    return { message: "Writing", status: "synthesizing" };
  }
  if (current.status === "complete") {
    return { message: "Done", status: "complete" };
  }
  
  return { message: STATUS_MESSAGES[current.status] || "Thinking", status: current.status };
}

export function ReasoningDisplay({
  statuses,
  searchResults,
  isComplete = false,
}: ReasoningDisplayProps) {
  // Extract discovered sources for live pills
  const discoveredSources = useMemo(() => {
    if (!searchResults?.sources) return [];

    return searchResults.sources.map(
      (source) =>
        ({
          url: source.url,
          title: source.title,
          domain: getDomainName(source.url),
          favicon: getFaviconUrl(source.url),
          snippet: source.snippet,
          isNew: true,
        }) satisfies DiscoveredSource,
    );
  }, [searchResults]);

  // Don't render if no status or if complete with no sources
  if (!statuses || statuses.length === 0) return null;
  
  const { message, status } = getCurrentPhase(statuses);
  const isThinking = !isComplete && status !== "complete";
  const sourceCount = discoveredSources.length;
  
  // If complete and no sources, don't show anything
  if (isComplete && sourceCount === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mb-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        {isThinking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader variant="loading-dots" size="sm" className="text-primary" />
            <span className="font-medium">{message}</span>
            
            {/* Show source count while searching */}
            {sourceCount > 0 && (
              <span className="flex items-center gap-1 text-xs bg-secondary/50 px-2 py-0.5 rounded-md">
                <Globe className="h-3 w-3" />
                {sourceCount}
              </span>
            )}
          </div>
        ) : (
          // Complete state - just show sources if any
          sourceCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{sourceCount} sources found</span>
            </div>
          )
        )}
      </div>
      
      {/* Live source pills */}
      {sourceCount > 0 && (
        <div className={cn(
          "mt-2 transition-all duration-200",
          isThinking ? "opacity-80" : "opacity-100"
        )}>
          <LiveSourcePills
            sources={discoveredSources}
            isSearching={isThinking && status === "searching"}
          />
        </div>
      )}
    </div>
  );
}
