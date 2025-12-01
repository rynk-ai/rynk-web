import { vectorDb } from '@/lib/services/vector-db'
import { cloudDb } from '@/lib/services/cloud-db'
import { getAIProvider } from '@/lib/services/ai-factory'
import { chunkText } from '@/lib/utils/chunking'

export interface KnowledgeSource {
  type: 'pdf' | 'text' | 'web' | 'project' | 'folder_link' | 'conversation_link'
  content: string
  name: string
  metadata: any
}

export class KnowledgeBaseService {
  
  /**
   * Ingest a source that has already been chunked (e.g. from frontend).
   * This skips the internal chunking logic and uses the provided chunks.
   */
  async ingestProcessedSource(
    conversationId: string,
    source: { name: string, type: string, r2Key: string, metadata: any },
    chunks: { content: string, metadata: any }[],
    messageId?: string,
    isFirstBatch: boolean = true
  ) {
    console.log('📚 [KnowledgeBase] Ingesting processed source:', { name: source.name, chunks: chunks.length, isFirstBatch })

    try {
    // 1. Generate Hash (from file metadata to ensure consistency across batches)
    console.log('🔐 [KnowledgeBase] Generating hash...')
    // Use file name + r2Key for consistent hash across all batches of the same file
    const hashInput = `${source.name}:${source.r2Key}:${conversationId}:${messageId || ''}`
    const hash = await this.generateHash(hashInput)
    console.log('✅ [KnowledgeBase] Hash generated:', hash.substring(0, 16) + '...')

      // 2. Check if Source already exists (for batched ingestion)
      let sourceId: string
      const existingSource = await vectorDb.getSourceByHash(hash)
      
      if (existingSource) {
        console.log('♻️ [KnowledgeBase] Source already exists (batched ingestion):', existingSource.id)
        sourceId = existingSource.id
      } else {
        // Try to create source (might fail if another batch creates it concurrently)
        try {
          console.log('📝 [KnowledgeBase] Creating new source...')
          sourceId = await vectorDb.createSource({
            hash,
            type: source.type,
            name: source.name,
            metadata: {
              ...source.metadata,
              r2Key: source.r2Key
            }
          })
          console.log('✅ [KnowledgeBase] Source created:', sourceId)
        } catch (createError: any) {
          // Handle race condition: another batch created the source concurrently
          if (createError.message?.includes('UNIQUE constraint failed') || createError.message?.includes('SQLITE_CONSTRAINT')) {
            console.log('⚠️ [KnowledgeBase] Race condition detected, retrying lookup...')
            const retrySource = await vectorDb.getSourceByHash(hash)
            if (retrySource) {
              console.log('✅ [KnowledgeBase] Found source created by concurrent batch:', retrySource.id)
              sourceId = retrySource.id
            } else {
              // This should never happen, but throw original error if it does
              throw createError
            }
          } else {
            // Re-throw if it's not a constraint error
            throw createError
          }
        }
      }

      // Link to conversation only on first batch
      if (isFirstBatch) {
        console.log('🔗 [KnowledgeBase] Linking source to conversation...')
        await vectorDb.linkSourceToConversation(conversationId, sourceId, messageId)
        console.log('✅ [KnowledgeBase] Source linked to conversation')
      }

      // 3. Embed and Store Chunks (Batch)
      console.log('🔄 [KnowledgeBase] Starting embedding generation for', chunks.length, 'chunks...')
      const { getOpenRouter } = await import('@/lib/services/openrouter')
      const aiProvider = getOpenRouter()

      // Get current max chunk index for this source to append new chunks
      const existingChunks = await vectorDb.getKnowledgeChunks(sourceId)
      const startIndex = existingChunks.length

      // Process in smaller batches to avoid rate limits
      const BATCH_SIZE = 5
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE)
        console.log(`🔄 [KnowledgeBase] Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${batch.length} chunks)...`)
        
        await Promise.all(batch.map(async (chunk, batchIndex) => {
          try {
            const vector = await aiProvider.getEmbeddings(chunk.content)
            await vectorDb.addKnowledgeChunk({
              sourceId,
              content: chunk.content,
              vector,
              chunkIndex: startIndex + i + batchIndex,
              metadata: chunk.metadata
            })
          } catch (e) {
            console.error(`❌ [KnowledgeBase] Failed to embed chunk ${startIndex + i + batchIndex}:`, e)
            throw e // Re-throw to fail the entire operation
          }
        }))
        console.log(`✅ [KnowledgeBase] Embedding batch ${Math.floor(i / BATCH_SIZE) + 1} complete`)
      }

      console.log('✅ [KnowledgeBase] Successfully ingested batch to source:', sourceId)
      return sourceId
    } catch (error) {
      console.error('❌ [KnowledgeBase.ingestProcessedSource] Error:', error)
      throw error
    }
  }

  /**
   * Ingest a source into the knowledge base.
   * Handles hashing, deduplication, chunking, and linking.
   */
  async addSource(
    conversationId: string, 
    source: KnowledgeSource, 
    messageId?: string
  ) {
    console.log('📚 [KnowledgeBase] Adding source:', { name: source.name, type: source.type })
    
    // 1. Generate Hash
    const hash = await this.generateHash(source.content)
    
    // 2. Check for existing source (Deduplication)
    let sourceId: string
    const existingSource = await vectorDb.getSourceByHash(hash)
    
    if (existingSource) {
      console.log('♻️ [KnowledgeBase] Source exists, reusing:', existingSource.id)
      sourceId = existingSource.id
    } else {
      console.log('🆕 [KnowledgeBase] Creating new source')
      // 3. Create new source
      sourceId = await vectorDb.createSource({
        hash,
        type: source.type,
        name: source.name,
        metadata: source.metadata
      })
      
      // 4. Chunk and Embed (only for new sources)
      // We assume text content for now. For PDFs, content should be extracted text.
      if (source.content && source.content.trim()) {
        await this.processContent(sourceId, source.content, source.metadata)
      }
    }
    
    // 5. Link to Conversation (and Message if provided)
    await vectorDb.linkSourceToConversation(conversationId, sourceId, messageId)
    console.log('🔗 [KnowledgeBase] Linked source to conversation')
    
    return sourceId
  }

  /**
   * Retrieve relevant context for a specific point in the conversation.
   * Walks the message path to find active sources.
   */
  async getContext(
    conversationId: string, 
    query: string, 
    targetMessageId?: string // If null, uses the end of the conversation
  ): Promise<string> {
    console.log('🔍 [KnowledgeBase] Getting context for query:', query.substring(0, 50))
    
    // 1. Get Active Sources for this path
    const activeSourceIds = await this.getActiveSourcesForPath(conversationId, targetMessageId)
    
    if (activeSourceIds.length === 0) {
      console.log('⚠️ [KnowledgeBase] No active sources found')
      return ''
    }
    
    console.log('📚 [KnowledgeBase] Active sources:', activeSourceIds.length)

    // 2. Generate Query Embedding
    // Always use OpenRouter/Multimodal provider for embeddings to match ingestion
    try {
      console.log('🔄 [KnowledgeBase] Generating embeddings...')
      const { getOpenRouter } = await import('@/lib/services/openrouter')
      const aiProvider = getOpenRouter()
      const queryVector = await aiProvider.getEmbeddings(query, 10000) // 10s timeout
      console.log('✅ [KnowledgeBase] Embeddings generated')
      
      // 3. Vector Search
      console.log('🔍 [KnowledgeBase] Searching knowledge base with 13 sources...')
      // Lowered minScore to 0.1 for debugging
      const chunks = await vectorDb.searchKnowledgeBase(activeSourceIds, queryVector, { limit: 15, minScore: 0.1 })
      console.log(`✅ [KnowledgeBase] Found ${chunks.length} relevant chunks (minScore: 0.1)`)
      
      if (chunks.length > 0) {
        console.log('🔍 [KnowledgeBase] Top chunk score:', chunks[0].score)
        console.log('🔍 [KnowledgeBase] Top chunk content preview:', chunks[0].content.substring(0, 50))
      } else {
        console.log('⚠️ [KnowledgeBase] No chunks found even with low threshold')
      }
      
      if (chunks.length === 0) return ''
      
      // 4. Format Context
      // Group chunks by source for better readability
      const contextParts = chunks.map((chunk, i) => {
        // We could fetch source name here if we joined tables, but for now just use content
        return `[Source Content - Excerpt ${i + 1}]\n${chunk.content}`
      })
      
      return contextParts.join('\n\n---\n\n')
    } catch (error) {
      console.error('❌ [KnowledgeBase] Failed to get context:', error)
      // Return empty string instead of crashing
      return ''
    }
  }

  /**
   * Helper: Walk the message path to find all sources that should be active.
   * This handles branching/editing: only sources in the current path are returned.
   */
  private async getActiveSourcesForPath(conversationId: string, targetMessageId?: string): Promise<string[]> {
    // 1. Get all sources linked to this conversation
    const allLinks = await vectorDb.getSourcesForConversation(conversationId)
    
    // 2. Fetch current conversation path (fetch all/large limit to get full path)
    const { messages } = await cloudDb.getMessages(conversationId, 10000)
    const messageIdsInPath = new Set(messages.map(m => m.id))
    
    // 3. Build a set of ALL message IDs including version lineage
    // This is the FIX: Include sources linked to ANY version of messages in the current path
    const equivalentMessageIds = new Set<string>()
    
    for (const message of messages) {
      // Add the message itself
      equivalentMessageIds.add(message.id)
      
      // If this message is a version of another message, fetch all versions
      if (message.versionOf || message.versionNumber > 1) {
        try {
          // Get the root message ID
          const rootId = message.versionOf || message.id
          
          // Fetch all versions of this message (including the root)
          const versions = await cloudDb.getMessageVersions(rootId)
          
          // Add all version IDs to the set
          versions.forEach(v => equivalentMessageIds.add(v.id))
          
          console.log(`🔗 [KnowledgeBase] Message ${message.id} has ${versions.length} versions (root: ${rootId})`)
        } catch (error) {
          console.error(`⚠️ [KnowledgeBase] Failed to fetch versions for message ${message.id}:`, error)
          // Continue even if version fetch fails - at least we have the message itself
        }
      }
    }
    
    console.log(`🔍 [KnowledgeBase] Filtering links: Found ${allLinks.length} total links`)
    console.log(`🔍 [KnowledgeBase] Path has ${messageIdsInPath.size} messages`)
    console.log(`🔍 [KnowledgeBase] Including ${equivalentMessageIds.size} message IDs (with versions)`)
    
    // 4. Filter links using the expanded set
    // A link is active if:
    // a) It has NO messageId (global conversation context, e.g. added via settings)
    // b) It has a messageId AND that messageId is in the version lineage of current path
    const activeSourceIds = allLinks
      .filter((link: any) => {
        const isActive = !link.messageId || equivalentMessageIds.has(link.messageId)
        if (!isActive) {
           console.log(`⚠️ [KnowledgeBase] Filtered out link ${link.id} (Source: ${link.sourceId}) - MessageId ${link.messageId} not in path or version lineage`)
        } else {
           console.log(`✅ [KnowledgeBase] Keeping link ${link.id} (Source: ${link.sourceId}) - MessageId ${link.messageId || 'GLOBAL'}`)
        }
        return isActive
      })
      .map((link: any) => link.sourceId) // This is the source ID (from cs.sourceId)
      
    // Deduplicate IDs
    return Array.from(new Set(activeSourceIds))
  }

  /**
   * Process content: Chunk and Embed
   */
  private async processContent(sourceId: string, content: string, metadata: any) {
    // 1. Chunk
    const chunks = chunkText(content, { chunkSize: 1000, overlap: 200 })
    console.log(`[KnowledgeBase] Chunked into ${chunks.length} parts`)
    
    // 2. Embed and Store (Batch)
    const { getOpenRouter } = await import('@/lib/services/openrouter')
    const aiProvider = getOpenRouter()
    
    // Process in small batches to avoid rate limits
    const BATCH_SIZE = 5
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(async (chunk, batchIndex) => {
        try {
          const vector = await aiProvider.getEmbeddings(chunk)
          await vectorDb.addKnowledgeChunk({
            sourceId,
            content: chunk,
            vector,
            chunkIndex: i + batchIndex,
            metadata
          })
        } catch (e) {
          console.error('[KnowledgeBase] Embedding failed for chunk:', e)
        }
      }))
    }
  }

  private async generateHash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}

export const knowledgeBase = new KnowledgeBaseService()
