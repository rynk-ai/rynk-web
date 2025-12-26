import { type D1Database } from '@cloudflare/workers-types'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Helper to get DB binding
const getDB = () => {
  try {
    return getCloudflareContext().env.DB
  } catch (error) {
    // Fallback for when context is not available (shouldn't happen with initOpenNextCloudflareForDev)
    console.error('❌ Cloudflare context not available:', error)
    throw new Error(
      'D1 Database binding not available. Make sure initOpenNextCloudflareForDev() is called in next.config.mjs'
    )
  }
}

export interface CloudConversation {
  id: string
  title: string
  path: string[]
  createdAt: number
  updatedAt: number
  userId: string
  isPinned: boolean
  tags: string[]
  projectId?: string
  branches: any[] // Required for UI compatibility
  activeBranchId?: string
  activeReferencedConversations?: { id: string; title: string }[]
  activeReferencedFolders?: { id: string; name: string }[]
  preview?: string // First 50 chars of last message for sidebar display
  surfaceStates?: Record<string, any> // Persisted surface states (learning, guide)
}

export interface CloudMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
  userId: string
  attachments?: any[]
  referencedConversations?: any[]
  referencedFolders?: any[]
  timestamp: number // Required for UI compatibility
  versionNumber: number
  versionOf?: string
  branchId?: string
  parentMessageId?: string
  // Reasoning & Web Search
  reasoning_content?: string
  reasoning_metadata?: {
    statusPills: Array<{
      status: 'analyzing' | 'building_context' | 'searching' | 'reading_sources' | 'synthesizing' | 'complete'
      message: string
      timestamp: number
      metadata?: {
        sourceCount?: number
        sourcesRead?: number
        currentSource?: string
        contextChunks?: number
        filesProcessed?: number
        totalFiles?: number
      }
    }>
    searchResults?: {
      query: string
      sources: Array<{
        type: 'exa' | 'perplexity' | 'wikipedia'
        url: string
        title: string
        snippet: string
        score?: number
        publishedDate?: string
        author?: string
        highlights?: string[]
        thumbnail?: string
      }>
      strategy: string[]
      totalResults: number
    }
  }
  web_annotations?: any
  model_used?: string
}

export interface Folder {
  id: string
  userId: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  conversationIds: string[]
}

export interface Project {
  id: string
  userId: string
  name: string
  description: string
  instructions?: string
  attachments?: any[]
  createdAt: number
  updatedAt: number
}

export interface CloudEmbedding {
  id: string
  messageId: string
  conversationId: string
  userId: string
  content: string
  vector: number[]
  timestamp: number
  createdAt: string
}

export interface SubChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export interface SubChat {
  id: string
  conversationId: string
  sourceMessageId: string
  quotedText: string
  fullMessageContent: string
  messages: SubChatMessage[]
  createdAt: number
  updatedAt: number
}

// Surface Sub-Chat for surfaces (Wiki, Research, etc.) and learning pages
export interface SurfaceSubChat {
  id: string
  userId: string
  sourceType: 'surface' | 'learning'
  sourceId: string           // surfaceId or courseId
  sectionId?: string         // Specific section within source
  quotedText: string
  sourceContent?: string     // Full section content for context
  messages: SubChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface SharedConversation {
  id: string
  conversationId: string
  userId: string
  title: string
  isActive: boolean
  viewCount: number
  cloneCount: number
  createdAt: string
  expiresAt?: string
}

export const cloudDb = {
  async getUser(email: string) {
    const db = getDB()
    return await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  },

  async createUser(email: string, name?: string, image?: string) {
    const db = getDB()
    const id = crypto.randomUUID()
    await db.prepare('INSERT INTO users (id, email, name, image) VALUES (?, ?, ?, ?)').bind(id, email, name, image).run()
    return id
  },

  async getConversations(userId: string, limit: number = 20, offset: number = 0, projectId?: string) {
    const db = getDB()
    
    let query = 'SELECT * FROM conversations WHERE userId = ?'
    const params: any[] = [userId]
    
    if (projectId) {
      query += ' AND projectId = ?'
      params.push(projectId)
    }
    
    query += ' ORDER BY updatedAt DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const results = await db.prepare(query).bind(...params).all()
    
    return results.results.map((c: any) => ({
      ...c,
      path: JSON.parse(c.path as string || '[]'),
      tags: JSON.parse(c.tags as string || '[]'),
      branches: JSON.parse(c.branches as string || '[]'),
      isPinned: Boolean(c.isPinned),
      activeReferencedConversations: JSON.parse(c.activeReferencedConversations as string || '[]'),
      activeReferencedFolders: JSON.parse(c.activeReferencedFolders as string || '[]'),
      surfaceStates: c.surfaceStates ? JSON.parse(c.surfaceStates as string) : undefined
    })) as CloudConversation[]
  },

  async searchConversations(userId: string, query: string, limit: number = 20, offset: number = 0) {
    const db = getDB()
    const results = await db.prepare(
      'SELECT * FROM conversations WHERE userId = ? AND title LIKE ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?'
    ).bind(userId, `%${query}%`, limit, offset).all()
    
    return results.results.map((c: any) => ({
      ...c,
      path: JSON.parse(c.path as string || '[]'),
      tags: JSON.parse(c.tags as string || '[]'),
      branches: JSON.parse(c.branches as string || '[]'),
      isPinned: Boolean(c.isPinned),
      activeReferencedConversations: JSON.parse(c.activeReferencedConversations as string || '[]'),
      activeReferencedFolders: JSON.parse(c.activeReferencedFolders as string || '[]'),
      surfaceStates: c.surfaceStates ? JSON.parse(c.surfaceStates as string) : undefined
    })) as CloudConversation[]
  },

  async getConversation(conversationId: string): Promise<CloudConversation | null> {
    const db = getDB()
    const result = await db.prepare('SELECT * FROM conversations WHERE id = ?').bind(conversationId).first()
    if (!result) return null
    return {
      ...result,
      path: JSON.parse(result.path as string || '[]'),
      tags: JSON.parse(result.tags as string || '[]'),
      branches: JSON.parse(result.branches as string || '[]'),
      isPinned: Boolean(result.isPinned),
      activeReferencedConversations: JSON.parse(result.activeReferencedConversations as string || '[]'),
      activeReferencedFolders: JSON.parse(result.activeReferencedFolders as string || '[]'),
      surfaceStates: result.surfaceStates ? JSON.parse(result.surfaceStates as string) : undefined
    } as CloudConversation
  },

  async getConversationsByProjectId(projectId: string): Promise<CloudConversation[]> {
    const db = getDB()
    const results = await db.prepare('SELECT * FROM conversations WHERE projectId = ? ORDER BY updatedAt DESC').bind(projectId).all()
    return results.results.map((c: any) => ({
      ...c,
      path: JSON.parse(c.path as string || '[]'),
      tags: JSON.parse(c.tags as string || '[]'),
      branches: JSON.parse(c.branches as string || '[]'),
      isPinned: Boolean(c.isPinned),
      activeReferencedConversations: JSON.parse(c.activeReferencedConversations as string || '[]'),
      activeReferencedFolders: JSON.parse(c.activeReferencedFolders as string || '[]'),
      surfaceStates: c.surfaceStates ? JSON.parse(c.surfaceStates as string) : undefined
    })) as CloudConversation[]
  },

  /**
   * Get recent messages from all conversations in a project (except current).
   * Used as D1 fallback when Vectorize hasn't indexed new messages yet.
   */
  async getRecentProjectMessages(
    projectId: string, 
    excludeConversationId?: string, 
    limit: number = 10
  ): Promise<{ messageId: string; conversationId: string; conversationTitle: string; role: string; content: string; createdAt: number }[]> {
    const db = getDB()
    
    // Get all conversations in this project
    const conversations = await db.prepare(
      'SELECT id, title FROM conversations WHERE projectId = ?'
    ).bind(projectId).all()
    
    if (conversations.results.length === 0) return []
    
    // Build conversation title map
    const titleMap = new Map(conversations.results.map((c: any) => [c.id, c.title]))
    
    // Get conversation IDs (excluding current if provided)
    const conversationIds = conversations.results
      .map((c: any) => c.id as string)
      .filter(id => id !== excludeConversationId)
    
    if (conversationIds.length === 0) return []
    
    // Fetch recent messages from these conversations (last 24 hours for efficiency)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    const placeholders = conversationIds.map(() => '?').join(',')
    
    const messages = await db.prepare(`
      SELECT id, conversationId, role, content, createdAt 
      FROM messages 
      WHERE conversationId IN (${placeholders}) 
        AND createdAt > ?
        AND role IN ('user', 'assistant')
      ORDER BY createdAt DESC 
      LIMIT ?
    `).bind(...conversationIds, oneDayAgo, limit).all()
    
    console.log(`📊 [cloudDb] getRecentProjectMessages: Found ${messages.results.length} recent messages from ${conversationIds.length} conversations`)
    
    return messages.results.map((m: any) => ({
      messageId: m.id,
      conversationId: m.conversationId,
      conversationTitle: titleMap.get(m.conversationId) || 'Unknown Chat',
      role: m.role,
      content: m.content,
      createdAt: m.createdAt
    }))
  },

  async createConversation(userId: string, title: string = 'New Conversation', projectId?: string) {
    const db = getDB()
    
    // DEFENSIVE: Ensure user exists before creating conversation
    const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
    if (!user) {
      throw new Error(`User ${userId} not found in database. Please log in again.`)
    }
    
    const id = crypto.randomUUID()
    const now = Date.now()
    await db.prepare(
      'INSERT INTO conversations (id, userId, projectId, title, path, tags, isPinned, branches, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, projectId || null, title, '[]', '[]', 0, '[]', now, now).run()
    
    return { id, userId, projectId, title, path: [], tags: [], isPinned: false, branches: [], createdAt: now, updatedAt: now }
  },

  async getConversationsBatch(conversationIds: string[]): Promise<CloudConversation[]> {
    if (conversationIds.length === 0) return []
    
    const db = getDB()
    const placeholders = conversationIds.map(() => '?').join(',')
    const results = await db.prepare(
      `SELECT * FROM conversations WHERE id IN (${placeholders})`
    ).bind(...conversationIds).all()
    
    return results.results.map((c: any) => ({
      ...c,
      path: JSON.parse(c.path as string || '[]'),
      tags: JSON.parse(c.tags as string || '[]'),
      branches: JSON.parse(c.branches as string || '[]'),
      isPinned: Boolean(c.isPinned),
      activeReferencedConversations: JSON.parse(c.activeReferencedConversations as string || '[]'),
      activeReferencedFolders: JSON.parse(c.activeReferencedFolders as string || '[]'),
      surfaceStates: c.surfaceStates ? JSON.parse(c.surfaceStates as string) : undefined
    })) as CloudConversation[]
  },

  async getMessagesBatch(conversationIds: string[]): Promise<Map<string, CloudMessage[]>> {
    if (conversationIds.length === 0) return new Map()
    
    const db = getDB()
    
    // First, get all conversation paths in batch
    const placeholders = conversationIds.map(() => '?').join(',')
    const conversations = await db.prepare(
      `SELECT id, path FROM conversations WHERE id IN (${placeholders})`
    ).bind(...conversationIds).all()
    
    // Build a map of conversationId -> path
    const pathMap = new Map<string, string[]>()
    const allMessageIds = new Set<string>()
    
    for (const conv of conversations.results) {
      const path = JSON.parse(conv.path as string || '[]') as string[]
      pathMap.set(conv.id as string, path)
      path.forEach(id => allMessageIds.add(id))
    }
    
    if (allMessageIds.size === 0) return new Map()
    
    // Fetch all messages in one query
    const messagePlaceholders = Array.from(allMessageIds).map(() => '?').join(',')
    const messages = await db.prepare(
      `SELECT * FROM messages WHERE id IN (${messagePlaceholders})`
    ).bind(...Array.from(allMessageIds)).all()
    
    // Build message map for quick lookup
    const msgMap = new Map(messages.results.map((m: any) => [
      m.id as string,
      {
        ...m,
        attachments: JSON.parse(m.attachments as string || '[]'),
        referencedConversations: JSON.parse(m.referencedConversations as string || '[]'),
        referencedFolders: JSON.parse(m.referencedFolders as string || '[]'),
        timestamp: m.createdAt,
        versionNumber: m.versionNumber || 1,
        reasoning_metadata: m.reasoning_metadata ? JSON.parse(m.reasoning_metadata as string) : undefined,
        web_annotations: m.web_annotations ? JSON.parse(m.web_annotations as string) : undefined
      } as CloudMessage
    ]))
    
    // Build result map: conversationId -> messages in path order
    const result = new Map<string, CloudMessage[]>()
    
    for (const [convId, path] of pathMap) {
      const orderedMessages = path
        .map(id => msgMap.get(id))
        .filter(Boolean) as CloudMessage[]
      
      result.set(convId, orderedMessages)
    }
    
    return result
  },

  /**
   * Fetch multiple messages by their IDs in a single batch query.
   * Useful for enriching vector search results with full message data.
   */
  async getMessagesByIdBatch(messageIds: string[]): Promise<CloudMessage[]> {
    if (messageIds.length === 0) return []
    
    const db = getDB()
    const placeholders = messageIds.map(() => '?').join(',')
    const results = await db.prepare(
      `SELECT * FROM messages WHERE id IN (${placeholders})`
    ).bind(...messageIds).all()
    
    return results.results.map((m: any) => ({
      ...m,
      attachments: JSON.parse(m.attachments as string || '[]'),
      referencedConversations: JSON.parse(m.referencedConversations as string || '[]'),
      referencedFolders: JSON.parse(m.referencedFolders as string || '[]'),
      timestamp: m.createdAt,
      versionNumber: m.versionNumber || 1,
      reasoning_metadata: m.reasoning_metadata ? JSON.parse(m.reasoning_metadata as string) : undefined,
      web_annotations: m.web_annotations ? JSON.parse(m.web_annotations as string) : undefined
    } as CloudMessage))
  },

  async getMessages(conversationId: string, limit: number = 50, cursor?: string) {
    const db = getDB()
    // First get conversation to know the path
    const conversation = await db.prepare('SELECT path FROM conversations WHERE id = ?').bind(conversationId).first()
    if (!conversation) return { messages: [], nextCursor: null }
    
    const path = JSON.parse(conversation.path as string || '[]') as string[]
    
    console.log('📋 [cloudDb.getMessages]', {
      conversationId,
      pathLength: path.length,
      limit,
      cursor
    });
    
    if (path.length === 0) return { messages: [], nextCursor: null }

    // Pagination Logic:
    // We want to fetch messages from the END of the array (most recent) backwards.
    // If no cursor is provided, we start from the end.
    // Cursor represents the ID of the last message we fetched (the "oldest" one in the previous batch).
    // So we want to fetch messages BEFORE the cursor in the path array.

    let endIndex = path.length;
    
    if (cursor) {
      const cursorIndex = path.indexOf(cursor);
      if (cursorIndex !== -1) {
        endIndex = cursorIndex;
      }
    }

    const startIndex = Math.max(0, endIndex - limit);
    const slicedPath = path.slice(startIndex, endIndex);
    
    // If we reached the start (startIndex is 0), there is no next cursor
    const nextCursor = startIndex > 0 ? slicedPath[0] : null;

    if (slicedPath.length === 0) return { messages: [], nextCursor: null }

    // Optimized: Only fetch messages that are in the path using IN clause
    const placeholders = slicedPath.map(() => '?').join(',')
    const messages = await db.prepare(
      `SELECT * FROM messages WHERE id IN (${placeholders})`
    ).bind(...slicedPath).all()
    
    const msgMap = new Map(messages.results.map((m: any) => [m.id as string, m]))
    
    // Return messages in path order
    const orderedMessages = slicedPath.map(id => {
      const m = msgMap.get(id)
      if (!m) return null
      return {
        ...m,
        attachments: JSON.parse(m.attachments as string || '[]'),
        referencedConversations: JSON.parse(m.referencedConversations as string || '[]'),
        referencedFolders: JSON.parse(m.referencedFolders as string || '[]'),
        timestamp: m.createdAt, // Populate timestamp alias
        versionNumber: m.versionNumber || 1, // Default to 1
        reasoning_metadata: m.reasoning_metadata ? JSON.parse(m.reasoning_metadata as string) : undefined,
        web_annotations: m.web_annotations ? JSON.parse(m.web_annotations as string) : undefined
      }
    }).filter(Boolean) as CloudMessage[]

    return {
      messages: orderedMessages,
      nextCursor
    }
  },

  async getMessage(messageId: string) {
    const db = getDB()
    const message = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first()
    
    console.log('📥 [cloudDb.getMessage]', {
      messageId,
      found: !!message,
      contentPreview: message?.content ? (message.content as string).substring(0, 50) + '...' : 'N/A',
      contentLength: message?.content ? (message.content as string).length : 0
    });
    
    if (!message) return null
    return {
      ...message,
      attachments: JSON.parse(message.attachments as string || '[]'),
      referencedConversations: JSON.parse(message.referencedConversations as string || '[]'),
      referencedFolders: JSON.parse(message.referencedFolders as string || '[]'),
      reasoning_metadata: message.reasoning_metadata ? JSON.parse(message.reasoning_metadata as string) : undefined,
      web_annotations: message.web_annotations ? JSON.parse(message.web_annotations as string) : undefined,
      timestamp: message.createdAt,
      versionNumber: message.versionNumber || 1
    } as CloudMessage
  },

  async addMessage(conversationId: string, message: any) {
    const db = getDB()
    // Use provided ID if specified, otherwise generate new one
    const id = message.id || crypto.randomUUID()
    const now = Date.now()
    
    // Get conversation data once
    const conversation = await db.prepare('SELECT path, branches, activeBranchId FROM conversations WHERE id = ?').bind(conversationId).first()
    
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    const activeBranchId = conversation.activeBranchId as string | undefined
    const path = JSON.parse(conversation.path as string || '[]') as string[]
    let branches = JSON.parse(conversation.branches as string || '[]')
    
    // Update paths
    path.push(id)
    
    if (activeBranchId && branches.length > 0) {
      const activeBranch = branches.find((b: any) => b.id === activeBranchId)
      if (activeBranch) {
        activeBranch.path.push(id)
      }
    }

    // Batch the insert and update
    await db.batch([
      db.prepare(
        'INSERT INTO messages (id, conversationId, role, content, attachments, referencedConversations, referencedFolders, timestamp, createdAt, versionNumber, branchId, reasoning_content, reasoning_metadata, web_annotations, model_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        id, 
        conversationId, 
        message.role, 
        message.content, 
        JSON.stringify(message.attachments || []),
        JSON.stringify(message.referencedConversations || []),
        JSON.stringify(message.referencedFolders || []),
        now,
        now,
        1, // Default version 1
        activeBranchId || null,
        message.reasoning_content || null,
        message.reasoning_metadata ? JSON.stringify(message.reasoning_metadata) : null,
        message.web_annotations ? JSON.stringify(message.web_annotations) : null,
        message.model_used || null
      ),
      db.prepare('UPDATE conversations SET path = ?, branches = ?, updatedAt = ? WHERE id = ?').bind(JSON.stringify(path), JSON.stringify(branches), now, conversationId)
    ])

    return { ...message, id, timestamp: now, versionNumber: 1, branchId: activeBranchId }
  },

  async updateMessage(messageId: string, updates: any) {
    const db = getDB()
    
    // Filter out undefined values - D1 doesn't support them
    const filteredUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value
      }
      return acc
    }, {} as any)
    
    const keys = Object.keys(filteredUpdates)
    if (keys.length === 0) return
    
    const setClause = keys.map(k => `${k} = ?`).join(', ')
    const values = keys.map(k => {
      const val = filteredUpdates[k]
      // Handle JSON fields
      if (['attachments', 'referencedConversations', 'referencedFolders', 'reasoning_metadata', 'web_annotations'].includes(k)) {
        return val === null ? null : JSON.stringify(val)
      }
      return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val
    })
    
    await db.prepare(`UPDATE messages SET ${setClause} WHERE id = ?`).bind(...values, messageId).run()
  },

  async updateConversation(conversationId: string, updates: any) {
    const db = getDB()
    const keys = Object.keys(updates)
    if (keys.length === 0) return

    const setClause = keys.map(k => `${k} = ?`).join(', ')
    const values = keys.map(k => {
      const val = updates[k]
      return (typeof val === 'object') ? JSON.stringify(val) : val
    })
    
    // Always update updatedAt
    await db.prepare(`UPDATE conversations SET ${setClause}, updatedAt = ? WHERE id = ?`).bind(...values, Date.now(), conversationId).run()
  },

  async updateCredits(userId: string, amount: number) {
    const db = getDB()
    // amount can be negative to deduct
    await db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(amount, userId).run()
  },

  async deleteConversation(conversationId: string) {
    const db = getDB()
    // Delete conversation (cascade should handle messages if set up, but D1 foreign keys might need explicit enable)
    // PRAGMA foreign_keys = ON; is needed in D1 usually, or we delete manually.
    // Let's delete manually to be safe.
    await db.prepare('DELETE FROM messages WHERE conversationId = ?').bind(conversationId).run()
    await db.prepare('DELETE FROM conversations WHERE id = ?').bind(conversationId).run()
  },
  
  async getUserCredits(userId: string) {
    const db = getDB()
    const user = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(userId).first()
    return user?.credits as number || 0
  },

  // Helper function to find all descendant messages (messages that follow this one)
  async findDescendants(conversationId: string, messageId: string): Promise<string[]> {
    const db = getDB()
    
    // Get all messages in this conversation
    const allMessages = await db.prepare(
      'SELECT id, parentMessageId FROM messages WHERE conversationId = ?'
    ).bind(conversationId).all()
    
    const messageMap = new Map<string, string[]>() // parentId -> [childIds]
    
    // Build parent-child map
    for (const msg of allMessages.results) {
      const parentId = msg.parentMessageId as string | null
      if (parentId) {
        if (!messageMap.has(parentId)) {
          messageMap.set(parentId, [])
        }
        messageMap.get(parentId)!.push(msg.id as string)
      }
    }
    
    // Recursively find all descendants
    const descendants: string[] = []
    const queue = [messageId]
    const visited = new Set<string>()
    
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      
      const children = messageMap.get(current) || []
      for (const child of children) {
        descendants.push(child)
        queue.push(child)
      }
    }
    
    return descendants
  },

  async deleteMessage(conversationId: string, messageId: string) {
    const db = getDB()
    
    // Get conversation with branches
    const conversation = await db.prepare('SELECT path, branches FROM conversations WHERE id = ?')
      .bind(conversationId).first()
    if (!conversation) return
    
    const currentPath = JSON.parse(conversation.path as string || '[]') as string[]
    const messageIndex = currentPath.indexOf(messageId)
    
    if (messageIndex === -1) return // Message not in path
    
    // Get all versions of this message
    const versions = await this.getMessageVersions(messageId)
    
    // Find another version (not the one being deleted)
    const otherVersion = versions.find(v => v.id !== messageId)
    
    let newPath: string[]
    let newActiveBranchId: string | undefined | null
    
    if (otherVersion) {
      // Try to find branches containing the other version
      const branches = JSON.parse(conversation.branches as string || '[]')
      const matchingBranches = branches.filter((b: any) => b.path.includes(otherVersion.id))
      
      if (matchingBranches.length > 0) {
        // Pick the best branch: prefer longer branches, then more recent
        const targetBranch = matchingBranches.sort((a: any, b: any) => {
          if (a.path.length !== b.path.length) {
            return b.path.length - a.path.length // Longer branch first
          }
          return b.createdAt - a.createdAt // More recent first
        })[0]
        
        newPath = targetBranch.path
        newActiveBranchId = targetBranch.id
      } else {
        // No branch found - reconstruct path with version and its descendants
        newPath = currentPath.slice(0, messageIndex)
        newPath.push(otherVersion.id)
        
        // Find all descendant messages
        const descendants = await this.findDescendants(conversationId, otherVersion.id)
        newPath.push(...descendants)
        
        newActiveBranchId = otherVersion.branchId || null
      }
    } else {
      // No other versions - truncate
      newPath = currentPath.slice(0, messageIndex)
      newActiveBranchId = null
    }
    
    // Delete messages from old path (from deletion point onwards)
    const messagesToDelete = currentPath.slice(messageIndex)
    for (const msgId of messagesToDelete) {
      await db.prepare('DELETE FROM messages WHERE id = ?').bind(msgId).run()
    }
    
    // Update conversation with new path and active branch
    if (newActiveBranchId) {
      await db.prepare('UPDATE conversations SET path = ?, activeBranchId = ?, updatedAt = ? WHERE id = ?')
        .bind(JSON.stringify(newPath), newActiveBranchId, Date.now(), conversationId).run()
    } else {
      await db.prepare('UPDATE conversations SET path = ?, activeBranchId = NULL, updatedAt = ? WHERE id = ?')
        .bind(JSON.stringify(newPath), Date.now(), conversationId).run()
    }
  },

  async getAllTags(userId: string) {
    const db = getDB()
    const results = await db.prepare('SELECT tags FROM conversations WHERE userId = ?').bind(userId).all()
    const tags = new Set<string>()
    results.results.forEach((r: any) => {
      const t = JSON.parse(r.tags as string || '[]') as string[]
      t.forEach(tag => tags.add(tag))
    })
    return Array.from(tags)
  },

  async createMessageVersion(
    conversationId: string,
    messageId: string,
    newContent: string,
    newAttachments?: any[],
    referencedConversations?: any[],
    referencedFolders?: any[]
  ) {
    const db = getDB()
    
    // 1. Get original message
    const originalMessage = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first()
    if (!originalMessage) throw new Error(`Message ${messageId} not found`)
      
    // 2. Get conversation
    const conversation = await db.prepare('SELECT * FROM conversations WHERE id = ?').bind(conversationId).first()
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`)
      
    const path = JSON.parse(conversation.path as string || '[]') as string[]
    const messageIndex = path.indexOf(messageId)
    if (messageIndex === -1) throw new Error('Message not found in conversation path')
      
    // 3. Create new message version
    const newMessageId = crypto.randomUUID()
    const now = Date.now()
    const originalVersionNumber = (originalMessage.versionNumber as number) || 1
    const newVersionNumber = originalVersionNumber + 1
    
    // 4. Handle Branching Logic
    // This logic mimics the IndexedDB implementation
    
    // Create IDs for branches
    const originalBranchId = (originalMessage.branchId as string) || crypto.randomUUID() // Use existing or new
    const newBranchId = crypto.randomUUID()
    
    // Define branches
    const originalPath = [...path]
    const newPath = path.slice(0, messageIndex)
    newPath.push(newMessageId)
    
    const originalBranch = {
      id: originalBranchId,
      name: `Branch from v${originalVersionNumber}`,
      path: originalPath,
      createdAt: now,
      parentVersionId: messageId
    }
    
    const newBranch = {
      id: newBranchId,
      name: `Branch from v${newVersionNumber}`,
      path: newPath,
      createdAt: now,
      parentVersionId: messageId
    }
    
    // 5. Save new message
    await db.prepare(
      'INSERT INTO messages (id, conversationId, role, content, attachments, referencedConversations, referencedFolders, timestamp, createdAt, versionNumber, versionOf, parentMessageId, branchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      newMessageId,
      conversationId,
      originalMessage.role,
      newContent,
      JSON.stringify(newAttachments || JSON.parse(originalMessage.attachments as string || '[]')),
      JSON.stringify(referencedConversations || JSON.parse(originalMessage.referencedConversations as string || '[]')),
      JSON.stringify(referencedFolders || JSON.parse(originalMessage.referencedFolders as string || '[]')),
      now,
      now,
      newVersionNumber,
      (originalMessage.versionOf as string) || messageId,
      messageId,
      newBranchId
    ).run()
    
    // 6. Update original message branchId if it was null (implicit main branch)
    if (!originalMessage.branchId) {
       await db.prepare('UPDATE messages SET branchId = ? WHERE id = ?').bind(originalBranchId, messageId).run()
       // Also update all messages in the original path to have this branchId if they don't have one?
       // For simplicity, we might skip bulk update unless necessary for strict consistency.
       // The IndexedDB implementation updated ALL messages in path.
       // Let's try to update at least the ones in the path.
       // But doing a loop of updates is slow.
       // We can leave them as is, relying on the branch record's path.
    }
    
    // 7. Update Conversation
    let branches = JSON.parse(conversation.branches as string || '[]')
    
    // Only add original branch if it doesn't already exist (prevents duplicates after deletion)
    const originalBranchExists = branches.some((b: any) => b.id === originalBranchId)
    if (!originalBranchExists) {
      branches.push(originalBranch)
    }
    
    branches.push(newBranch)
    
    // Prune old branches to prevent unbounded growth
    const MAX_BRANCHES = 20
    if (branches.length > MAX_BRANCHES) {
      // Keep most recent branches (sorted by createdAt)
      branches.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
      branches = branches.slice(0, MAX_BRANCHES)
    }
    
    await db.prepare(
      'UPDATE conversations SET path = ?, branches = ?, activeBranchId = ?, updatedAt = ? WHERE id = ?'
    ).bind(
      JSON.stringify(newPath),
      JSON.stringify(branches),
      newBranchId,
      now,
      conversationId
    ).run()
    
    
    // VERIFY INSERT
    const verifyMsg = await db.prepare('SELECT content, id FROM messages WHERE id = ?').bind(newMessageId).first()
    console.log('🔍 [createMessageVersion] VERIFY INSERT:', {
      id: newMessageId,
      found: !!verifyMsg,
      content: verifyMsg?.content,
      expectedContent: newContent
    })

    // VERIFY PATH UPDATE
    const verifyConv = await db.prepare('SELECT path FROM conversations WHERE id = ?').bind(conversationId).first()
    console.log('🔍 [createMessageVersion] VERIFY PATH:', {
      conversationId,
      path: verifyConv?.path,
      expectedPathEnd: newMessageId
    })
    
    return {
      newMessage: {
        id: newMessageId,
        conversationId,
        role: originalMessage.role as 'user' | 'assistant' | 'system',
        content: newContent,  // ✅ NEW content
        attachments: newAttachments || JSON.parse(originalMessage.attachments as string || '[]'),
        referencedConversations: referencedConversations || JSON.parse(originalMessage.referencedConversations as string || '[]'),
        referencedFolders: referencedFolders || JSON.parse(originalMessage.referencedFolders as string || '[]'),
        timestamp: now,
        createdAt: now,
        userId: originalMessage.userId as string,
        versionNumber: newVersionNumber,
        versionOf: (originalMessage.versionOf as string) || messageId,
        branchId: newBranchId,
        parentMessageId: messageId
      },
      conversationPath: newPath
    }
  },

  async getMessageVersions(originalMessageId: string) {
    const db = getDB()
    // Find the root version ID
    const message = await db.prepare('SELECT versionOf, id FROM messages WHERE id = ?').bind(originalMessageId).first()
    if (!message) return []
    
    const rootId = (message.versionOf as string) || message.id as string
    
    // Get all messages with this root ID (including the root itself)
    const versions = await db.prepare(
      'SELECT * FROM messages WHERE versionOf = ? OR id = ? ORDER BY versionNumber ASC'
    ).bind(rootId, rootId).all()
    
    return versions.results.map((m: any) => ({
      ...m,
      attachments: JSON.parse(m.attachments as string || '[]'),
      referencedConversations: JSON.parse(m.referencedConversations as string || '[]'),
      referencedFolders: JSON.parse(m.referencedFolders as string || '[]'),
      reasoning_metadata: m.reasoning_metadata ? JSON.parse(m.reasoning_metadata as string) : undefined,
      web_annotations: m.web_annotations ? JSON.parse(m.web_annotations as string) : undefined
    })) as CloudMessage[]
  },

  async switchToMessageVersion(conversationId: string, versionMessageId: string) {
    const db = getDB()
    
    const conversation = await db.prepare('SELECT * FROM conversations WHERE id = ?').bind(conversationId).first()
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`)
      
    const message = await db.prepare('SELECT branchId FROM messages WHERE id = ?').bind(versionMessageId).first()
    if (!message) throw new Error(`Message ${versionMessageId} not found`)
      
    const branches = JSON.parse(conversation.branches as string || '[]')
    const targetBranchId = message.branchId as string
    
    let newPath: string[] = []
    let activeBranchId = targetBranchId
    
    if (targetBranchId) {
      const branch = branches.find((b: any) => b.id === targetBranchId)
      if (branch) {
        newPath = branch.path
      } else {
        // Fallback: try to find a branch that contains this message
        const containingBranch = branches.find((b: any) => b.path.includes(versionMessageId))
        if (containingBranch) {
          newPath = containingBranch.path
          activeBranchId = containingBranch.id
        }
      }
    }
    
    if (newPath.length === 0) {
      // Fallback if no branch info found (shouldn't happen if created correctly)
      // Just use current path but truncated? No, that's dangerous.
      console.warn('Could not find branch for version, aborting switch')
      return
    }
    
    await db.prepare(
      'UPDATE conversations SET path = ?, activeBranchId = ?, updatedAt = ? WHERE id = ?'
    ).bind(
      JSON.stringify(newPath),
      activeBranchId,
      Date.now(),
      conversationId
    ).run()
  },

  // --- Embeddings ---

  async addEmbedding(messageId: string, conversationId: string, userId: string, content: string, vector: number[]) {
    const db = getDB()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO embeddings (messageId, conversationId, userId, content, vector, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    await stmt.bind(messageId, conversationId, userId, content, JSON.stringify(vector), Date.now()).run()
  },

  async getEmbeddingsByConversationIds(conversationIds: string[]): Promise<CloudEmbedding[]> {
    if (conversationIds.length === 0) return []
    
    const db = getDB()
    const placeholders = conversationIds.map(() => '?').join(',')
    const result = await db.prepare(
      `SELECT * FROM embeddings WHERE conversationId IN (${placeholders}) ORDER BY timestamp DESC`
    ).bind(...conversationIds).all()

    return result.results.map((row: any) => ({
      ...row,
      vector: JSON.parse(row.vector as string)
    })) as CloudEmbedding[]
  },

  async getEmbeddingByMessageId(messageId: string): Promise<CloudEmbedding | null> {
    const db = getDB()
    const result = await db.prepare('SELECT * FROM embeddings WHERE messageId = ?').bind(messageId).first()

    if (!result) return null

    return {
      ...(result as any),
      vector: JSON.parse((result as any).vector)
    } as CloudEmbedding
  },

  async branchConversation(sourceConversationId: string, branchFromMessageId: string) {
    try {
      const db = getDB()
      if (!db) {
        console.error('Database binding (process.env.DB) is missing')
        throw new Error('Database binding not found')
      }
      
      if (typeof crypto === 'undefined' || !crypto.randomUUID) {
        console.error('Crypto API is missing')
        throw new Error('Crypto API not available')
      }
      
      // 1. Get source conversation
      const sourceConversation = await db.prepare('SELECT * FROM conversations WHERE id = ?').bind(sourceConversationId).first()
      if (!sourceConversation) {
        throw new Error(`Source conversation ${sourceConversationId} not found`)
      }
  
      const sourcePath = JSON.parse(sourceConversation.path as string || '[]') as string[]
      const branchPointIndex = sourcePath.indexOf(branchFromMessageId)
      
      if (branchPointIndex === -1) {
        throw new Error('Branch point message not found in conversation path')
      }
  
      // 2. Get messages to copy
      const messageIdsToCopy = sourcePath.slice(0, branchPointIndex + 1)
      
      // 3. Create new conversation
      const newConversationId = crypto.randomUUID()
      const userId = sourceConversation.userId as string
      const now = Date.now()
      const newTitle = `Branch: ${sourceConversation.title}`
      
      // 4. Prepare new message IDs and path
      const newPath: string[] = []
      const messageIdMap = new Map<string, string>() // oldId -> newId
      
      for (const oldMsgId of messageIdsToCopy) {
        const newMsgId = crypto.randomUUID()
        newPath.push(newMsgId)
        messageIdMap.set(oldMsgId, newMsgId)
      }

      // 5. Insert new conversation (must be done BEFORE messages due to Foreign Key)
      await db.prepare(
        'INSERT INTO conversations (id, userId, projectId, title, path, tags, isPinned, branches, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        newConversationId,
        userId,
        sourceConversation.projectId,
        newTitle,
        JSON.stringify(newPath),
        sourceConversation.tags, // Copy tags
        0, // Not pinned
        '[]', // No branches initially
        now,
        now
      ).run()
      
      // 6. Copy messages
      // Optimization: Fetch messages by ID from the path to ensure we get the exact messages in the correct order
      const placeholders = messageIdsToCopy.map(() => '?').join(',')
      const messagesToCopy = await db.prepare(
        `SELECT * FROM messages WHERE id IN (${placeholders})`
      ).bind(...messageIdsToCopy).all()
      
      const sourceMsgMap = new Map(messagesToCopy.results.map((m: any) => [m.id as string, m]))
  
      let previousNewMsgId: string | null = null
  
      for (const oldMsgId of messageIdsToCopy) {
        const oldMsg = sourceMsgMap.get(oldMsgId)
        if (!oldMsg) {
          console.warn(`Message ${oldMsgId} not found in DB, skipping copy`)
          continue
        }
  
        const newMsgId = messageIdMap.get(oldMsgId)!
  
        await db.prepare(
          'INSERT INTO messages (id, conversationId, role, content, attachments, referencedConversations, referencedFolders, timestamp, createdAt, versionNumber, versionOf, branchId, parentMessageId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          newMsgId,
          newConversationId,
          oldMsg.role,
          oldMsg.content,
          oldMsg.attachments, // Keep original attachments (JSON string)
          oldMsg.referencedConversations,
          oldMsg.referencedFolders,
          now,
          now,
          1, // versionNumber - reset to 1 for branched conversation
          null, // versionOf - null for root messages
          null, // branchId - null initially
          previousNewMsgId // Link to previous message in the new chain
        ).run()
  
        previousNewMsgId = newMsgId
      }
  
      return {
        id: newConversationId,
        userId,
        projectId: sourceConversation.projectId,
        title: newTitle,
        path: newPath,
        tags: JSON.parse(sourceConversation.tags as string || '[]'),
        isPinned: false,
        branches: [],
        createdAt: now,
        updatedAt: now
      } as CloudConversation
    } catch (error) {
      console.error('Error in branchConversation:', error)
      throw error
    }
  },

  // Folder management
  async getFolders(userId: string): Promise<Folder[]> {
    const db = getDB()
    
    // Get all folders for user
    const folders = await db.prepare('SELECT * FROM folders WHERE userId = ? ORDER BY updatedAt DESC').bind(userId).all()
    
    if (folders.results.length === 0) return []

    // Get all conversation IDs for these folders in one query
    const folderIds = folders.results.map((f: any) => f.id)
    const placeholders = folderIds.map(() => '?').join(',')
    
    const allFolderConvs = await db.prepare(
      `SELECT folderId, conversationId FROM folder_conversations WHERE folderId IN (${placeholders})`
    ).bind(...folderIds).all()
    
    // Group by folderId
    const convsByFolder = new Map<string, string[]>()
    allFolderConvs.results.forEach((row: any) => {
      const fid = row.folderId as string
      if (!convsByFolder.has(fid)) {
        convsByFolder.set(fid, [])
      }
      convsByFolder.get(fid)!.push(row.conversationId as string)
    })
    
    return folders.results.map((folder: any) => ({
      id: folder.id as string,
      userId: folder.userId as string,
      name: folder.name as string,
      description: folder.description as string | undefined,
      createdAt: new Date(folder.createdAt as string).getTime(),
      updatedAt: new Date(folder.updatedAt as string).getTime(),
      conversationIds: convsByFolder.get(folder.id as string) || []
    }))
  },

  async getFolder(folderId: string): Promise<Folder | null> {
    const db = getDB()
    
    const folder = await db.prepare('SELECT * FROM folders WHERE id = ?').bind(folderId).first()
    if (!folder) return null
    
    // Get conversation IDs for this folder
    const folderConvs = await db.prepare(
      'SELECT conversationId FROM folder_conversations WHERE folderId = ?'
    ).bind(folderId).all()
    
    const conversationIds = folderConvs.results.map((row: any) => row.conversationId as string)
    
    return {
      id: folder.id as string,
      userId: folder.userId as string,
      name: folder.name as string,
      description: folder.description as string | undefined,
      createdAt: new Date(folder.createdAt as string).getTime(),
      updatedAt: new Date(folder.updatedAt as string).getTime(),
      conversationIds
    }
  },

  async createFolder(userId: string, name: string, description?: string, conversationIds?: string[]): Promise<Folder> {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    
    await db.prepare(
      'INSERT INTO folders (id, userId, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, name, description || null, now, now).run()
    
    // Add conversations if provided
    if (conversationIds && conversationIds.length > 0) {
      const batch = conversationIds.map(convId =>
        db.prepare('INSERT INTO folder_conversations (folderId, conversationId) VALUES (?, ?)').bind(id, convId)
      )
      await db.batch(batch)
    }
    
    return {
      id,
      userId,
      name,
      description,
      createdAt: new Date(now).getTime(),
      updatedAt: new Date(now).getTime(),
      conversationIds: conversationIds || []
    }
  },

  async updateFolder(folderId: string, updates: Partial<Folder>): Promise<void> {
    const db = getDB()
    const now = new Date().toISOString()
    
    const fields: string[] = []
    const values: any[] = []
    
    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    
    fields.push('updatedAt = ?')
    values.push(now)
    values.push(folderId)
    
    if (fields.length > 1) { // More than just updatedAt
      await db.prepare(
        `UPDATE folders SET ${fields.join(', ')} WHERE id = ?`
      ).bind(...values).run()
    }
  },

  async deleteFolder(folderId: string): Promise<void> {
    const db = getDB()
    // Cascade delete handled by foreign key
    await db.prepare('DELETE FROM folders WHERE id = ?').bind(folderId).run()
  },

  async addConversationToFolder(folderId: string, conversationId: string): Promise<void> {
    const db = getDB()
    await db.prepare('INSERT OR IGNORE INTO folder_conversations (folderId, conversationId) VALUES (?, ?)').bind(folderId, conversationId).run()
  },

  async removeConversationFromFolder(folderId: string, conversationId: string): Promise<void> {
    const db = getDB()
    await db.prepare('DELETE FROM folder_conversations WHERE folderId = ? AND conversationId = ?').bind(folderId, conversationId).run()
  },

  // Project management
  async getProjects(userId: string): Promise<Project[]> {
    const db = getDB()
    const projects = await db.prepare('SELECT * FROM projects WHERE userId = ? ORDER BY updatedAt DESC').bind(userId).all()
    
    return projects.results.map((p: any) => ({
      id: p.id as string,
      userId: p.userId as string,
      name: p.name as string,
      description: p.description as string,
      instructions: p.instructions as string | undefined,
      attachments: p.attachments ? JSON.parse(p.attachments as string) : undefined,
      createdAt: new Date(p.createdAt as string).getTime(),
      updatedAt: new Date(p.updatedAt as string).getTime()
    }))
  },

  async getProject(projectId: string): Promise<Project | null> {
    const db = getDB()
    const result = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first()
    if (!result) return null
    
    return {
      id: result.id as string,
      userId: result.userId as string,
      name: result.name as string,
      description: result.description as string,
      instructions: result.instructions as string | undefined,
      attachments: result.attachments ? JSON.parse(result.attachments as string) : undefined,
      createdAt: new Date(result.createdAt as string).getTime(),
      updatedAt: new Date(result.updatedAt as string).getTime()
    }
  },

  async createProject(userId: string, name: string, description: string, instructions?: string, attachments?: any[]): Promise<Project> {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    
    await db.prepare(
      'INSERT INTO projects (id, userId, name, description, instructions, attachments, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      userId,
      name,
      description,
      instructions || null,
      attachments ? JSON.stringify(attachments) : null,
      now,
      now
    ).run()
    
    return {
      id,
      userId,
      name,
      description,
      instructions,
      attachments,
      createdAt: new Date(now).getTime(),
      updatedAt: new Date(now).getTime()
    }
  },

  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    const db = getDB()
    const now = new Date().toISOString()
    
    const fields: string[] = []
    const values: any[] = []
    
    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.instructions !== undefined) {
      fields.push('instructions = ?')
      values.push(updates.instructions)
    }
    if (updates.attachments !== undefined) {
      fields.push('attachments = ?')
      values.push(JSON.stringify(updates.attachments))
    }
    
    fields.push('updatedAt = ?')
    values.push(now)
    values.push(projectId)
    
    if (fields.length > 1) {
      await db.prepare(
        `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`
      ).bind(...values).run()
    }
  },

  async deleteProject(projectId: string): Promise<void> {
    const db = getDB()
    // Set projectId to NULL for conversations (handled by ON DELETE SET NULL foreign key)
    await db.prepare('DELETE FROM projects WHERE id = ?').bind(projectId).run()
  },

  // --- Subscription Management ---

  async getSubscription(userId: string) {
    const db = getDB()
    const user = await db.prepare(`
      SELECT 
        subscriptionTier,
        subscriptionStatus,
        credits,
        carryoverCredits,
        creditsResetAt,
        polarCustomerId,
        polarSubscriptionId
      FROM users 
      WHERE id = ?
    `).bind(userId).first()
    
    if (!user) return null
    
    return {
      tier: (user.subscriptionTier as string) || 'free',
      status: (user.subscriptionStatus as string) || 'none',
      credits: (user.credits as number) || 0,
      carryoverCredits: (user.carryoverCredits as number) || 0,
      creditsResetAt: user.creditsResetAt as string | null,
      polarCustomerId: user.polarCustomerId as string | null,
      polarSubscriptionId: user.polarSubscriptionId as string | null
    }
  },

  async updateSubscription(userId: string, updates: {
    tier?: string
    polarCustomerId?: string
    polarSubscriptionId?: string | null
    subscriptionStatus?: string
    credits?: number
    creditsResetAt?: string
    carryoverCredits?: number
  }) {
    const db = getDB()
    
    const fields: string[] = []
    const values: any[] = []
    
    if (updates.tier !== undefined) {
      fields.push('subscriptionTier = ?')
      values.push(updates.tier)
    }
    if (updates.polarCustomerId !== undefined) {
      fields.push('polarCustomerId = ?')
      values.push(updates.polarCustomerId)
    }
    if (updates.polarSubscriptionId !== undefined) {
      fields.push('polarSubscriptionId = ?')
      values.push(updates.polarSubscriptionId)
    }
    if (updates.subscriptionStatus !== undefined) {
      fields.push('subscriptionStatus = ?')
      values.push(updates.subscriptionStatus)
    }
    if (updates.credits !== undefined) {
      fields.push('credits = ?')
      values.push(updates.credits)
    }
    if (updates.creditsResetAt !== undefined) {
      fields.push('creditsResetAt = ?')
      values.push(updates.creditsResetAt)
    }
    if (updates.carryoverCredits !== undefined) {
      fields.push('carryoverCredits = ?')
      values.push(updates.carryoverCredits)
    }
    
    if (fields.length === 0) return
    
    fields.push('updatedAt = CURRENT_TIMESTAMP')
    values.push(userId)
    
    await db.prepare(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run()
  },

  /**
   * Get users whose credits are due for monthly reset.
   * Used by the credit reset cron worker.
   */
  async getUsersDueForReset(): Promise<Array<{
    id: string
    subscriptionTier: string
    credits: number
    carryoverCredits: number
  }>> {
    const db = getDB()
    const now = new Date().toISOString()
    
    const results = await db.prepare(`
      SELECT id, subscriptionTier, credits, carryoverCredits
      FROM users
      WHERE creditsResetAt IS NOT NULL
        AND creditsResetAt <= ?
        AND subscriptionStatus = 'active'
    `).bind(now).all()
    
    return results.results.map((u: any) => ({
      id: u.id,
      subscriptionTier: u.subscriptionTier || 'free',
      credits: u.credits || 0,
      carryoverCredits: u.carryoverCredits || 0
    }))
  },

  /**
   * Reset credits for a user based on their tier.
   * - free: 100 credits
   * - standard: 2500 credits (no carryover)
   * - standard_plus: add 2500 credits (carryover allowed)
   */
  async resetUserCredits(userId: string, tier: string, maxCredits: number = 10000) {
    const db = getDB()
    
    // Calculate next reset date (1 month from now)
    const nextReset = new Date()
    nextReset.setMonth(nextReset.getMonth() + 1)
    
    if (tier === 'free') {
      // Free tier: reset to 100
      await db.prepare(`
        UPDATE users SET 
          credits = 100,
          carryoverCredits = 0,
          creditsResetAt = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(nextReset.toISOString(), userId).run()
    } else if (tier === 'standard') {
      // Standard tier: reset to 2500 (no carryover)
      await db.prepare(`
        UPDATE users SET 
          credits = 2500,
          carryoverCredits = 0,
          creditsResetAt = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(nextReset.toISOString(), userId).run()
    } else if (tier === 'standard_plus') {
      // Standard+ tier: add 2500, carryover allowed (with cap)
      await db.prepare(`
        UPDATE users SET 
          credits = MIN(credits + 2500, ?),
          creditsResetAt = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(maxCredits, nextReset.toISOString(), userId).run()
    }
    
    console.log(`✅ [cloudDb] Reset credits for user ${userId} (tier: ${tier})`)
  },

  // --- Sub-Chats ---

  async getSubChats(conversationId: string): Promise<SubChat[]> {
    const db = getDB()
    const results = await db.prepare(
      'SELECT * FROM sub_chats WHERE conversationId = ? ORDER BY createdAt DESC'
    ).bind(conversationId).all()

    return results.results.map((s: any) => ({
      id: s.id as string,
      conversationId: s.conversationId as string,
      sourceMessageId: s.sourceMessageId as string,
      quotedText: s.quotedText as string,
      fullMessageContent: s.fullMessageContent as string,
      messages: JSON.parse(s.messages as string || '[]'),
      createdAt: new Date(s.createdAt as string).getTime(),
      updatedAt: new Date(s.updatedAt as string).getTime()
    }))
  },

  async getSubChat(subChatId: string): Promise<SubChat | null> {
    const db = getDB()
    const result = await db.prepare('SELECT * FROM sub_chats WHERE id = ?').bind(subChatId).first()
    if (!result) return null

    return {
      id: result.id as string,
      conversationId: result.conversationId as string,
      sourceMessageId: result.sourceMessageId as string,
      quotedText: result.quotedText as string,
      fullMessageContent: result.fullMessageContent as string,
      messages: JSON.parse(result.messages as string || '[]'),
      createdAt: new Date(result.createdAt as string).getTime(),
      updatedAt: new Date(result.updatedAt as string).getTime()
    }
  },

  async getSubChatsByMessageId(messageId: string): Promise<SubChat[]> {
    const db = getDB()
    const results = await db.prepare(
      'SELECT * FROM sub_chats WHERE sourceMessageId = ? ORDER BY createdAt DESC'
    ).bind(messageId).all()

    return results.results.map((s: any) => ({
      id: s.id as string,
      conversationId: s.conversationId as string,
      sourceMessageId: s.sourceMessageId as string,
      quotedText: s.quotedText as string,
      fullMessageContent: s.fullMessageContent as string,
      messages: JSON.parse(s.messages as string || '[]'),
      createdAt: new Date(s.createdAt as string).getTime(),
      updatedAt: new Date(s.updatedAt as string).getTime()
    }))
  },

  async createSubChat(conversationId: string, sourceMessageId: string, quotedText: string, fullMessageContent: string): Promise<SubChat> {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.prepare(
      'INSERT INTO sub_chats (id, conversationId, sourceMessageId, quotedText, fullMessageContent, messages, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, conversationId, sourceMessageId, quotedText, fullMessageContent, '[]', now, now).run()

    return {
      id,
      conversationId,
      sourceMessageId,
      quotedText,
      fullMessageContent,
      messages: [],
      createdAt: new Date(now).getTime(),
      updatedAt: new Date(now).getTime()
    }
  },

  async addSubChatMessage(subChatId: string, role: 'user' | 'assistant', content: string): Promise<SubChatMessage> {
    const db = getDB()

    // Get current messages
    const subChat = await db.prepare('SELECT messages FROM sub_chats WHERE id = ?').bind(subChatId).first()
    if (!subChat) throw new Error(`SubChat ${subChatId} not found`)

    const messages = JSON.parse(subChat.messages as string || '[]') as SubChatMessage[]

    const newMessage: SubChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      createdAt: Date.now()
    }

    messages.push(newMessage)

    await db.prepare(
      'UPDATE sub_chats SET messages = ?, updatedAt = ? WHERE id = ?'
    ).bind(JSON.stringify(messages), new Date().toISOString(), subChatId).run()

    return newMessage
  },

  async updateSubChatMessage(subChatId: string, messageId: string, content: string): Promise<void> {
    const db = getDB()

    const subChat = await db.prepare('SELECT messages FROM sub_chats WHERE id = ?').bind(subChatId).first()
    if (!subChat) throw new Error(`SubChat ${subChatId} not found`)

    const messages = JSON.parse(subChat.messages as string || '[]') as SubChatMessage[]
    const messageIndex = messages.findIndex(m => m.id === messageId)

    if (messageIndex !== -1) {
      messages[messageIndex].content = content

      await db.prepare(
        'UPDATE sub_chats SET messages = ?, updatedAt = ? WHERE id = ?'
      ).bind(JSON.stringify(messages), new Date().toISOString(), subChatId).run()
    }
  },

  async deleteSubChat(subChatId: string): Promise<void> {
    const db = getDB()
    await db.prepare('DELETE FROM sub_chats WHERE id = ?').bind(subChatId).run()
  },

  // --- Surface Sub-Chats (for surfaces and learning pages) ---

  async getSurfaceSubChats(userId: string, sourceType: 'surface' | 'learning', sourceId: string): Promise<SurfaceSubChat[]> {
    const db = getDB()
    const results = await db.prepare(
      'SELECT * FROM surface_sub_chats WHERE userId = ? AND sourceType = ? AND sourceId = ? ORDER BY createdAt DESC'
    ).bind(userId, sourceType, sourceId).all()

    return results.results.map((s: any) => ({
      id: s.id as string,
      userId: s.userId as string,
      sourceType: s.sourceType as 'surface' | 'learning',
      sourceId: s.sourceId as string,
      sectionId: s.sectionId as string | undefined,
      quotedText: s.quotedText as string,
      sourceContent: s.sourceContent as string | undefined,
      messages: JSON.parse(s.messages as string || '[]'),
      createdAt: new Date(s.createdAt as string).getTime(),
      updatedAt: new Date(s.updatedAt as string).getTime()
    }))
  },

  async getSurfaceSubChat(subChatId: string): Promise<SurfaceSubChat | null> {
    const db = getDB()
    const result = await db.prepare('SELECT * FROM surface_sub_chats WHERE id = ?').bind(subChatId).first()
    if (!result) return null

    return {
      id: result.id as string,
      userId: result.userId as string,
      sourceType: result.sourceType as 'surface' | 'learning',
      sourceId: result.sourceId as string,
      sectionId: result.sectionId as string | undefined,
      quotedText: result.quotedText as string,
      sourceContent: result.sourceContent as string | undefined,
      messages: JSON.parse(result.messages as string || '[]'),
      createdAt: new Date(result.createdAt as string).getTime(),
      updatedAt: new Date(result.updatedAt as string).getTime()
    }
  },

  async getSurfaceSubChatsBySection(userId: string, sourceType: 'surface' | 'learning', sourceId: string, sectionId: string): Promise<SurfaceSubChat[]> {
    const db = getDB()
    const results = await db.prepare(
      'SELECT * FROM surface_sub_chats WHERE userId = ? AND sourceType = ? AND sourceId = ? AND sectionId = ? ORDER BY createdAt DESC'
    ).bind(userId, sourceType, sourceId, sectionId).all()

    return results.results.map((s: any) => ({
      id: s.id as string,
      userId: s.userId as string,
      sourceType: s.sourceType as 'surface' | 'learning',
      sourceId: s.sourceId as string,
      sectionId: s.sectionId as string | undefined,
      quotedText: s.quotedText as string,
      sourceContent: s.sourceContent as string | undefined,
      messages: JSON.parse(s.messages as string || '[]'),
      createdAt: new Date(s.createdAt as string).getTime(),
      updatedAt: new Date(s.updatedAt as string).getTime()
    }))
  },

  async createSurfaceSubChat(
    userId: string,
    sourceType: 'surface' | 'learning',
    sourceId: string,
    quotedText: string,
    sectionId?: string,
    sourceContent?: string
  ): Promise<SurfaceSubChat> {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.prepare(
      'INSERT INTO surface_sub_chats (id, userId, sourceType, sourceId, sectionId, quotedText, sourceContent, messages, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, sourceType, sourceId, sectionId || null, quotedText, sourceContent || null, '[]', now, now).run()

    return {
      id,
      userId,
      sourceType,
      sourceId,
      sectionId,
      quotedText,
      sourceContent,
      messages: [],
      createdAt: new Date(now).getTime(),
      updatedAt: new Date(now).getTime()
    }
  },

  async addSurfaceSubChatMessage(subChatId: string, role: 'user' | 'assistant', content: string): Promise<SubChatMessage> {
    const db = getDB()

    // Get current messages
    const subChat = await db.prepare('SELECT messages FROM surface_sub_chats WHERE id = ?').bind(subChatId).first()
    if (!subChat) throw new Error(`SurfaceSubChat ${subChatId} not found`)

    const messages = JSON.parse(subChat.messages as string || '[]') as SubChatMessage[]

    const newMessage: SubChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      createdAt: Date.now()
    }

    messages.push(newMessage)

    await db.prepare(
      'UPDATE surface_sub_chats SET messages = ?, updatedAt = ? WHERE id = ?'
    ).bind(JSON.stringify(messages), new Date().toISOString(), subChatId).run()

    return newMessage
  },

  async updateSurfaceSubChatMessage(subChatId: string, messageId: string, content: string): Promise<void> {
    const db = getDB()

    const subChat = await db.prepare('SELECT messages FROM surface_sub_chats WHERE id = ?').bind(subChatId).first()
    if (!subChat) throw new Error(`SurfaceSubChat ${subChatId} not found`)

    const messages = JSON.parse(subChat.messages as string || '[]') as SubChatMessage[]
    const messageIndex = messages.findIndex(m => m.id === messageId)

    if (messageIndex !== -1) {
      messages[messageIndex].content = content

      await db.prepare(
        'UPDATE surface_sub_chats SET messages = ?, updatedAt = ? WHERE id = ?'
      ).bind(JSON.stringify(messages), new Date().toISOString(), subChatId).run()
    }
  },

  async deleteSurfaceSubChat(subChatId: string): Promise<void> {
    const db = getDB()
    await db.prepare('DELETE FROM surface_sub_chats WHERE id = ?').bind(subChatId).run()
  },

  // --- Shared Conversations ---

  async createShare(userId: string, conversationId: string, title: string): Promise<SharedConversation> {
    const db = getDB()
    // Generate a short, URL-friendly ID (8 chars)
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    const now = new Date().toISOString()
    
    await db.prepare(
      `INSERT INTO shared_conversations (id, conversationId, userId, title, isActive, viewCount, cloneCount, createdAt) 
       VALUES (?, ?, ?, ?, 1, 0, 0, ?)`
    ).bind(id, conversationId, userId, title, now).run()
    
    return {
      id,
      conversationId,
      userId,
      title,
      isActive: true,
      viewCount: 0,
      cloneCount: 0,
      createdAt: now
    }
  },

  async getShare(shareId: string): Promise<SharedConversation | null> {
    const db = getDB()
    const result = await db.prepare(
      'SELECT * FROM shared_conversations WHERE id = ?'
    ).bind(shareId).first()
    
    if (!result) return null
    return {
      id: result.id as string,
      conversationId: result.conversationId as string,
      userId: result.userId as string,
      title: result.title as string,
      isActive: Boolean(result.isActive),
      viewCount: result.viewCount as number,
      cloneCount: result.cloneCount as number,
      createdAt: result.createdAt as string,
      expiresAt: result.expiresAt as string | undefined
    }
  },

  async getSharesByUserId(userId: string): Promise<SharedConversation[]> {
    const db = getDB()
    const results = await db.prepare(
      'SELECT * FROM shared_conversations WHERE userId = ? ORDER BY createdAt DESC'
    ).bind(userId).all()
    
    return results.results.map((r: any) => ({
      id: r.id,
      conversationId: r.conversationId,
      userId: r.userId,
      title: r.title,
      isActive: Boolean(r.isActive),
      viewCount: r.viewCount,
      cloneCount: r.cloneCount,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt
    }))
  },

  async getShareByConversationId(conversationId: string): Promise<SharedConversation | null> {
    const db = getDB()
    const result = await db.prepare(
      'SELECT * FROM shared_conversations WHERE conversationId = ? AND isActive = 1'
    ).bind(conversationId).first()
    
    if (!result) return null
    return {
      id: result.id as string,
      conversationId: result.conversationId as string,
      userId: result.userId as string,
      title: result.title as string,
      isActive: Boolean(result.isActive),
      viewCount: result.viewCount as number,
      cloneCount: result.cloneCount as number,
      createdAt: result.createdAt as string,
      expiresAt: result.expiresAt as string | undefined
    }
  },

  async incrementShareViewCount(shareId: string): Promise<void> {
    const db = getDB()
    await db.prepare(
      'UPDATE shared_conversations SET viewCount = viewCount + 1 WHERE id = ?'
    ).bind(shareId).run()
  },

  async incrementShareCloneCount(shareId: string): Promise<void> {
    const db = getDB()
    await db.prepare(
      'UPDATE shared_conversations SET cloneCount = cloneCount + 1 WHERE id = ?'
    ).bind(shareId).run()
  },

  async deactivateShare(shareId: string, userId: string): Promise<boolean> {
    const db = getDB()
    const result = await db.prepare(
      'UPDATE shared_conversations SET isActive = 0 WHERE id = ? AND userId = ?'
    ).bind(shareId, userId).run()
    return result.meta.changes > 0
  },

  async deleteShare(shareId: string, userId: string): Promise<boolean> {
    const db = getDB()
    const result = await db.prepare(
      'DELETE FROM shared_conversations WHERE id = ? AND userId = ?'
    ).bind(shareId, userId).run()
    return result.meta.changes > 0
  },

  async cloneConversation(shareId: string, targetUserId: string): Promise<{ conversationId: string }> {
    const db = getDB()
    
    // 1. Get the share
    const share = await this.getShare(shareId)
    if (!share || !share.isActive) {
      throw new Error('Share not found or inactive')
    }
    
    // 2. Get the original conversation
    const originalConversation = await this.getConversation(share.conversationId)
    if (!originalConversation) {
      throw new Error('Original conversation not found')
    }
    
    // 3. Get all messages from the original conversation
    const { messages: originalMessages } = await this.getMessages(share.conversationId, 1000) // Get all messages
    
    // 4. Create new conversation for the target user
    const newConversationId = crypto.randomUUID()
    const now = Date.now()
    const newTitle = `Copy of ${originalConversation.title || 'Shared Chat'}`
    
    await db.prepare(
      'INSERT INTO conversations (id, userId, title, path, tags, isPinned, branches, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(newConversationId, targetUserId, newTitle, '[]', '[]', 0, '[]', now, now).run()
    
    // 5. Clone each message with new IDs
    const newPath: string[] = []
    const idMap = new Map<string, string>() // old ID -> new ID
    
    for (const msg of originalMessages) {
      const newMessageId = crypto.randomUUID()
      idMap.set(msg.id, newMessageId)
      newPath.push(newMessageId)
      
      await db.prepare(
        `INSERT INTO messages (id, conversationId, role, content, attachments, referencedConversations, referencedFolders, timestamp, createdAt, versionNumber, reasoning_content, reasoning_metadata, web_annotations, model_used) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newMessageId,
        newConversationId,
        msg.role,
        msg.content,
        JSON.stringify(msg.attachments || []),
        '[]', // Don't copy referenced conversations (they belong to original user)
        '[]', // Don't copy referenced folders
        now,
        now,
        1,
        msg.reasoning_content || null,
        msg.reasoning_metadata ? JSON.stringify(msg.reasoning_metadata) : null,
        msg.web_annotations ? JSON.stringify(msg.web_annotations) : null,
        msg.model_used || null
      ).run()
    }
    
    // 6. Update conversation path
    await db.prepare(
      'UPDATE conversations SET path = ? WHERE id = ?'
    ).bind(JSON.stringify(newPath), newConversationId).run()
    
    // 7. Increment clone count
    await this.incrementShareCloneCount(shareId)
    
    return { conversationId: newConversationId }
  },

  // --- Learning/Courses (Education Machine) ---

  async getUserCourses(userId: string): Promise<any[]> {
    const db = getDB()
    const results = await db.prepare(`
      SELECT id, title, subtitle, description, difficulty, metadata,
             totalEstimatedTime, totalUnits, totalChapters, totalSections,
             completedSections, currentStreak, longestStreak, lastStreakDate, xp,
             createdAt, updatedAt, lastAccessedAt
      FROM courses 
      WHERE userId = ? 
      ORDER BY lastAccessedAt DESC
    `).bind(userId).all()
    
    return results.results.map((c: any) => {
      const totalSections = c.totalSections || 1
      const completedSections = c.completedSections || 0
      
      // Check if this is a v2 (project-based) course
      let isV2 = false
      let projectCount = 0
      if (c.metadata) {
        try {
          const meta = JSON.parse(c.metadata)
          isV2 = meta.type === 'course-v2' || meta.version === 2
          projectCount = meta.projectCount || 0
        } catch {}
      }
      
      return {
        id: c.id,
        title: c.title,
        description: c.description || c.subtitle || '',
        progress: Math.round((completedSections / totalSections) * 100),
        totalChapters: isV2 ? projectCount : (c.totalChapters || 0),
        completedChapters: Math.floor(completedSections / 3), // Approximate
        lastAccessedAt: new Date(c.lastAccessedAt).getTime(),
        createdAt: new Date(c.createdAt).getTime(),
        difficulty: c.difficulty || 'intermediate',
        isV2,  // Flag for routing to project view
        streak: {
          currentStreak: c.currentStreak || 0,
          lastActivityDate: c.lastStreakDate || null
        }
      }
    })
  },

  async getCourse(courseId: string): Promise<{ metadata: any; progress: any } | null> {
    const db = getDB()
    const result = await db.prepare(`
      SELECT metadata, progress FROM courses WHERE id = ?
    `).bind(courseId).first()
    
    if (!result) return null
    
    return {
      metadata: result.metadata ? JSON.parse(result.metadata as string) : null,
      progress: result.progress ? JSON.parse(result.progress as string) : this.getDefaultProgress()
    }
  },

  getDefaultProgress() {
    return {
      currentUnitIndex: 0,
      currentChapterIndex: 0,
      currentSectionIndex: 0,
      completedSections: [],
      completedChapters: [],
      completedUnits: [],
      sectionContent: {},
      assessmentResults: [],
      streak: { currentStreak: 0, longestStreak: 0, lastActivityDate: '' },
      xp: 0,
      level: 1,
      badges: [],
      bookmarks: [],
      lastPosition: { unitId: '', chapterId: '', sectionId: '' },
      totalTimeSpent: 0,
      startedAt: Date.now(),
      lastActivityAt: Date.now()
    }
  },

  async saveCourse(userId: string, courseId: string, metadata: any, progress?: any): Promise<void> {
    const db = getDB()
    const now = new Date().toISOString()
    
    // Check if course exists
    const existing = await db.prepare('SELECT id FROM courses WHERE id = ?').bind(courseId).first()
    
    if (existing) {
      // Update existing course
      await db.prepare(`
        UPDATE courses SET 
          metadata = ?, 
          progress = ?,
          updatedAt = ?,
          lastAccessedAt = ?
        WHERE id = ?
      `).bind(
        JSON.stringify(metadata),
        progress ? JSON.stringify(progress) : null,
        now,
        now,
        courseId
      ).run()
    } else {
      // Insert new course
      const defaultProgress = progress || this.getDefaultProgress()
      
      await db.prepare(`
        INSERT INTO courses (
          id, userId, title, subtitle, description, metadata, progress,
          difficulty, totalEstimatedTime, totalUnits, totalChapters, totalSections,
          createdAt, updatedAt, lastAccessedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        courseId,
        userId,
        metadata.title || 'Untitled Course',
        metadata.subtitle || null,
        metadata.description || null,
        JSON.stringify(metadata),
        JSON.stringify(defaultProgress),
        metadata.difficulty || 'intermediate',
        metadata.totalEstimatedTime || 0,
        metadata.totalUnits || 0,
        metadata.totalChapters || 0,
        metadata.totalSections || 0,
        now,
        now,
        now
      ).run()
    }
  },

  async updateCourseProgress(courseId: string, progress: any): Promise<void> {
    const db = getDB()
    const now = new Date().toISOString()
    const today = now.split('T')[0]
    
    // Update streak logic
    let currentStreak = progress.streak?.currentStreak || 0
    let longestStreak = progress.streak?.longestStreak || 0
    const lastStreakDate = progress.streak?.lastActivityDate || ''
    
    if (lastStreakDate !== today) {
      // Check if this is a consecutive day
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      if (lastStreakDate === yesterdayStr) {
        currentStreak += 1
      } else if (lastStreakDate !== today) {
        currentStreak = 1 // Reset streak
      }
      
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
      }
      
      // Update streak in progress
      progress.streak = {
        currentStreak,
        longestStreak,
        lastActivityDate: today
      }
    }
    
    await db.prepare(`
      UPDATE courses SET 
        progress = ?,
        completedSections = ?,
        currentStreak = ?,
        longestStreak = ?,
        lastStreakDate = ?,
        xp = ?,
        updatedAt = ?,
        lastAccessedAt = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(progress),
      progress.completedSections?.length || 0,
      currentStreak,
      longestStreak,
      today,
      progress.xp || 0,
      now,
      now,
      courseId
    ).run()
  },

  async deleteCourse(courseId: string, userId: string): Promise<boolean> {
    const db = getDB()
    const result = await db.prepare(
      'DELETE FROM courses WHERE id = ? AND userId = ?'
    ).bind(courseId, userId).run()
    return result.meta.changes > 0
  },

  // ============================================================================
  // Education Machine v2: Project-Based Learning
  // ============================================================================

  // --- Course Projects ---

  async createCourseProject(courseId: string, project: {
    id: string
    title: string
    description: string
    difficulty: string
    deliverable: string
    technologies?: string[]
    objectives?: string[]
    prerequisites?: string[]
    estimatedHours: number
    orderIndex: number
  }): Promise<void> {
    const db = getDB()
    await db.prepare(`
      INSERT INTO course_projects (
        id, courseId, title, description, difficulty, deliverable,
        technologies, objectives, prerequisites, estimatedHours, orderIndex
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      project.id,
      courseId,
      project.title,
      project.description,
      project.difficulty,
      project.deliverable,
      JSON.stringify(project.technologies || []),
      JSON.stringify(project.objectives || []),
      JSON.stringify(project.prerequisites || []),
      project.estimatedHours,
      project.orderIndex
    ).run()
  },

  async getProjectsByCourse(courseId: string): Promise<any[]> {
    const db = getDB()
    const results = await db.prepare(`
      SELECT * FROM course_projects 
      WHERE courseId = ? 
      ORDER BY orderIndex ASC
    `).bind(courseId).all()
    
    return results.results.map((p: any) => ({
      id: p.id,
      courseId: p.courseId,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      deliverable: p.deliverable,
      technologies: JSON.parse(p.technologies || '[]'),
      objectives: JSON.parse(p.objectives || '[]'),
      prerequisites: JSON.parse(p.prerequisites || '[]'),
      estimatedHours: p.estimatedHours,
      orderIndex: p.orderIndex,
      createdAt: p.createdAt
    }))
  },

  async getCourseProject(projectId: string): Promise<any | null> {
    const db = getDB()
    const p = await db.prepare(`
      SELECT * FROM course_projects WHERE id = ?
    `).bind(projectId).first()
    
    if (!p) return null
    
    return {
      id: p.id,
      courseId: p.courseId,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      deliverable: p.deliverable,
      technologies: JSON.parse(p.technologies as string || '[]'),
      objectives: JSON.parse(p.objectives as string || '[]'),
      prerequisites: JSON.parse(p.prerequisites as string || '[]'),
      estimatedHours: p.estimatedHours,
      orderIndex: p.orderIndex,
      createdAt: p.createdAt
    }
  },

  // --- Project Tasks ---

  async createTask(projectId: string, task: {
    id: string
    title: string
    description: string
    type: string
    instructions: string
    starterCode?: string
    resources?: string[]
    hints?: string[]
    rubric: any
    passingScore: number
    estimatedMinutes: number
    orderIndex: number
  }): Promise<void> {
    const db = getDB()
    await db.prepare(`
      INSERT INTO project_tasks (
        id, projectId, title, description, type, instructions,
        starterCode, resources, hints, rubric, passingScore, estimatedMinutes, orderIndex
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      task.id,
      projectId,
      task.title,
      task.description,
      task.type,
      task.instructions,
      task.starterCode || null,
      JSON.stringify(task.resources || []),
      JSON.stringify(task.hints || []),
      JSON.stringify(task.rubric),
      task.passingScore,
      task.estimatedMinutes,
      task.orderIndex
    ).run()
  },

  async getTasksByProject(projectId: string): Promise<any[]> {
    const db = getDB()
    const results = await db.prepare(`
      SELECT * FROM project_tasks 
      WHERE projectId = ? 
      ORDER BY orderIndex ASC
    `).bind(projectId).all()
    
    return results.results.map((t: any) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      type: t.type,
      instructions: t.instructions,
      starterCode: t.starterCode,
      resources: JSON.parse(t.resources || '[]'),
      hints: JSON.parse(t.hints || '[]'),
      rubric: JSON.parse(t.rubric || '{}'),
      passingScore: t.passingScore,
      estimatedMinutes: t.estimatedMinutes,
      orderIndex: t.orderIndex
    }))
  },

  async getTask(taskId: string): Promise<any | null> {
    const db = getDB()
    const t = await db.prepare(`
      SELECT * FROM project_tasks WHERE id = ?
    `).bind(taskId).first()
    
    if (!t) return null
    
    return {
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      type: t.type,
      instructions: t.instructions,
      starterCode: t.starterCode,
      resources: JSON.parse(t.resources as string || '[]'),
      hints: JSON.parse(t.hints as string || '[]'),
      rubric: JSON.parse(t.rubric as string || '{}'),
      passingScore: t.passingScore,
      estimatedMinutes: t.estimatedMinutes,
      orderIndex: t.orderIndex
    }
  },

  // --- Task Submissions ---

  async createSubmission(submission: {
    id: string
    taskId: string
    userId: string
    content: string
  }): Promise<void> {
    const db = getDB()
    await db.prepare(`
      INSERT INTO task_submissions (id, taskId, userId, content)
      VALUES (?, ?, ?, ?)
    `).bind(
      submission.id,
      submission.taskId,
      submission.userId,
      submission.content
    ).run()
  },

  async updateSubmissionEvaluation(submissionId: string, evaluation: {
    score: number
    passed: boolean
    feedback: string
    criteriaScores: Record<string, number>
    strengths: string[]
    improvements: string[]
    suggestions: string[]
  }): Promise<void> {
    const db = getDB()
    const now = new Date().toISOString()
    await db.prepare(`
      UPDATE task_submissions SET
        score = ?,
        passed = ?,
        feedback = ?,
        criteriaScores = ?,
        strengths = ?,
        improvements = ?,
        suggestions = ?,
        evaluatedAt = ?
      WHERE id = ?
    `).bind(
      evaluation.score,
      evaluation.passed ? 1 : 0,
      evaluation.feedback,
      JSON.stringify(evaluation.criteriaScores),
      JSON.stringify(evaluation.strengths),
      JSON.stringify(evaluation.improvements),
      JSON.stringify(evaluation.suggestions),
      now,
      submissionId
    ).run()
  },

  async getSubmission(submissionId: string): Promise<any | null> {
    const db = getDB()
    const s = await db.prepare(`
      SELECT * FROM task_submissions WHERE id = ?
    `).bind(submissionId).first()
    
    if (!s) return null
    
    return {
      id: s.id,
      taskId: s.taskId,
      userId: s.userId,
      content: s.content,
      submittedAt: s.submittedAt,
      score: s.score,
      passed: Boolean(s.passed),
      feedback: s.feedback,
      criteriaScores: JSON.parse(s.criteriaScores as string || '{}'),
      strengths: JSON.parse(s.strengths as string || '[]'),
      improvements: JSON.parse(s.improvements as string || '[]'),
      suggestions: JSON.parse(s.suggestions as string || '[]'),
      evaluatedAt: s.evaluatedAt
    }
  },

  async getSubmissionsByTask(taskId: string, userId: string): Promise<any[]> {
    const db = getDB()
    const results = await db.prepare(`
      SELECT * FROM task_submissions 
      WHERE taskId = ? AND userId = ?
      ORDER BY submittedAt DESC
    `).bind(taskId, userId).all()
    
    return results.results.map((s: any) => ({
      id: s.id,
      taskId: s.taskId,
      userId: s.userId,
      content: s.content,
      submittedAt: s.submittedAt,
      score: s.score,
      passed: Boolean(s.passed),
      feedback: s.feedback,
      criteriaScores: JSON.parse(s.criteriaScores || '{}'),
      strengths: JSON.parse(s.strengths || '[]'),
      improvements: JSON.parse(s.improvements || '[]'),
      suggestions: JSON.parse(s.suggestions || '[]'),
      evaluatedAt: s.evaluatedAt
    }))
  },

  async getLatestSubmission(taskId: string, userId: string): Promise<any | null> {
    const db = getDB()
    const s = await db.prepare(`
      SELECT * FROM task_submissions 
      WHERE taskId = ? AND userId = ?
      ORDER BY submittedAt DESC
      LIMIT 1
    `).bind(taskId, userId).first()
    
    if (!s) return null
    
    return {
      id: s.id,
      taskId: s.taskId,
      userId: s.userId,
      content: s.content,
      submittedAt: s.submittedAt,
      score: s.score,
      passed: Boolean(s.passed),
      feedback: s.feedback,
      criteriaScores: JSON.parse(s.criteriaScores as string || '{}'),
      strengths: JSON.parse(s.strengths as string || '[]'),
      improvements: JSON.parse(s.improvements as string || '[]'),
      suggestions: JSON.parse(s.suggestions as string || '[]'),
      evaluatedAt: s.evaluatedAt
    }
  },

  // --- User Project Progress ---

  async getProjectProgress(userId: string, projectId: string): Promise<any | null> {
    const db = getDB()
    const p = await db.prepare(`
      SELECT * FROM user_project_progress 
      WHERE userId = ? AND projectId = ?
    `).bind(userId, projectId).first()
    
    if (!p) return null
    
    return {
      id: p.id,
      userId: p.userId,
      projectId: p.projectId,
      status: p.status,
      startedAt: p.startedAt,
      completedAt: p.completedAt
    }
  },

  async upsertProjectProgress(userId: string, projectId: string, status: string): Promise<void> {
    const db = getDB()
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    
    await db.prepare(`
      INSERT INTO user_project_progress (id, userId, projectId, status, startedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(userId, projectId) DO UPDATE SET
        status = excluded.status,
        completedAt = CASE WHEN excluded.status = 'completed' THEN ? ELSE completedAt END
    `).bind(id, userId, projectId, status, now, now).run()
  },

  async getUserCourseV2Progress(userId: string, courseId: string): Promise<{
    projectProgress: Record<string, { status: string; startedAt?: string; completedAt?: string }>
    taskSubmissions: Record<string, any>
  }> {
    const db = getDB()
    
    // Get project progress
    const projectResults = await db.prepare(`
      SELECT upp.* FROM user_project_progress upp
      JOIN course_projects cp ON upp.projectId = cp.id
      WHERE upp.userId = ? AND cp.courseId = ?
    `).bind(userId, courseId).all()
    
    const projectProgress: Record<string, any> = {}
    for (const p of projectResults.results) {
      projectProgress[(p as any).projectId] = {
        status: (p as any).status,
        startedAt: (p as any).startedAt,
        completedAt: (p as any).completedAt
      }
    }
    
    // Get latest submissions for each task
    const submissionResults = await db.prepare(`
      SELECT ts.* FROM task_submissions ts
      JOIN project_tasks pt ON ts.taskId = pt.id
      JOIN course_projects cp ON pt.projectId = cp.id
      WHERE ts.userId = ? AND cp.courseId = ?
      ORDER BY ts.submittedAt DESC
    `).bind(userId, courseId).all()
    
    const taskSubmissions: Record<string, any> = {}
    for (const s of submissionResults.results) {
      const taskId = (s as any).taskId
      if (!taskSubmissions[taskId]) {  // Only keep latest
        taskSubmissions[taskId] = {
          id: (s as any).id,
          content: (s as any).content,
          submittedAt: (s as any).submittedAt,
          score: (s as any).score,
          passed: Boolean((s as any).passed),
          feedback: (s as any).feedback
        }
      }
    }
    
    return { projectProgress, taskSubmissions }
  },

  // --- Full Course V2 Data ---

  async getCourseV2WithProgress(courseId: string, userId: string): Promise<any | null> {
    const db = getDB()
    
    // Get course metadata
    const course = await this.getCourse(courseId)
    if (!course) return null
    
    // Get projects
    const projects = await this.getProjectsByCourse(courseId)
    
    // Get tasks for each project
    for (const project of projects) {
      project.tasks = await this.getTasksByProject(project.id)
    }
    
    // Get user progress
    const progress = await this.getUserCourseV2Progress(userId, courseId)
    
    return {
      ...course,
      projects,
      userProgress: progress
    }
  }
}
