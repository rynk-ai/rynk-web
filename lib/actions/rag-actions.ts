'use server'

import { vectorDb } from '@/lib/services/vector-db'
import { getAIProvider } from '@/lib/services/ai-factory'
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
    const aiProvider = getAIProvider()
    
    // Process in batches to avoid timeouts or rate limits
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      try {
        const vector = await aiProvider.getEmbeddings(chunk)
        
        await vectorDb.addFileChunk({
          attachmentId,
          userId: session.user.id,
          chunkIndex: i,
          content: chunk,
          vector,
          metadata: {
            ...metadata,
            chunkIndex: i,
            totalChunks: chunks.length
          }
        })
      } catch (e) {
        console.error(`[RAG] Failed to embed chunk ${i}:`, e)
        // Continue with other chunks
      }
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
