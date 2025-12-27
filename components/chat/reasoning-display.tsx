"use client";

import { useMemo } from "react";
import { LiveSourcePills, type DiscoveredSource } from "@/components/chat/live-source-pills";
import { ProcessingTimeline } from "@/components/chat/processing-timeline";
import { getFaviconUrl, getDomainName } from "@/lib/types/citation";
import { cn } from "@/lib/utils";
import type { StatusPill } from "@/lib/utils/stream-parser";
import type { IndexingJob } from "@/lib/hooks/use-indexing-queue";

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
  indexingJobs?: IndexingJob[];
  isStreaming?: boolean;
  hasContent?: boolean;
}

export function ReasoningDisplay({
  statuses,
  searchResults,
  isComplete = false,
  indexingJobs = [],
  isStreaming = false,
  hasContent = false,
}: ReasoningDisplayProps) {
  // Extract discovered sources for live pills display
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

  const sourceCount = discoveredSources.length;
  
  // Create optimistic "thinking" status when streaming but no statuses yet
  // This provides immediate feedback before the first server status arrives
  const effectiveStatuses = useMemo(() => {
    if (isStreaming && (!statuses || statuses.length === 0)) {
      return [{
        status: "analyzing" as const,
        message: "Thinking...",
        timestamp: Date.now(),
      }];
    }
    return statuses || [];
  }, [statuses, isStreaming]);
  
  // Determine if we should show the timeline
  // Show if: streaming (even with optimistic status), or has real statuses (unless complete with no sources)
  const shouldShow = 
    (isStreaming && effectiveStatuses.length > 0) ||
    (effectiveStatuses.length > 0 && !(isComplete && sourceCount === 0));

  // Always render the wrapper to prevent unmount/remount flicker
  // Use CSS to hide when not needed instead of returning null
  return (
    <div 
      className={cn(
        "w-full max-w-3xl mx-auto transition-all duration-200",
        shouldShow 
          ? "mb-3 opacity-100" 
          : "mb-0 opacity-0 h-0 overflow-hidden pointer-events-none"
      )}
    >
      {shouldShow && (
        <ProcessingTimeline
          statusPills={effectiveStatuses}
          indexingJobs={indexingJobs}
          isStreaming={isStreaming}
          hasContent={hasContent}
          searchResults={searchResults}
        />
      )}
    </div>
  );
}

