/**
 * Job Types for Durable Object Task Processor
 * 
 * Defines the shape of jobs processed by the TaskProcessor Durable Object.
 */

export type JobType = 'surface_generate' | 'chat_with_search'

export type JobStatus = 'queued' | 'processing' | 'skeleton_ready' | 'complete' | 'error'

export interface Job {
  id: string
  type: JobType
  params: Record<string, any>
  userId: string
  status: JobStatus
  createdAt: number
  startedAt?: number
  completedAt?: number
  result?: any
  error?: string
  // Progress tracking for long-running jobs
  progress?: {
    current: number
    total: number
    message: string
    step?: string  // Current step name for UI
  }
  // Skeleton state for fast initial display
  skeletonState?: any
}

export interface SurfaceGenerateParams {
  query: string
  surfaceType: string
  messageId: string
  conversationId?: string
}

export interface ChatWithSearchParams {
  conversationId: string
  messageContent: string
  userId: string
  referencedConversations?: any[]
  referencedFolders?: any[]
}

export interface QueueJobRequest {
  type: JobType
  params: SurfaceGenerateParams | ChatWithSearchParams
  userId: string
}

export interface QueueJobResponse {
  jobId: string
  status: JobStatus
}

export interface JobStatusResponse {
  id: string
  status: JobStatus
  progress?: Job['progress']
  result?: any
  error?: string
  createdAt: number
  completedAt?: number
  skeletonState?: any  // Early skeleton for fast display
}

/**
 * Chat Preprocessing Types
 * Used by the hybrid DO approach where DO handles heavy preprocessing
 * and the worker handles streaming AI responses.
 */
export interface ChatPreprocessParams {
  userId: string
  conversationId: string
  query: string
  referencedConversations: any[]
  referencedFolders: any[]
  projectId?: string
  useReasoning: 'auto' | 'on' | 'online' | 'off'
}

export interface ChatPreprocessResponse {
  success: boolean
  // Context data
  contextText: string
  retrievedChunks: Array<{
    content: string
    source: string
    score: number
  }>
  // Reasoning detection
  shouldUseReasoning: boolean
  shouldUseWebSearch: boolean
  selectedModel: string
  detectionResult?: {
    domain: string
    subDomain: string
    informationType: string
    needsDisclaimer: boolean
  }
  // Web search results (if applicable)
  searchResults?: {
    query: string
    sources: any[]
    searchStrategy: string[]
    totalResults: number
  }
  // Timing info
  preprocessingTimeMs: number
}
