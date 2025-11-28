import { getCloudflareContext } from '@opennextjs/cloudflare'
import { cosineSimilarity } from '@/lib/utils/vector'

// Helper to get DB binding
const getDB = () => {
  try {
    return getCloudflareContext().env.DB
  } catch (error) {
    console.error('❌ Cloudflare context not available:', error)
    throw new Error(
      'D1 Database binding not available.'
    )
  }
}

export interface AttachmentMetadata {
  id: string
  messageId: string | null
  userId: string
  fileName: string
  fileType: string
  fileSize: number
  r2Key: string
  chunkCount: number
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: number
}

export interface FileChunk {
  id: string
  attachmentId: string
  userId: string
  chunkIndex: number
  content: string
  vector: number[]
  metadata: any
  timestamp: number
}

export interface Source {
  id: string
  hash: string
  type: string
  name: string
  metadata: any
  createdAt: number
}

export const vectorDb = {
  // --- Attachment Metadata ---

  async createAttachmentMetadata(data: Omit<AttachmentMetadata, 'id' | 'createdAt'>) {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = Date.now()
    
    await db.prepare(`
      INSERT INTO attachments_metadata (
        id, messageId, userId, fileName, fileType, fileSize, r2Key, 
        chunkCount, processingStatus, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, data.messageId, data.userId, data.fileName, data.fileType, data.fileSize, data.r2Key,
      data.chunkCount, data.processingStatus, now
    ).run()
    
    return id
  },

  async updateProcessingStatus(id: string, status: AttachmentMetadata['processingStatus'], chunkCount?: number) {
    const db = getDB()
    if (chunkCount !== undefined) {
      await db.prepare('UPDATE attachments_metadata SET processingStatus = ?, chunkCount = ? WHERE id = ?')
        .bind(status, chunkCount, id).run()
    } else {
      await db.prepare('UPDATE attachments_metadata SET processingStatus = ? WHERE id = ?')
        .bind(status, id).run()
    }
  },

  async getAttachmentMetadata(id: string): Promise<AttachmentMetadata | null> {
    const db = getDB()
    return await db.prepare('SELECT * FROM attachments_metadata WHERE id = ?').bind(id).first()
  },

  // --- File Chunks ---

  async addFileChunk(data: Omit<FileChunk, 'id' | 'timestamp'>) {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = Date.now()
    
    await db.prepare(`
      INSERT INTO file_chunks (
        id, attachmentId, userId, chunkIndex, content, vector, metadata, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, data.attachmentId, data.userId, data.chunkIndex, data.content, 
      JSON.stringify(data.vector), JSON.stringify(data.metadata), now
    ).run()
  },

  async getFileChunks(attachmentId: string): Promise<FileChunk[]> {
    const db = getDB()
    const results = await db.prepare('SELECT * FROM file_chunks WHERE attachmentId = ? ORDER BY chunkIndex ASC').bind(attachmentId).all()
    
    return results.results.map((row: any) => ({
      ...row,
      vector: JSON.parse(row.vector as string),
      metadata: row.metadata ? JSON.parse(row.metadata as string) : {}
    })) as FileChunk[]
  },

  async searchFileChunks(attachmentId: string, queryVector: number[], options: { limit?: number, minScore?: number } = {}) {
    const { limit = 5, minScore = 0.5 } = options
    
    // Fetch all chunks for the attachment
    // Note: For very large files, we might want to do this differently, 
    // but D1 doesn't support vector search natively yet, so we fetch and filter in memory.
    // Since we chunk per file, this is usually manageable (e.g. 100 chunks for a 50 page PDF).
    const chunks = await this.getFileChunks(attachmentId)
    
    const results = chunks.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryVector, chunk.vector)
    }))
    
    return results
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  },

  // --- Unified Knowledge Base ---

  // 1. Sources (Deduplicated)
  async createSource(data: { hash: string; type: string; name: string; metadata: any }) {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = Date.now()
    
    await db.prepare(`
      INSERT INTO sources (id, hash, type, name, metadata, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      id, data.hash, data.type, data.name, JSON.stringify(data.metadata), now
    ).run()
    
    return id
  },

  async getSourceByHash(hash: string): Promise<Source | null> {
    const db = getDB()
    const result = await db.prepare('SELECT * FROM sources WHERE hash = ?').bind(hash).first()
    if (!result) return null
    return {
      ...(result as any),
      metadata: JSON.parse((result as any).metadata as string || '{}')
    } as Source
  },

  async getSource(id: string): Promise<Source | null> {
    const db = getDB()
    const result = await db.prepare('SELECT * FROM sources WHERE id = ?').bind(id).first()
    if (!result) return null
    return {
      ...(result as any),
      metadata: JSON.parse((result as any).metadata as string || '{}')
    } as Source
  },

  // 2. Knowledge Chunks
  async addKnowledgeChunk(data: { sourceId: string; content: string; vector: number[]; chunkIndex: number; metadata?: any }) {
    const db = getDB()
    const id = crypto.randomUUID()
    
    await db.prepare(`
      INSERT INTO knowledge_chunks (id, sourceId, content, vector, chunkIndex, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      id, data.sourceId, data.content, JSON.stringify(data.vector), data.chunkIndex, JSON.stringify(data.metadata || {})
    ).run()
  },

  async getKnowledgeChunks(sourceId: string) {
    const db = getDB()
    const results = await db.prepare('SELECT * FROM knowledge_chunks WHERE sourceId = ? ORDER BY chunkIndex ASC').bind(sourceId).all()
    
    return results.results.map((row: any) => ({
      ...row,
      vector: JSON.parse(row.vector as string),
      metadata: JSON.parse(row.metadata as string || '{}')
    }))
  },

  // 3. Conversation Links
  async linkSourceToConversation(conversationId: string, sourceId: string, messageId?: string) {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = Date.now()
    
    await db.prepare(`
      INSERT INTO conversation_sources (id, conversationId, sourceId, messageId, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      id, conversationId, sourceId, messageId || null, now
    ).run()
  },

  async getSourcesForConversation(conversationId: string) {
    const db = getDB()
    // Join with sources table to get details
    const results = await db.prepare(`
      SELECT s.*, cs.messageId 
      FROM conversation_sources cs
      JOIN sources s ON cs.sourceId = s.id
      WHERE cs.conversationId = ?
    `).bind(conversationId).all()
    
    return results.results.map((row: any) => ({
      ...row,
      metadata: JSON.parse(row.metadata as string || '{}')
    }))
  },

  // Search across multiple sources
  async searchKnowledgeBase(sourceIds: string[], queryVector: number[], options: { limit?: number, minScore?: number } = {}) {
    const { limit = 10, minScore = 0.5 } = options
    if (sourceIds.length === 0) return []

    const db = getDB()
    
    // Fetch chunks for ALL provided sources
    // Note: In a real production D1 (with vector support), this would be a single vector query.
    // Here we fetch and filter in memory.
    const placeholders = sourceIds.map(() => '?').join(',')
    const results = await db.prepare(
      `SELECT * FROM knowledge_chunks WHERE sourceId IN (${placeholders})`
    ).bind(...sourceIds).all()
    
    const chunks = results.results.map((row: any) => ({
      ...row,
      vector: JSON.parse(row.vector as string),
      metadata: JSON.parse(row.metadata as string || '{}')
    }))

    const scored = chunks.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryVector, chunk.vector)
    }))
    
    return scored
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}
