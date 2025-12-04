import { StatusUpdate, ContentChunk, StatusType } from './types'

/**
 * StatusEmitter - Handles streaming status updates and content chunks via SSE
 */
export class StatusEmitter {
  private encoder = new TextEncoder()
  
  /**
   * Emit a status update (e.g., "Finding sources...")
   */
  emitStatus(
    controller: ReadableStreamDefaultController,
    status: StatusType,
    message: string
  ): void {
    const event: StatusUpdate = {
      type: 'status',
      status,
      message,
      timestamp: Date.now()
    }
    
    try {
      const data = `data: ${JSON.stringify(event)}\n\n`
      controller.enqueue(this.encoder.encode(data))
    } catch (error) {
      // Controller might be closed, ignore
      console.warn('[StatusEmitter] Failed to emit status:', error)
    }
  }
  
  /**
   * Emit content chunks (the actual AI response)
   */
  emitContent(
    controller: ReadableStreamDefaultController,
    content: string
  ): void {
    const event: ContentChunk = {
      type: 'content',
      content
    }
    
    try {
      const data = `data: ${JSON.stringify(event)}\n\n`
      controller.enqueue(this.encoder.encode(data))
    } catch (error) {
      // Controller might be closed, ignore
      console.warn('[StatusEmitter] Failed to emit content:', error)
    }
  }
}
