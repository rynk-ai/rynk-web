// Type definitions for the agentic system

export interface QuickAnalysis {
  category: 'current_events' | 'factual' | 'technical' | 'conversational' | 'complex'
  needsWebSearch: boolean
  confidence: number
}

export interface SourcePlan {
  sources: Array<'exa' | 'perplexity' | 'wikipedia' | 'grok'>
  reasoning: string
  searchQueries: {
    exa?: string
    perplexity?: string
    wikipedia?: string[]
  }
  expectedType: 'quick_fact' | 'deep_research' | 'current_event' | 'comparison'
}

export interface SourceResult {
  source: 'exa' | 'perplexity' | 'wikipedia' | 'grok'
  data: any
  citations?: Array<{
    url: string
    title: string
    snippet?: string
  }>
  error?: string
}

export type StatusType = 'analyzing' | 'searching' | 'synthesizing' | 'complete'

export interface StatusUpdate {
  type: 'status'
  status: StatusType
  message: string
  timestamp: number
}

export interface ContentChunk {
  type: 'content'
  content: string
}

export type StreamEvent = StatusUpdate | ContentChunk
