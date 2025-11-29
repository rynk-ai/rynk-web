'use server'

import { knowledgeBase } from '@/lib/services/knowledge-base'
import { auth } from '@/lib/auth'

export async function ingestProcessedFileAction(
  conversationId: string,
  messageId: string,
  file: { name: string, type: string, r2Url: string, size: number },
  chunks: { content: string, metadata: any }[],
  metadata: any
) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  try {
    console.log(`[RAG Action] Ingesting file: ${file.name} (${chunks.length} chunks)`)
    
    const sourceId = await knowledgeBase.ingestProcessedSource(
      conversationId,
      {
        name: file.name,
        type: file.type,
        r2Key: file.r2Url,
        metadata: {
          ...metadata,
          fileSize: file.size
        }
      },
      chunks,
      messageId
    )
    
    return { success: true, sourceId }
  } catch (error: any) {
    console.error('[RAG Action] Ingestion failed:', error)
    throw new Error(error.message || 'Failed to ingest file')
  }
}

// Legacy actions (keeping for backward compatibility if needed, but likely can be removed)
// ...

