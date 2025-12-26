"use client";

import { memo } from "react";

/**
 * MessagesLoadingSkeleton - Shows placeholder UI while messages are loading.
 * Displays user message and assistant message skeleton pairs.
 * 
 * Used by: chat page
 */
export const MessagesLoadingSkeleton = memo(function MessagesLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto px-3 pt-12 animate-in fade-in duration-300">
      {/* User message skeleton */}
      <div className="flex justify-end">
        <div className="bg-secondary/60 rounded-lg px-4 py-3 max-w-[75%] space-y-2">
          <div className="h-3.5 bg-muted-foreground/10 rounded-full w-48 animate-pulse" />
          <div className="h-3.5 bg-muted-foreground/10 rounded-full w-32 animate-pulse" />
        </div>
      </div>

      {/* Assistant message skeleton */}
      <div className="flex justify-start">
        <div className="space-y-3 max-w-[85%]">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2d w-32 rounded-full bg-primary/40 animate-pulse" />
            <div className="h-3 bg-muted-foreground/10 rounded-full w-32 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 bg-muted-foreground/10 rounded-full w-full max-w-md animate-pulse" />
            <div className="h-3.5 bg-muted-foreground/10 rounded-full w-[90%] max-w-sm animate-pulse" />
            <div className="h-3.5 bg-muted-foreground/10 rounded-full w-[75%] max-w-xs animate-pulse" />
          </div>
        </div>
      </div>

      {/* Second pair for longer conversations - reduced opacity */}
      <div className="flex justify-end opacity-60">
        <div className="bg-secondary/40 rounded-lg px-4 py-3 max-w-[60%] space-y-2">
          <div className="h-3.5 bg-muted-foreground/10 rounded-full w-36 animate-pulse" />
        </div>
      </div>

      <div className="flex justify-start opacity-60">
        <div className="space-y-3 max-w-[75%]">
          <div className="space-y-2">
            <div className="h-3.5 bg-muted-foreground/10 rounded-full w-full max-w-sm animate-pulse" />
            <div className="h-3.5 bg-muted-foreground/10 rounded-full w-[80%] max-w-xs animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
});
