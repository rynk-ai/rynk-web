
export interface StatusMetadata {
  sourceCount?: number
  sourcesRead?: number
  currentSource?: string
  contextChunks?: number
  filesProcessed?: number
  totalFiles?: number
}

export interface StatusUpdate {
  type: 'status'
  status: 'analyzing' | 'building_context' | 'searching' | 'reading_sources' | 'synthesizing' | 'complete' | 'error'
  message: string
  timestamp: number
  metadata?: StatusMetadata
}

export interface SearchResultsUpdate {
  type: 'search_results'
  query: string
  sources: any[]
  strategy: string[]
  totalResults: number
  timestamp: number
}

export interface ContextCard {
  source: string
  snippet: string
  score: number
  conversationId?: string
  conversationTitle?: string
}

export interface ContextCardsUpdate {
  type: 'context_cards'
  cards: ContextCard[]
  timestamp: number
}

export class StreamManager {
  private controller: ReadableStreamDefaultController
  private encoder: TextEncoder

  constructor(controller: ReadableStreamDefaultController) {
    this.controller = controller
    this.encoder = new TextEncoder()
  }

  /**
   * Send a status update to the client
   */
  sendStatus(status: StatusUpdate['status'], message: string, metadata?: StatusMetadata) {
    const update: StatusUpdate = {
      type: 'status',
      status,
      message,
      timestamp: Date.now(),
      ...(metadata && { metadata })
    }
    this.enqueue(JSON.stringify(update) + '\n')
  }

  /**
   * Send search results to the client
   */
  sendSearchResults(results: Omit<SearchResultsUpdate, 'type' | 'timestamp'>) {
    const update: SearchResultsUpdate = {
      type: 'search_results',
      ...results,
      timestamp: Date.now()
    }
    this.enqueue(JSON.stringify(update) + '\n')
  }

  /**
   * Send context cards to the client (retrieved RAG context)
   */
  sendContextCards(cards: ContextCard[]) {
    const update: ContextCardsUpdate = {
      type: 'context_cards',
      cards,
      timestamp: Date.now()
    }
    this.enqueue(JSON.stringify(update) + '\n')
  }

  /**
   * Stream text content
   */
  sendText(text: string) {
    this.enqueue(text)
  }

  /**
   * Enqueue raw data
   */
  private enqueue(data: string) {
    try {
      this.controller.enqueue(this.encoder.encode(data))
    } catch (error) {
      // Controller might be closed if client disconnected
      console.warn('[StreamManager] Failed to enqueue data (stream might be closed):', error)
    }
  }

  /**
   * Close the stream
   */
  close() {
    try {
      // Send completion signal before closing
      this.sendStatus('complete', 'Done')
      this.controller.close()
    } catch (error) {
      console.warn('[StreamManager] Failed to close stream:', error)
    }
  }

  /**
   * Report error and close
   */
  error(err: any) {
    try {
      this.sendStatus('error', err instanceof Error ? err.message : 'An error occurred')
      this.controller.error(err)
    } catch (e) {
      console.warn('[StreamManager] Failed to error stream:', e)
    }
  }
}

