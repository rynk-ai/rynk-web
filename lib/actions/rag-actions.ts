'use server'

import { vectorDb } from '@/lib/services/vector-db'
import { getOpenRouter } from '@/lib/services/openrouter'
import { chunkText } from '@/lib/utils/chunking'
import { auth } from '@/lib/auth'

export async function processBatchForRAGAction(
  attachmentId: string,
  chunks: string[],
  startIndex: number,
  metadata: any
) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  try {
    // Update status to processing if it's the first batch
    if (startIndex === 0) {
      await vectorDb.updateProcessingStatus(attachmentId, 'processing')
    }

    console.log(`[RAG] Processing batch of ${chunks.length} chunks starting at index ${startIndex}`)
    
    // Generate embeddings and store chunks
    // ALWAYS use OpenRouter for embeddings as it supports the embedding model
    const aiProvider = getOpenRouter()
    
    // Process chunks in parallel
    const batchPromises = chunks.map(async (chunk, batchIndex) => {
      const globalIndex = startIndex + batchIndex
      try {
        const vector = await aiProvider.getEmbeddings(chunk)
        
        await vectorDb.addFileChunk({
          attachmentId,
          userId: session.user!.id!,
          chunkIndex: globalIndex,
          content: chunk,
          vector,
          metadata: {
            ...metadata,
            chunkIndex: globalIndex,
          }
        })
        return true
      } catch (e) {
        console.error(`[RAG] Failed to embed chunk ${globalIndex}:`, e)
        return false
      }
    })
    
    await Promise.all(batchPromises)
    
    return { success: true, processedCount: chunks.length }
  } catch (error) {
    console.error('RAG Batch Processing Failed:', error)
    // Only mark as failed if it's a critical error, otherwise let frontend decide
    throw error
  }
}

export async function completeRAGProcessingAction(attachmentId: string, totalChunks: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  await vectorDb.updateProcessingStatus(attachmentId, 'completed', totalChunks)
  return { success: true }
}

export async function createAttachmentMetadataAction(data: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  return await vectorDb.createAttachmentMetadata({
    ...data,
    userId: session.user.id,
    processingStatus: 'pending',
    chunkCount: 0,
    messageId: null // Explicitly null initially
  })
}
