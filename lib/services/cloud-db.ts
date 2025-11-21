import { type D1Database } from '@cloudflare/workers-types'

// Helper to get DB binding
const getDB = () => process.env.DB as unknown as D1Database

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

export const cloudDb = {
  async getUser(email: string) {
    const db = getDB()
    return await db.prepare('SELECT * FROM User WHERE email = ?').bind(email).first()
  },

  async createUser(email: string, name?: string, image?: string) {
    const db = getDB()
    const id = crypto.randomUUID()
    await db.prepare('INSERT INTO User (id, email, name, image) VALUES (?, ?, ?, ?)').bind(id, email, name, image).run()
    return id
  },

  async getConversations(userId: string) {
    const db = getDB()
    const results = await db.prepare('SELECT * FROM Conversation WHERE userId = ? ORDER BY updatedAt DESC').bind(userId).all()
    return results.results.map((c: any) => ({
      ...c,
      path: JSON.parse(c.path as string || '[]'),
      tags: JSON.parse(c.tags as string || '[]'),
      branches: JSON.parse(c.branches as string || '[]'),
      isPinned: Boolean(c.isPinned)
    })) as CloudConversation[]
  },

  async createConversation(userId: string, title: string = 'New Conversation') {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = Date.now()
    await db.prepare(
      'INSERT INTO Conversation (id, userId, title, path, tags, isPinned, branches, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, title, '[]', '[]', 0, '[]', now, now).run()
    
    return { id, userId, title, path: [], tags: [], isPinned: false, branches: [], createdAt: now, updatedAt: now }
  },

  async getMessages(conversationId: string) {
    const db = getDB()
    // First get conversation to know the path
    const conversation = await db.prepare('SELECT path FROM Conversation WHERE id = ?').bind(conversationId).first()
    if (!conversation) return []
    
    const path = JSON.parse(conversation.path as string || '[]') as string[]
    if (path.length === 0) return []

    // Get messages in the path
    const messages = await db.prepare('SELECT * FROM Message WHERE conversationId = ?').bind(conversationId).all()
    
    const msgMap = new Map(messages.results.map((m: any) => [m.id as string, m]))
    
    return path.map(id => {
      const m = msgMap.get(id)
      if (!m) return null
      return {
        ...m,
        attachments: JSON.parse(m.attachments as string || '[]'),
        referencedConversations: JSON.parse(m.referencedConversations as string || '[]'),
        referencedFolders: JSON.parse(m.referencedFolders as string || '[]'),
        timestamp: m.createdAt, // Populate timestamp alias
        versionNumber: m.versionNumber || 1 // Default to 1
      }
    }) as CloudMessage[]
  },

  async addMessage(conversationId: string, message: any) {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = Date.now()
    
    // 1. Insert Message
    await db.prepare(
      'INSERT INTO Message (id, conversationId, role, content, attachments, referencedConversations, referencedFolders, timestamp, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id, 
      conversationId, 
      message.role, 
      message.content, 
      JSON.stringify(message.attachments || []),
      JSON.stringify(message.referencedConversations || []),
      JSON.stringify(message.referencedFolders || []),
      now,
      now
    ).run()

    // 2. Update Conversation Path
    const conversation = await db.prepare('SELECT path FROM Conversation WHERE id = ?').bind(conversationId).first()
    const path = JSON.parse(conversation?.path as string || '[]') as string[]
    path.push(id)
    
    await db.prepare('UPDATE Conversation SET path = ?, updatedAt = ? WHERE id = ?').bind(JSON.stringify(path), now, conversationId).run()

    return { ...message, id, timestamp: now }
  },

  async updateMessage(messageId: string, updates: any) {
    const db = getDB()
    const keys = Object.keys(updates)
    if (keys.length === 0) return
    
    const setClause = keys.map(k => `${k} = ?`).join(', ')
    const values = keys.map(k => {
      const val = updates[k]
      return (typeof val === 'object') ? JSON.stringify(val) : val
    })
    
    await db.prepare(`UPDATE Message SET ${setClause} WHERE id = ?`).bind(...values, messageId).run()
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
    await db.prepare(`UPDATE Conversation SET ${setClause}, updatedAt = ? WHERE id = ?`).bind(...values, Date.now(), conversationId).run()
  },

  async updateCredits(userId: string, amount: number) {
    const db = getDB()
    // amount can be negative to deduct
    await db.prepare('UPDATE User SET credits = credits + ? WHERE id = ?').bind(amount, userId).run()
  },

  async deleteConversation(conversationId: string) {
    const db = getDB()
    // Delete conversation (cascade should handle messages if set up, but D1 foreign keys might need explicit enable)
    // PRAGMA foreign_keys = ON; is needed in D1 usually, or we delete manually.
    // Let's delete manually to be safe.
    await db.prepare('DELETE FROM Message WHERE conversationId = ?').bind(conversationId).run()
    await db.prepare('DELETE FROM Conversation WHERE id = ?').bind(conversationId).run()
  },
  
  async getUserCredits(userId: string) {
    const db = getDB()
    const user = await db.prepare('SELECT credits FROM User WHERE id = ?').bind(userId).first()
    return user?.credits as number || 0
  },

  async deleteMessage(messageId: string) {
    const db = getDB()
    // We also need to remove it from the conversation path
    // This is expensive as we need to find which conversation has this message
    // A better schema would have conversationId indexed on Message (which we do)
    // So we can find the conversationId from the message
    const message = await db.prepare('SELECT conversationId FROM Message WHERE id = ?').bind(messageId).first()
    if (!message) return

    const conversationId = message.conversationId as string
    
    // Remove from Message table
    await db.prepare('DELETE FROM Message WHERE id = ?').bind(messageId).run()

    // Update Conversation path
    const conversation = await db.prepare('SELECT path FROM Conversation WHERE id = ?').bind(conversationId).first()
    if (conversation) {
      let path = JSON.parse(conversation.path as string || '[]') as string[]
      path = path.filter(id => id !== messageId)
      await db.prepare('UPDATE Conversation SET path = ?, updatedAt = ? WHERE id = ?').bind(JSON.stringify(path), Date.now(), conversationId).run()
    }
  },

  async getAllTags(userId: string) {
    const db = getDB()
    const results = await db.prepare('SELECT tags FROM Conversation WHERE userId = ?').bind(userId).all()
    const tags = new Set<string>()
    results.results.forEach((r: any) => {
      const t = JSON.parse(r.tags as string || '[]') as string[]
      t.forEach(tag => tags.add(tag))
    })
    return Array.from(tags)
  },

  // --- Folders ---

  async getFolders(userId: string) {
    const db = getDB()
    const folders = await db.prepare('SELECT * FROM Folder WHERE userId = ? ORDER BY updatedAt DESC').bind(userId).all()
    
    // For each folder, get conversation IDs
    const result = []
    for (const folder of folders.results) {
      const convs = await db.prepare('SELECT conversationId FROM FolderConversation WHERE folderId = ?').bind(folder.id).all()
      result.push({
        ...folder,
        conversationIds: convs.results.map((c: any) => c.conversationId)
      })
    }
    return result
  },

  async createFolder(userId: string, name: string, description?: string, conversationIds: string[] = []) {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = Date.now()
    
    await db.prepare('INSERT INTO Folder (id, userId, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').bind(id, userId, name, description, now, now).run()

    if (conversationIds.length > 0) {
      const stmt = db.prepare('INSERT INTO FolderConversation (folderId, conversationId) VALUES (?, ?)')
      const batch = conversationIds.map(cid => stmt.bind(id, cid))
      await db.batch(batch)
    }

    return { id, userId, name, description, conversationIds, createdAt: now, updatedAt: now }
  },

  async updateFolder(folderId: string, updates: any) {
    const db = getDB()
    const keys = Object.keys(updates).filter(k => k !== 'conversationIds')
    
    if (keys.length > 0) {
      const setClause = keys.map(k => `${k} = ?`).join(', ')
      const values = keys.map(k => updates[k])
      await db.prepare(`UPDATE Folder SET ${setClause}, updatedAt = ? WHERE id = ?`).bind(...values, Date.now(), folderId).run()
    }
  },

  async deleteFolder(folderId: string) {
    const db = getDB()
    await db.prepare('DELETE FROM Folder WHERE id = ?').bind(folderId).run()
    // FolderConversation should cascade delete if FK set up, but let's be safe?
    // The schema has ON DELETE CASCADE, so it should be fine.
  },

  async addConversationToFolder(folderId: string, conversationId: string) {
    const db = getDB()
    await db.prepare('INSERT OR IGNORE INTO FolderConversation (folderId, conversationId) VALUES (?, ?)').bind(folderId, conversationId).run()
  },

  async removeConversationFromFolder(folderId: string, conversationId: string) {
    const db = getDB()
    await db.prepare('DELETE FROM FolderConversation WHERE folderId = ? AND conversationId = ?').bind(folderId, conversationId).run()
  },

  // --- Projects ---

  async getProjects(userId: string) {
    const db = getDB()
    const projects = await db.prepare('SELECT * FROM Project WHERE userId = ? ORDER BY updatedAt DESC').bind(userId).all()
    return projects.results.map((p: any) => ({
      ...p,
      attachments: JSON.parse(p.attachments as string || '[]')
    }))
  },

  async createProject(userId: string, name: string, description: string, instructions?: string, attachments: any[] = []) {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = Date.now()
    
    await db.prepare(
      'INSERT INTO Project (id, userId, name, description, instructions, attachments, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, name, description, instructions, JSON.stringify(attachments), now, now).run()

    return { id, userId, name, description, instructions, attachments, createdAt: now, updatedAt: now }
  },

  async updateProject(projectId: string, updates: any) {
    const db = getDB()
    const keys = Object.keys(updates)
    if (keys.length === 0) return

    const setClause = keys.map(k => `${k} = ?`).join(', ')
    const values = keys.map(k => {
      const val = updates[k]
      return (typeof val === 'object') ? JSON.stringify(val) : val
    })
    
    await db.prepare(`UPDATE Project SET ${setClause}, updatedAt = ? WHERE id = ?`).bind(...values, Date.now(), projectId).run()
  },

  async deleteProject(projectId: string) {
    const db = getDB()
    await db.prepare('DELETE FROM Project WHERE id = ?').bind(projectId).run()
  }
}
