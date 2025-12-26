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

  // Don't render anything if no statuses yet - AssistantSkeleton handles initial "Thinking" state
  if (!statuses || statuses.length === 0) return null;
  
  const sourceCount = discoveredSources.length;
  
  // If complete and no sources, don't show anything
  if (isComplete && sourceCount === 0) return null;

  // Always use ProcessingTimeline for status display (ChainOfThought UI)
  return (
    <div className="w-full max-w-3xl mx-auto mb-3 animate-in fade-in duration-200">
      <ProcessingTimeline
        statusPills={statuses}
        indexingJobs={indexingJobs}
        isStreaming={isStreaming}
        hasContent={hasContent}
        searchResults={searchResults}
      />
    </div>
  );
}
