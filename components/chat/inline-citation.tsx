'use client'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import type { Citation } from "@/lib/types/citation"
import { ExternalLink } from "lucide-react"

interface InlineCitationProps {
  id: number
  citation: Citation
  position?: 'inline' | 'superscript'
}

/**
 * Interactive inline citation component
 * Renders as a clickable number that shows source preview on hover
 */
export function InlineCitation({ 
  id, 
  citation, 
  position = 'superscript' 
}: InlineCitationProps) {
  const formattedDate = citation.publishedDate 
    ? new Date(citation.publishedDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : null

  return (
    <HoverCard openDelay={100} closeDelay={50}>
      <HoverCardTrigger asChild>
        <a
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center justify-center cursor-pointer transition-all duration-200",
            position === 'superscript' 
              ? "align-super text-[10px] font-semibold min-w-[16px] h-[16px] px-1 rounded-full bg-primary/15 text-primary hover:bg-primary/25 hover:scale-110 mx-0.5 no-underline"
              : "text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground no-underline"
          )}
        >
          {id}
        </a>
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center"
        className="w-80 p-3"
        sideOffset={8}
      >
        <div className="flex gap-3">
          {citation.favicon && (
            <img 
              src={citation.favicon} 
              alt=""
              className="h-5 w-5 mt-0.5 rounded-sm flex-shrink-0" 
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm line-clamp-2 leading-tight">
              {citation.title}
            </h4>
            {citation.snippet && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">
                {citation.snippet}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="truncate max-w-[150px]">
                {new URL(citation.url).hostname.replace('www.', '')}
              </span>
              {formattedDate && (
                <>
                  <span className="text-border">•</span>
                  <span>{formattedDate}</span>
                </>
              )}
              {citation.author && (
                <>
                  <span className="text-border">•</span>
                  <span className="truncate max-w-[80px]">{citation.author}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
              <ExternalLink className="h-3 w-3" />
              <span>Open source</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

/**
 * Simple citation badge without hover (for use in tight spaces)
 */
export function CitationBadge({ 
  id, 
  url,
  className 
}: { 
  id: number
  url: string
  className?: string 
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center",
        "align-super text-[10px] font-semibold min-w-[14px] h-[14px] px-0.5",
        "rounded-full bg-primary/10 text-primary hover:bg-primary/20",
        "no-underline transition-colors",
        className
      )}
    >
      {id}
    </a>
  )
}
