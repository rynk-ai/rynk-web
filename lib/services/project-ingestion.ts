import { knowledgeBase } from '@/lib/services/knowledge-base'
import { vectorDb } from '@/lib/services/vector-db'

/**
 * Process project attachments by ingesting them into the knowledge base
 * Supports PDFs, code files, markdown, text files, and more
 */
export async function processProjectAttachments(projectId: string, attachments: any[]) {
  console.log(`📁 [ProjectIngestion] Processing ${attachments.length} attachments for project ${projectId}`)
  
  for (const attachment of attachments) {
    try {
      // Check if file has chunks (text-based files)
      if (attachment.chunks && attachment.chunks.length > 0) {
        console.log(`📄 [ProjectIngestion] Processing file with ${attachment.chunks.length} chunks: ${attachment.name}`)
        
        // Ingest the file
        await ingestProjectFile(projectId, attachment)
      } else {
        console.log(`⏭️ [ProjectIngestion] Skipping non-vectorizable file: ${attachment.name}`)
      }
    } catch (error) {
      console.error(`❌ [ProjectIngestion] Failed to process ${attachment.name}:`, error)
      // Continue with other attachments even if one fails
    }
  }
}

/**
 * Ingest a project file (PDF, code, markdown, text, etc.) into the knowledge base
 * This follows the same flow as message attachments but links to projectId
 */
async function ingestProjectFile(projectId: string, attachment: any) {
  // Check if chunks exist
  if (!attachment.chunks || !attachment.chunks.length) {
    console.warn(`⚠️ [ProjectIngestion] File ${attachment.name} has no chunks, skipping`)
    return
  }
  
  // Use the knowledge base ingestion method
  const sourceId = await knowledgeBase.ingestProcessedSource(
    '', // No conversation ID for project sources
    {
      name: attachment.name,
      type: attachment.type,
      r2Key: attachment.url || attachment.r2Key,
      metadata: attachment.metadata || {}
    },
    attachment.chunks,
    undefined, // No message ID
    true,  // isFirstBatch
    true   // isLastBatch
  )
  
  // Link to project instead of conversation
  await vectorDb.linkSourceToProject(projectId, sourceId)
  
  console.log(`✅ [ProjectIngestion] Successfully ingested ${attachment.name} as source ${sourceId}`)
}
