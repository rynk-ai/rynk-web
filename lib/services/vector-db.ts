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

  // --- File Chunks (Legacy D1 for now, but could move to Vectorize too) ---
  // For now, we keep file chunks in D1 because they are small and scoped to a file.
  // But we could also put them in Vectorize with metadata filter `attachmentId`.
  // Let's keep D1 for file chunks to minimize risk, and use Vectorize for Project Memory (messages).

  async addFileChunk(data: Omit<FileChunk, 'id' | 'timestamp'>) {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = Date.now()

    // 1. Store in D1 (Source of Truth)
    await db.prepare(`
      INSERT INTO file_chunks (
        id, attachmentId, userId, chunkIndex, content, vector, metadata, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, data.attachmentId, data.userId, data.chunkIndex, data.content,
      JSON.stringify(data.vector), JSON.stringify(data.metadata), now
    ).run()

    // 2. Upsert to Vectorize (Search Index)
    try {
      const index = getCloudflareContext().env.VECTORIZE_INDEX;
      if (index) {
        await index.upsert([{
          id: id,
          values: data.vector,
          metadata: {
            type: 'file_chunk',
            attachmentId: data.attachmentId,
            chunkIndex: data.chunkIndex.toString(),
            content: data.content.substring(0, 1000), // Limit metadata size
            ...Object.fromEntries(Object.entries(data.metadata || {}).map(([k, v]) => [k, String(v)]))
          }
        }]);
      }
    } catch (error) {
      console.error('❌ [vectorDb] Failed to upsert file chunk to Vectorize:', error);
    }
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

    try {
      const index = getCloudflareContext().env.VECTORIZE_INDEX;
      if (index) {
        // Search Vectorize
        const results = await index.query(queryVector, {
          topK: limit,
          filter: { attachmentId: attachmentId },
          returnMetadata: true
        });

        return results.matches
          .filter(match => match.score >= minScore)
          .map(match => ({
            id: match.id,
            attachmentId: match.metadata?.attachmentId as string,
            chunkIndex: parseInt(match.metadata?.chunkIndex as string || '0'),
            content: match.metadata?.content as string,
            vector: match.values || [], // Vectorize might not return values by default unless requested? Actually query returns matches.
            // Note: We might not get the full content if we truncated it.
            // For full fidelity, we could fetch from D1 using ID, but for now let's use metadata.
            metadata: match.metadata,
            score: match.score
          }));
      }
    } catch (error) {
      console.error('❌ [vectorDb] Vectorize search failed, falling back to D1:', error);
    }

    // Fallback to D1 (Legacy)
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
async addKnowledgeChunk(data: { sourceId: string; content: string; vector: number[]; chunkIndex: number; metadata?: any }, options?: { waitForIndexing?: boolean }) {
  const db = getDB()
  const id = crypto.randomUUID()

  // 1. Store content in D1 (no vector column)
  await db.prepare(`
    INSERT INTO knowledge_chunks (id, sourceId, content, chunkIndex, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id, data.sourceId, data.content, data.chunkIndex, JSON.stringify(data.metadata || {})
  ).run()

  console.log(`✅ [vectorDb] Stored chunk ${id} in D1 (sourceId: ${data.sourceId})`);

  // 2. Store vector in Vectorize (required, not optional)
  const index = getCloudflareContext().env.VECTORIZE_INDEX;
  if (!index) {
    throw new Error('Vectorize index not available - cannot store embeddings');
  }

  const vectorMetadata = {
    type: 'knowledge_chunk',
    sourceId: data.sourceId,
    chunkIndex: data.chunkIndex.toString(),
    content: data.content.substring(0, 800),
  };

  // console.log(`🧠 [vectorDb] Upserting to Vectorize: ID=${id}, SourceID=${data.sourceId}, VectorDim=${data.vector.length}`);

  await index.upsert([{
    id: id,
    values: data.vector,
    metadata: vectorMetadata
  }]);

  // console.log(`✅ [vectorDb] Upserted vector to Vectorize for chunk ${id}`);

  // 3. Wait for Indexing (Optional - for last batch verification)
  if (options?.waitForIndexing) {
    console.log(`⏳ [vectorDb] Waiting for chunk ${id} (sourceId: ${data.sourceId}) to be indexed and searchable...`);
    const startTime = Date.now();
    const TIMEOUT_MS = 60000; // 60s timeout
    const POLL_INTERVAL_MS = 2000; // 2s interval

    let indexed = false;
    while (Date.now() - startTime < TIMEOUT_MS) {
      try {
        // Wait first (give it a chance to index)
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

        // Step 1: Verify chunk exists by ID
        const verifyById = await index.getByIds([id]);
        if (verifyById.length > 0) {
          const chunk = verifyById[0];
          console.log(`🔍 [vectorDb] Chunk ${id} found in index. Metadata:`, JSON.stringify(chunk.metadata));

          // Step 2: Verify sourceId filter works
          const verifyBySource = await index.query(data.vector, {
            topK: 1,
            filter: { sourceId: data.sourceId },
            returnMetadata: true
          });

          if (verifyBySource.matches.length > 0) {
            console.log(`✅ [vectorDb] Chunk ${id} is SEARCHABLE via sourceId filter after ${Date.now() - startTime}ms`);
            indexed = true;
            break;
          } else {
            console.warn(`⚠️ [vectorDb] Chunk exists but sourceId filter returned 0 results. Retrying...`);
          }
        }
      } catch (e) {
        console.warn(`⚠️ [vectorDb] Verification check failed (retrying):`, e);
      }
    }

    if (!indexed) {
      console.warn(`⚠️ [vectorDb] Chunk ${id} NOT searchable after ${TIMEOUT_MS}ms timeout (likely wrangler dev issue - should work in production)`);
      // Don't throw - let the upload succeed. Production Vectorize will be faster.
    }
  }
},

  async getKnowledgeChunks(sourceId: string) {
    const db = getDB()
    const results = await db.prepare('SELECT * FROM knowledge_chunks WHERE sourceId = ? ORDER BY chunkIndex ASC').bind(sourceId).all()

    return results.results.map((row: any) => ({
      ...row,
      metadata: JSON.parse(row.metadata as string || '{}')
    }))
  },

  // 3. Conversation Links
  async linkSourceToConversation(conversationId: string, sourceId: string, messageId?: string) {
    const db = getDB()

    // Check if link already exists
    const existing = await db.prepare(`
      SELECT id FROM conversation_sources
      WHERE conversationId = ? AND sourceId = ? AND (messageId = ? OR (messageId IS NULL AND ? IS NULL))
    `).bind(conversationId, sourceId, messageId || null, messageId || null).first()

    if (existing) {
      console.log('♻️ [vectorDb] Link already exists:', existing.id)
      return
    }

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
    console.log('🔍 [vectorDb] Getting sources for conversation:', conversationId)

    const results = await db.prepare(`
      SELECT
        cs.id as linkId,
        cs.sourceId,
        cs.messageId,
        s.id as sourceTableId,
        s.hash,
        s.type,
        s.name,
        s.metadata,
        s.createdAt
      FROM conversation_sources cs
      JOIN sources s ON cs.sourceId = s.id
      WHERE cs.conversationId = ?
    `).bind(conversationId).all()

    return results.results.map((row: any) => ({
      ...row,
      metadata: JSON.parse(row.metadata as string || '{}')
    }))
  },

  // 4. Project Links
  async linkSourceToProject(projectId: string, sourceId: string) {
    const db = getDB()

    // Check if link already exists
    const existing = await db.prepare(`
      SELECT id FROM conversation_sources
      WHERE projectId = ? AND sourceId = ? AND conversationId IS NULL
    `).bind(projectId, sourceId).first()

    if (existing) {
      console.log('♻️ [vectorDb] Project link already exists:', existing.id)
      return
    }

    const id = crypto.randomUUID()
    const now = Date.now()

    await db.prepare(`
      INSERT INTO conversation_sources (id, conversationId, sourceId, messageId, projectId, createdAt)
      VALUES (?, NULL, ?, NULL, ?, ?)
    `).bind(
      id, sourceId, projectId, now
    ).run()

    console.log(`✅ [vectorDb] Linked source ${sourceId} to project ${projectId}`)
  },

  async getSourcesForProject(projectId: string) {
    const db = getDB()
    console.log('🔍 [vectorDb] Getting sources for project:', projectId)

    const results = await db.prepare(`
      SELECT
        cs.id as linkId,
        cs.sourceId,
        s.id as sourceTableId,
        s.hash,
        s.type,
        s.name,
        s.metadata,
        s.createdAt
      FROM conversation_sources cs
      JOIN sources s ON cs.sourceId = s.id
      WHERE cs.projectId = ?
    `).bind(projectId).all()

    return results.results.map((row: any) => ({
      ...row,
      metadata: JSON.parse(row.metadata as string || '{}')
    }))
  },

  // Search across multiple sources (Vectorize-first)
  async searchKnowledgeBase(sourceIds: string[], queryVector: number[], options: { limit?: number, minScore?: number } = {}) {
    const { limit = 10, minScore = 0.5 } = options
    console.log('🔍 [searchKnowledgeBase] Searching sources:', sourceIds.length, 'MinScore:', minScore);

    if (sourceIds.length === 0) return []

    // Query Vectorize (required)
    const index = getCloudflareContext().env.VECTORIZE_INDEX;
    if (!index) {
      throw new Error('Vectorize index not available - cannot search');
    }

    console.log('🔍 [searchKnowledgeBase] Querying Vectorize...');

    // DEBUG: Try one query WITHOUT filter to see if anything exists
    if (sourceIds.length > 0) {
      try {
        const debugRes = await index.query(queryVector, { topK: 1, returnMetadata: true });
        console.log('🔍 [DEBUG] Unfiltered search returned', debugRes.matches.length, 'matches');
        if (debugRes.matches.length > 0) {
          console.log('🔍 [DEBUG] Sample match metadata:', debugRes.matches[0].metadata);
        }
      } catch (e) {
        console.error('❌ [DEBUG] Unfiltered search failed:', e);
      }
    }

    // Parallel query for each sourceId
    const searchPromises = sourceIds.map(sourceId =>
      index.query(queryVector, {
        topK: limit,
        filter: { sourceId: sourceId }, // Simple equality filter
        returnMetadata: true
      })
      .then(res => {
        console.log(`🔍 [searchKnowledgeBase] Query for source ${sourceId} returned ${res.matches.length} matches`);
        return res;
      })
      .catch(err => {
        console.error(`❌ [searchKnowledgeBase] Query failed for source ${sourceId}:`, err);
        return { matches: [], count: 0 };
      })
    );

    const results = await Promise.all(searchPromises);
    console.log('✅ [searchKnowledgeBase] Vectorize returned', results.length, 'result sets');

    // Flatten and sort
    const allMatches = results.flatMap(r => r.matches);
    console.log('🔍 [searchKnowledgeBase] Total matches from Vectorize:', allMatches.length);

    if (allMatches.length === 0) {
      console.log('⚠️ [searchKnowledgeBase] No matches found in Vectorize');
      return [];
    }

    // Filter by score and deduplicate
    const uniqueMatches = Array.from(new Map(allMatches.map(m => [m.id, m])).values());
    const filtered = uniqueMatches
      .filter(match => match.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log('✅ [searchKnowledgeBase] Filtered to', filtered.length, 'chunks above threshold');

    // Fetch full content from D1
    const db = getDB();
    const chunkIds = filtered.map(m => m.id);

    if (chunkIds.length === 0) return [];

    const placeholders = chunkIds.map(() => '?').join(',');
    const d1Results = await db.prepare(
      `SELECT * FROM knowledge_chunks WHERE id IN (${placeholders})`
    ).bind(...chunkIds).all();

    console.log('🔍 [searchKnowledgeBase] Fetched', d1Results.results.length, 'chunks from D1');

    // Merge D1 content with Vectorize scores
    const chunks = d1Results.results.map((row: any) => {
      const match = filtered.find(m => m.id === row.id);
      return {
        id: row.id,
        sourceId: row.sourceId,
        content: row.content,
        chunkIndex: row.chunkIndex,
        metadata: JSON.parse(row.metadata as string || '{}'),
        score: match?.score || 0,
        vector: [] // No longer stored in D1
      };
    });

    // Sort by score (Vectorize order)
    const sorted = chunks.sort((a, b) => b.score - a.score);

    console.log('✅ [searchKnowledgeBase] Returning', sorted.length, 'chunks with content');
    return sorted;
  },
  // --- CLOUDFLARE VECTORIZE (Message Memory) ---

  async upsertMessageMemory(
    messageId: string,
    conversationId: string,
    content: string,
    vector: number[],
    projectId?: string
  ) {
    try {
      const index = getCloudflareContext().env.VECTORIZE_INDEX;
      if (!index) {
        console.warn('⚠️ [vectorDb] Vectorize index not bound, skipping upsert');
        return;
      }

      console.log('🧠 [vectorDb] Upserting to Vectorize:', { messageId, conversationId, projectId });

      await index.upsert([{
        id: messageId,
        values: vector,
        metadata: {
          conversationId: String(conversationId),
          content: String(content || '').substring(0, 1000),
          type: 'message',
          projectId: String(projectId || 'none'),
          timestamp: Date.now().toString()
        }
      }]);
    } catch (error) {
      console.error('❌ [vectorDb] Failed to upsert to Vectorize:', error);
    }
  },

  async searchProjectMemory(
    projectId: string,
    queryVector: number[],
    options: { 
      limit?: number, 
      minScore?: number, 
      excludeConversationId?: string,
      recencyWeight?: number // 0-1: weight for recency vs similarity (default 0.3)
    } = {}
  ) {
    try {
      const index = getCloudflareContext().env.VECTORIZE_INDEX;
      if (!index) {
        console.warn('⚠️ [vectorDb] Vectorize index not bound, skipping search');
        return [];
      }

      const { 
        limit = parseInt(process.env.PROJECT_MEMORY_LIMIT || '10'), 
        minScore = parseFloat(process.env.PROJECT_MEMORY_MIN_SCORE || '0.4'), 
        excludeConversationId,
        recencyWeight = parseFloat(process.env.RECENCY_WEIGHT || '0.3')
      } = options;

      console.log('🧠 [vectorDb] Searching Project Memory:', { projectId, excludeConversationId, recencyWeight });

      // Fetch more results than needed to allow for recency re-ranking
      const results = await index.query(queryVector, {
        topK: Math.min(limit * 2, 50), // Fetch extra for re-ranking
        filter: { projectId: projectId },
        returnMetadata: true
      });

      console.log(`🧠 [vectorDb] Vectorize returned ${results.matches.length} matches`);

      // Calculate recency scores
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const MAX_AGE_DAYS = 30; // Normalize recency over 30 days

      const scoredMatches = results.matches
        .filter(match => {
          // Filter by base similarity score
          if (match.score < minScore) return false;
          // Filter excluded conversation
          if (excludeConversationId && match.metadata?.conversationId === excludeConversationId) return false;
          return true;
        })
        .map(match => {
          const timestamp = parseInt(match.metadata?.timestamp as string || '0');
          const ageMs = now - timestamp;
          const ageDays = ageMs / ONE_DAY_MS;
          
          // Recency score: 1.0 for now, decays to 0.0 at MAX_AGE_DAYS
          const recencyScore = Math.max(0, 1 - (ageDays / MAX_AGE_DAYS));
          
          // Combined score: weighted average of similarity and recency
          const finalScore = (1 - recencyWeight) * match.score + recencyWeight * recencyScore;

          return {
            messageId: match.id,
            conversationId: match.metadata?.conversationId as string,
            content: match.metadata?.content as string,
            timestamp,
            similarityScore: match.score,
            recencyScore,
            score: finalScore
          };
        })
        // Re-sort by combined score
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      console.log(`🧠 [vectorDb] Returning ${scoredMatches.length} memories after recency re-ranking`);

      return scoredMatches;

    } catch (error) {
      console.error('❌ [vectorDb] Failed to search Project Memory:', error);
      return [];
    }
  },

  async searchConversationMemory(
    conversationId: string,
    queryVector: number[],
    options: { limit?: number, minScore?: number } = {}
  ) {
    try {
      const index = getCloudflareContext().env.VECTORIZE_INDEX;
      if (!index) {
        console.warn('⚠️ [vectorDb] Vectorize index not bound, skipping search');
        return [];
      }

      const { limit = 10, minScore = 0.4 } = options;

      console.log('🧠 [vectorDb] Searching Conversation Memory:', { conversationId });

      const results = await index.query(queryVector, {
        topK: limit,
        filter: { conversationId: conversationId },
        returnMetadata: true
      });

      return results.matches
        .filter(match => match.score >= minScore)
        .map(match => ({
          messageId: match.id,
          conversationId: match.metadata?.conversationId as string,
          content: match.metadata?.content as string,
          score: match.score
        }));

    } catch (error) {
      console.error('❌ [vectorDb] Failed to search Conversation Memory:', error);
      return [];
    }
  }
}
