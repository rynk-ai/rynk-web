/**
 * Job Types for Durable Object Task Processor
 * 
 * Defines the shape of jobs processed by the TaskProcessor Durable Object.
 */

export type JobType = 'surface_generate' | 'chat_with_search'

export type JobStatus = 'queued' | 'processing' | 'complete' | 'error'

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
  }
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
}
