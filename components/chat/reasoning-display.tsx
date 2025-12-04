"use client"

import { useMemo, useState, useEffect } from "react"
import { LiveSourcePills, type DiscoveredSource } from "@/components/chat/live-source-pills"
import { getFaviconUrl, getDomainName } from "@/lib/types/citation"
import {
  Steps,
  StepsContent,
  StepsItem,
  StepsTrigger,
} from "@/components/prompt-kit/steps"
import { Loader2, CheckCircle2, Brain } from "lucide-react"

interface StatusPill {
  status: 'analyzing' | 'searching' | 'synthesizing' | 'complete'
  message: string
  timestamp: number
}

interface SearchSource {
  type: 'exa' | 'perplexity' | 'wikipedia'
  url: string
  title: string
  snippet: string
  score?: number
  publishedDate?: string
  author?: string
  highlights?: string[]
  thumbnail?: string
}

interface SearchResults {
  query: string
  sources: SearchSource[]
  strategy: string[]
  totalResults: number
}

interface ReasoningDisplayProps {
  statuses: StatusPill[]
  searchResults?: SearchResults | null
  isComplete?: boolean
  defaultCollapsed?: boolean
}

export function ReasoningDisplay({ 
  statuses, 
  searchResults, 
  isComplete = false, 
  defaultCollapsed = false 
}: ReasoningDisplayProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed)

  // Auto-collapse when complete, auto-open when thinking
  useEffect(() => {
    if (isComplete) {
      setIsOpen(false)
    } else if (statuses && statuses.length > 0) {
      setIsOpen(true)
    }
  }, [isComplete, statuses?.length])

  // Extract discovered sources for live pills
  const discoveredSources = useMemo(() => {
    if (!searchResults?.sources) return []
    
    return searchResults.sources.map(source => ({
      url: source.url,
      title: source.title,
      domain: getDomainName(source.url),
      favicon: getFaviconUrl(source.url),
      snippet: source.snippet,
      isNew: true
    } satisfies DiscoveredSource))
  }, [searchResults])

  // Don't render if no status
  if (!statuses || statuses.length === 0) return null
  
  const currentStatus = statuses[statuses.length - 1]
  const isThinking = !isComplete && currentStatus.status !== 'complete'

  return (
    <div className="w-full max-w-3xl mx-auto mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Steps open={isOpen} onOpenChange={setIsOpen}>
        <StepsTrigger className="w-full">
          <div className="flex items-center gap-2 text-sm">
            {isThinking ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Brain className="h-4 w-4 text-primary" />
            )}
            <span className="font-medium text-foreground">
              {isThinking ? currentStatus.message : "Reasoning complete"}
            </span>
          </div>
        </StepsTrigger>
        <StepsContent>
          <div className="space-y-2 py-2">
            {statuses.map((status, index) => (
              <StepsItem key={`${status.status}-${index}`} className="flex items-start gap-2">
                {index === statuses.length - 1 && isThinking ? (
                  <Loader2 className="h-3 w-3 mt-0.5 animate-spin text-primary shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                )}
                <span>{status.message}</span>
              </StepsItem>
            ))}
            
            {/* Show search results inside the steps if available */}
            {discoveredSources.length > 0 && (
              <div className="pt-2 pl-5">
                <div className="text-xs text-muted-foreground mb-1.5">Found {discoveredSources.length} sources:</div>
                <LiveSourcePills 
                  sources={discoveredSources} 
                  isSearching={statuses.some(s => s.status === 'searching') && !isComplete}
                />
              </div>
            )}
          </div>
        </StepsContent>
      </Steps>
    </div>
  )
}
