/**
 * Server-side PDF processing service
 * Handles text extraction, chunking, and embedding on the server
 */

import { chunkWithParentChild } from '../utils/chunking'

export interface PDFJob {
  id: string
  r2Key: string
  conversationId?: string
  projectId?: string
  messageId?: string
  sourceId?: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  totalChunks?: number
  processedChunks?: number
  error?: string
}

interface ProcessingEnv {
  BUCKET: R2Bucket
  DB: D1Database
  AI: any
  VECTORIZE_INDEX: VectorizeIndex
}

/**
 * Extract text from PDF using unpdf (works in Workers)
 */
export async function extractPDFText(buffer: ArrayBuffer): Promise<string> {
  // Dynamic import for unpdf
  const { extractText } = await import('unpdf')
  const result = await extractText(new Uint8Array(buffer))
  // unpdf returns { text: string[] } - array of pages
  const text = Array.isArray(result.text) ? result.text.join('\n\n') : result.text
  return text
}


/**
 * Process a PDF from R2 and store embeddings
 */
export async function processPDFFromR2(
  env: ProcessingEnv,
  jobId: string,
  r2Key: string,
  conversationId?: string,
  projectId?: string,
  messageId?: string
): Promise<{ success: boolean; error?: string; chunksProcessed?: number }> {
  const db = env.DB
  
  try {
    // Update status to processing
    await db.prepare('UPDATE pdf_jobs SET status = ? WHERE id = ?')
      .bind('processing', jobId).run()

    // 1. Fetch PDF from R2
    console.log(`📄 [PDFProcessor] Fetching PDF from R2: ${r2Key}`)
    const pdfObject = await env.BUCKET.get(r2Key)
    if (!pdfObject) {
      throw new Error(`PDF not found in R2: ${r2Key}`)
    }

    // 2. Extract text
    console.log(`📄 [PDFProcessor] Extracting text...`)
    const buffer = await pdfObject.arrayBuffer()
    const text = await extractPDFText(buffer)
    console.log(`📄 [PDFProcessor] Extracted ${text.length} characters`)

    if (!text || text.trim().length === 0) {
      throw new Error('No text extracted from PDF')
    }

    // 3. Parent-child chunking (Small-to-Big)
    console.log(`📄 [PDFProcessor] Chunking with parent-child...`)
    const { parents, children } = chunkWithParentChild(text)
    console.log(`📄 [PDFProcessor] Created ${parents.length} parents, ${children.length} children`)

    // Update progress
    await db.prepare('UPDATE pdf_jobs SET totalChunks = ? WHERE id = ?')
      .bind(children.length, jobId).run()

    // 4. Create source record
    const sourceId = crypto.randomUUID()
    const fileName = r2Key.split('/').pop() || 'document.pdf'
    const hash = await generateHash(`${r2Key}:${conversationId}:${messageId}`)
    
    await db.prepare(`
      INSERT INTO sources (id, hash, type, name, metadata, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      sourceId, hash, 'pdf', fileName,
      JSON.stringify({ r2Key, pageCount: parents.length }),
      Date.now()
    ).run()

    // 5. Store parent chunks in D1
    console.log(`📄 [PDFProcessor] Storing ${parents.length} parent chunks...`)
    for (const parent of parents) {
      const parentId = `${sourceId}-${parent.id}`
      await db.prepare(`
        INSERT INTO parent_chunks (id, sourceId, content, chunkIndex, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        parentId, sourceId, parent.content, parent.chunkIndex,
        JSON.stringify(parent.metadata || {})
      ).run()
    }

    // 6. Generate embeddings and store children
    console.log(`📄 [PDFProcessor] Generating embeddings for ${children.length} children...`)
    const BATCH_SIZE = 10
    let processedCount = 0

    for (let i = 0; i < children.length; i += BATCH_SIZE) {
      const batch = children.slice(i, i + BATCH_SIZE)
      const texts = batch.map(c => c.content)

      // Batch embedding generation
      const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: texts })
      const embeddings = embeddingResult.data || []

      // Store each child chunk
      for (let j = 0; j < batch.length; j++) {
        const child = batch[j]
        const parentId = `${sourceId}-${child.parentId}`
        const chunkId = crypto.randomUUID()

        // Store in D1
        await db.prepare(`
          INSERT INTO knowledge_chunks (id, sourceId, content, chunkIndex, metadata, parentId)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          chunkId, sourceId, child.content, i + j,
          JSON.stringify({}), parentId
        ).run()

        // Store in Vectorize
        if (embeddings[j]) {
          await env.VECTORIZE_INDEX.upsert([{
            id: chunkId,
            values: embeddings[j],
            metadata: {
              type: 'child_chunk',
              sourceId,
              parentId,
              chunkIndex: (i + j).toString(),
              content: child.content.substring(0, 800)
            }
          }])
        }
      }

      processedCount += batch.length
      await db.prepare('UPDATE pdf_jobs SET processedChunks = ?, progress = ? WHERE id = ?')
        .bind(processedCount, Math.round((processedCount / children.length) * 100), jobId).run()
    }

    // 7. Link source to conversation/project
    if (conversationId) {
      const linkId = crypto.randomUUID()
      await db.prepare(`
        INSERT INTO conversation_sources (id, conversationId, sourceId, messageId, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).bind(linkId, conversationId, sourceId, messageId || null, Date.now()).run()
    }

    if (projectId) {
      const linkId = crypto.randomUUID()
      await db.prepare(`
        INSERT INTO conversation_sources (id, conversationId, sourceId, projectId, createdAt)
        VALUES (?, NULL, ?, ?, ?)
      `).bind(linkId, sourceId, projectId, Date.now()).run()
    }

    // 8. Mark complete
    await db.prepare('UPDATE pdf_jobs SET status = ?, sourceId = ?, completedAt = ? WHERE id = ?')
      .bind('completed', sourceId, Date.now(), jobId).run()

    console.log(`✅ [PDFProcessor] PDF processing complete: ${children.length} chunks`)
    return { success: true, chunksProcessed: children.length }

  } catch (error: any) {
    console.error(`❌ [PDFProcessor] Processing failed:`, error)
    await db.prepare('UPDATE pdf_jobs SET status = ?, error = ? WHERE id = ?')
      .bind('failed', error.message, jobId).run()
    return { success: false, error: error.message }
  }
}

async function generateHash(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
