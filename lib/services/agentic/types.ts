// Type definitions for the agentic system

export interface QuickAnalysis {
  category: 'current_events' | 'factual' | 'technical' | 'conversational' | 'complex'
  needsWebSearch: boolean
  needsReasoning: boolean
  confidence: number
}

export interface SourcePlan {
  sources: Array<'exa' | 'perplexity' | 'wikipedia' | 'grok' | 'financial'>
  reasoning: string
  searchQueries: {
    exa?: string
    perplexity?: string
    wikipedia?: string[]
    financial?: {
      type: 'stock' | 'crypto'
      symbols: string[]
    }
  }
  expectedType: 'quick_fact' | 'deep_research' | 'current_event' | 'comparison' | 'market_data'
}

export interface SourceResult {
  source: 'exa' | 'perplexity' | 'wikipedia' | 'grok' | 'financial'
  data: any
  citations?: Array<{
    url: string
    title: string
    snippet?: string
    image?: string       // Primary image URL
    images?: string[]    // Additional images
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

export interface MetadataUpdate {
  type: 'meta'
  userMessageId?: string
  assistantMessageId?: string
}

export type StreamEvent = StatusUpdate | ContentChunk | MetadataUpdate
