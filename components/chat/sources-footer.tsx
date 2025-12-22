'use client'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Citation } from "@/lib/types/citation"
import { PiArrowSquareOut, PiCaretDown, PiCaretUp } from "react-icons/pi"
import { useState } from "react"

interface SourcesFooterProps {
  citations: Citation[]
  className?: string
  variant?: 'compact' | 'detailed'
  maxVisible?: number
}

/**
 * Sources footer showing all citations as cards after the response
 */
export function SourcesFooter({ 
  citations, 
  className,
  variant = 'compact',
  maxVisible = 6
}: SourcesFooterProps) {
  const [expanded, setExpanded] = useState(false)
  
  if (!citations || citations.length === 0) return null
  
  const visibleCitations = expanded ? citations : citations.slice(0, maxVisible)
  const hasMore = citations.length > maxVisible

  return (
    <div className={cn("mt-5 pt-4 border-t border-border/40", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          Sources
          <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
            {citations.length}
          </span>
        </span>
        {hasMore && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-6 px-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <PiCaretUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <PiCaretDown className="h-3 w-3 mr-1" />
                Show all ({citations.length})
              </>
            )}
          </Button>
        )}
      </div>
      
      <div className={cn(
        "grid gap-2",
        variant === 'detailed' 
          ? "grid-cols-1" 
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {visibleCitations.map((citation) => (
          <SourceCard 
            key={citation.id} 
            citation={citation} 
            variant={variant}
          />
        ))}
      </div>
    </div>
  )
}

interface SourceCardProps {
  citation: Citation
  variant?: 'compact' | 'detailed'
}

function SourceCard({ citation, variant = 'compact' }: SourceCardProps) {
  const formattedDate = citation.publishedDate 
    ? new Date(citation.publishedDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      })
    : null

  if (variant === 'detailed') {
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 p-3.5 rounded-xl border border-border/30 bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-hover))] hover:border-border/50 transition-all duration-150"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
          {citation.id}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
            {citation.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {citation.snippet}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {citation.favicon && (
              <img 
                src={citation.favicon} 
                className="h-3 w-3 rounded-sm" 
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            <span className="truncate">
              {new URL(citation.url).hostname.replace('www.', '')}
            </span>
            {formattedDate && (
              <>
                <span className="text-border">•</span>
                <span>{formattedDate}</span>
              </>
            )}
            <PiArrowSquareOut className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </a>
    )
  }

  // Compact variant
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <a
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-border/30 bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-hover))] hover:border-border/50 transition-all duration-150"
        >
          <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
            {citation.id}
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {citation.favicon && (
              <img 
                src={citation.favicon} 
                className="h-4 w-4 rounded-md flex-shrink-0" 
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            <span className="text-xs truncate text-foreground/80 group-hover:text-foreground">
              {citation.title.length > 40 
                ? citation.title.slice(0, 40) + '...' 
                : citation.title}
            </span>
          </div>
          <PiArrowSquareOut className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-72 p-3">
        <h4 className="font-semibold text-sm line-clamp-2">{citation.title}</h4>
        {citation.snippet && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
            {citation.snippet}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span className="truncate">
            {new URL(citation.url).hostname.replace('www.', '')}
          </span>
          {formattedDate && (
            <>
              <span>•</span>
              <span>{formattedDate}</span>
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

/**
 * Inline source pills for compact display
 */
export function SourcePills({ 
  citations, 
  maxVisible = 4,
  className 
}: { 
  citations: Citation[]
  maxVisible?: number
  className?: string 
}) {
  if (!citations || citations.length === 0) return null
  
  const visible = citations.slice(0, maxVisible)
  const remaining = citations.length - maxVisible

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {visible.map((citation) => (
        <a
          key={citation.id}
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-hover))] border border-border/30 text-xs transition-all duration-150"
        >
          {citation.favicon && (
            <img 
              src={citation.favicon} 
              className="h-3.5 w-3.5 rounded-md" 
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          <span className="truncate max-w-[100px]">
            {new URL(citation.url).hostname.replace('www.', '')}
          </span>
        </a>
      ))}
      {remaining > 0 && (
        <span className="text-xs text-muted-foreground">
          +{remaining} more
        </span>
      )}
    </div>
  )
}
