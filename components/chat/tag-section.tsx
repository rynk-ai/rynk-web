"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PiTag as Tag,
  PiBookmarkSimple as BookmarkPlus,
  PiShareNetwork as Share2,
} from "react-icons/pi";

export interface TagSectionProps {
  conversationId: string;
  tags: string[];
  onTagClick: () => void;
  onShareClick?: () => void;
}

/**
 * TagSection - Displays conversation tags with add/edit functionality.
 * Shows in the top-right corner of chat views.
 * 
 * Used by: chat page, guest-chat page, project page
 */
export const TagSection = memo(function TagSection({
  conversationId,
  tags,
  onTagClick,
  onShareClick,
}: TagSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const displayTags = showAll ? tags : tags.slice(0, 3);
  const hasMore = tags.length > 3;

  return (
    <div className="absolute top-4 right-5 z-30">
      <div className="flex items-center gap-2">
        {/* Tags Display */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[320px]">
            {displayTags.map((tag, index) => (
              <button
                key={index}
                onClick={onTagClick}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[hsl(var(--surface))] text-foreground hover:bg-[hsl(var(--surface-hover))] rounded-lg border border-border/30 transition-all duration-150 cursor-pointer"
              >
                <span className="text-primary">#</span>
                {tag}
              </button>
            ))}
            {hasMore && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                +{tags.length - 3} more
              </button>
            )}
            {showAll && hasMore && (
              <button
                onClick={() => setShowAll(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                Show less
              </button>
            )}
          </div>
        )}

        {/* Share Button - Only shown if onShareClick is provided */}
        {onShareClick && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={onShareClick}
            title="Share conversation"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Add Tag Button */}
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-7 w-7 rounded-lg transition-all duration-150",
            tags.length > 0
              ? "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))]"
              : "bg-[hsl(var(--surface))] text-primary hover:bg-[hsl(var(--surface-hover))] border border-border/30"
          )}
          onClick={onTagClick}
          title={tags.length > 0 ? "Edit tags" : "Add tags"}
        >
          {tags.length > 0 ? (
            <Tag className="h-3.5 w-3.5" />
          ) : (
            <BookmarkPlus className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
});
