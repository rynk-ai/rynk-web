'use server'

import { vectorDb } from '@/lib/services/vector-db'
import { getOpenRouter } from '@/lib/services/openrouter'
import { chunkText } from '@/lib/utils/chunking'
import { auth } from '@/lib/auth'

export async function processFileForRAGAction(
  attachmentId: string,
  content: string,
  metadata: any
) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  try {
    // Update status to processing
    await vectorDb.updateProcessingStatus(attachmentId, 'processing')

    // Chunk content
    const chunks = chunkText(content)
    console.log(`[RAG] Chunked file ${metadata.fileName} into ${chunks.length} chunks`)
    
    // Generate embeddings and store chunks
    // ALWAYS use OpenRouter for embeddings as it supports the embedding model
    const aiProvider = getOpenRouter()
    
    // Process in batches of 5 to speed up but avoid rate limits
    const BATCH_SIZE = 5
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const globalIndex = i + batchIndex
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
              totalChunks: chunks.length
            }
          })
          return true
        } catch (e) {
          console.error(`[RAG] Failed to embed chunk ${globalIndex}:`, e)
          return false
        }
      })
      
      await Promise.all(batchPromises)
    }

    // Update status to completed
    await vectorDb.updateProcessingStatus(attachmentId, 'completed', chunks.length)
    
    return { success: true, chunkCount: chunks.length }
  } catch (error) {
    console.error('RAG Processing Failed:', error)
    await vectorDb.updateProcessingStatus(attachmentId, 'failed')
    throw error
  }
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
