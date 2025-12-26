"use client";

import { memo } from "react";
import { Loader } from "@/components/ui/loader";

export interface IndexingJob {
  id: string;
  status: "pending" | "parsing" | "processing" | "completed" | "failed";
  fileName?: string;
  progress?: number;
  error?: string;
}

export interface IndexingProgressBadgeProps {
  /** Array of indexing jobs to display progress for */
  jobs: IndexingJob[];
}

/**
 * IndexingProgressBadge - Shows PDF indexing progress at the top of the chat.
 * Only visible when there are jobs actively processing or parsing.
 * 
 * Used by: chat page, project page
 */
export const IndexingProgressBadge = memo(function IndexingProgressBadge({
  jobs,
}: IndexingProgressBadgeProps) {
  const activeJobs = jobs.filter(
    (j) => j.status === "processing" || j.status === "parsing"
  );

  if (activeJobs.length === 0) return null;

  const processingJob = jobs.find((j) => j.status === "processing");
  const displayText = processingJob?.fileName
    ? `Indexing ${processingJob.fileName}... ${processingJob.progress || 0}%`
    : "Preparing PDF...";

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border/50 rounded-full px-3 py-1.5 shadow-sm text-xs font-medium text-foreground">
        <Loader variant="text-shimmer" size="sm" text={displayText} />
      </div>
    </div>
  );
});
