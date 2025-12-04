"use client"

import { ThinkingBar } from "@/components/prompt-kit/thinking-bar"
import { Brain } from "lucide-react"

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

export function ReasoningDisplay({ statuses, searchResults, isComplete = false, defaultCollapsed = false }: ReasoningDisplayProps) {
  // Get current active status (last one in the array)
  const currentStatus = statuses && statuses.length > 0 ? statuses[statuses.length - 1] : null
  const isThinking = !isComplete && currentStatus?.status !== 'complete'
  
  // Debug logging
  console.log('[ReasoningDisplay] Props:', {
    statusesCount: statuses?.length || 0,
    currentStatus: currentStatus?.message,
    hasSearchResults: !!searchResults,
    sourcesCount: searchResults?.sources?.length || 0,
    isComplete,
    isThinking
  })
  
  // Only show if we're actively thinking (not after completion)
  if (!isThinking) return null

  return (
    <div className="w-full max-w-3xl mx-auto mb-4">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
        <Brain className="h-4 w-4 text-muted-foreground animate-pulse" />
        <ThinkingBar 
          text={currentStatus?.message || "Thinking..."}
          className="text-sm"
        />
      </div>
    </div>
  )
}
