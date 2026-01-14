import { vectorDb } from '@/lib/services/vector-db'
import { cloudDb } from '@/lib/services/cloud-db'

/**
 * Resolved Knowledge Base
 * Contains all conversation IDs and source IDs to search
 */
export interface ResolvedKnowledgeBase {
  /** Conversation IDs whose messages should be searched */
  conversationIds: string[]
  /** Source IDs (files/PDFs) to search */
  sourceIds: string[]
  /** Debug info about resolution */
  resolution: {
    directConversation: string
    referencedConversations: string[]
    referencedFolders: string[]
    transitiveConversations: string[]
  }
}

/**
 * Resolve the complete Knowledge Base for a conversation
 * 
 * This recursively collects:
 * 1. The conversation's own messages
 * 2. All attached files/PDFs
 * 3. All referenced conversations (and their KBs transitively)
 * 4. All conversations in referenced folders (and their KBs transitively)
 * 
 * @param conversationId - The conversation to resolve KB for
 * @param visited - Set of already-visited conversation IDs (cycle detection)
 * @returns Resolved KB with all conversation IDs and source IDs to query
 */
export async function resolveKnowledgeBase(
  conversationId: string,
  visited: Set<string> = new Set()
): Promise<ResolvedKnowledgeBase> {
  
  // Cycle detection - prevent infinite loops
  if (visited.has(conversationId)) {
    console.log(`♻️ [resolveKB] Skipping already-visited: ${conversationId}`)
    return {
      conversationIds: [],
      sourceIds: [],
      resolution: {
        directConversation: conversationId,
        referencedConversations: [],
        referencedFolders: [],
        transitiveConversations: []
      }
    }
  }
  visited.add(conversationId)
  
  console.log(`🔍 [resolveKB] Resolving KB for: ${conversationId}`)
  
  // Initialize result
  const conversationIds = new Set<string>([conversationId])
  const sourceIds = new Set<string>()
  const referencedConversationIds: string[] = []
  const referencedFolderIds: string[] = []
  const transitiveConversationIds: string[] = []
  
  // 1. Get all sources (files/PDFs) linked to this conversation
  const sources = await vectorDb.getSourcesForConversation(conversationId)
  for (const source of sources) {
    sourceIds.add(source.sourceId)
  }
  console.log(`📁 [resolveKB] Found ${sources.length} direct sources`)
  
  // 2. Collect ALL references from conversation history (persistent refs)
  const { messages } = await cloudDb.getMessages(conversationId, 200)
  const refConvos = new Map<string, { id: string; title: string }>()
  const refFolders = new Map<string, { id: string; name: string }>()
  
  for (const msg of messages) {
    // Collect referenced conversations
    for (const ref of msg.referencedConversations || []) {
      refConvos.set(ref.id, ref)
    }
    // Collect referenced folders
    for (const ref of msg.referencedFolders || []) {
      refFolders.set(ref.id, ref)
    }
  }
  
  console.log(`🔗 [resolveKB] Found ${refConvos.size} referenced convos, ${refFolders.size} referenced folders`)
  
  // 3. Recursively resolve referenced conversations
  for (const [refId, ref] of refConvos) {
    referencedConversationIds.push(refId)
    
    const refKB = await resolveKnowledgeBase(refId, visited)
    
    // Add all conversation IDs from referenced KB
    for (const id of refKB.conversationIds) {
      conversationIds.add(id)
      if (id !== refId) transitiveConversationIds.push(id)
    }
    
    // Add all source IDs from referenced KB
    for (const id of refKB.sourceIds) {
      sourceIds.add(id)
    }
  }
  
  // 4. Resolve folders → conversations → KBs
  for (const [folderId, folderRef] of refFolders) {
    referencedFolderIds.push(folderId)
    
    try {
      const folder = await cloudDb.getFolder(folderId)
      if (!folder || !folder.conversationIds) continue
      
      console.log(`📂 [resolveKB] Folder "${folderRef.name}" has ${folder.conversationIds.length} conversations`)
      
      for (const convId of folder.conversationIds) {
        const folderConvKB = await resolveKnowledgeBase(convId, visited)
        
        for (const id of folderConvKB.conversationIds) {
          conversationIds.add(id)
          transitiveConversationIds.push(id)
        }
        
        for (const id of folderConvKB.sourceIds) {
          sourceIds.add(id)
        }
      }
    } catch (error) {
      console.error(`❌ [resolveKB] Failed to resolve folder ${folderId}:`, error)
    }
  }
  
  const result: ResolvedKnowledgeBase = {
    conversationIds: Array.from(conversationIds),
    sourceIds: Array.from(sourceIds),
    resolution: {
      directConversation: conversationId,
      referencedConversations: referencedConversationIds,
      referencedFolders: referencedFolderIds,
      transitiveConversations: [...new Set(transitiveConversationIds)]
    }
  }
  
  console.log(`✅ [resolveKB] Resolved: ${result.conversationIds.length} convos, ${result.sourceIds.length} sources`)
  
  return result
}

/**
 * Search the resolved Knowledge Base
 * Queries Vectorize for both messages and file chunks
 */
export async function searchResolvedKnowledgeBase(
  kb: ResolvedKnowledgeBase,
  queryVector: number[],
  options: { messageLimit?: number; sourceLimit?: number; minScore?: number } = {}
): Promise<{
  messages: Array<{ messageId: string; conversationId: string; content: string; score: number }>
  chunks: Array<{ id: string; sourceId: string; content: string; score: number }>
}> {
  const { messageLimit = 15, sourceLimit = 10, minScore = 0.25 } = options
  
  console.log(`🔍 [searchKB] Searching ${kb.conversationIds.length} convos, ${kb.sourceIds.length} sources`)
  
  // Parallel search: messages + file chunks
  const [messageResults, chunkResults] = await Promise.all([
    // Search messages across all conversation IDs
    kb.conversationIds.length > 0
      ? vectorDb.searchMultipleConversations(kb.conversationIds, queryVector, { limit: messageLimit, minScore })
      : Promise.resolve([]),
    
    // Search file chunks across all source IDs
    kb.sourceIds.length > 0
      ? vectorDb.searchKnowledgeBase(kb.sourceIds, queryVector, { limit: sourceLimit, minScore })
      : Promise.resolve([])
  ])
  
  console.log(`✅ [searchKB] Found ${messageResults.length} messages, ${chunkResults.length} chunks`)
  
  return {
    messages: messageResults,
    chunks: chunkResults
  }
}
