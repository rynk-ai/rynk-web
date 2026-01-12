import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'



interface ProcessRequest {
  r2Key: string
  conversationId?: string
  projectId?: string
  messageId?: string
  fileName?: string
}

/**
 * POST /api/pdf/process
 * Triggers async PDF processing via Cloudflare Queue
 */
export async function POST(request: NextRequest) {
  try {
    const body: ProcessRequest = await request.json()
    const { r2Key, conversationId, projectId, messageId, fileName } = body

    if (!r2Key) {
      return NextResponse.json(
        { error: 'r2Key is required' },
        { status: 400 }
      )
    }

    const ctx = getCloudflareContext()
    const db = ctx.env.DB
    const queue = ctx.env.PDF_QUEUE

    if (!queue) {
      // Fallback: process synchronously if queue not available
      console.warn('⚠️ [PDF Process] Queue not available, processing synchronously')
      const { processPDFFromR2 } = await import('@/lib/services/pdf-processor-server')
      const jobId = crypto.randomUUID()
      
      // Create job record
      await db.prepare(`
        INSERT INTO pdf_jobs (id, r2Key, conversationId, projectId, messageId, status)
        VALUES (?, ?, ?, ?, ?, 'processing')
      `).bind(jobId, r2Key, conversationId || null, projectId || null, messageId || null).run()

      // Process synchronously
      const result = await processPDFFromR2(
        ctx.env,
        jobId,
        r2Key,
        conversationId,
        projectId,
        messageId
      )

      return NextResponse.json({
        jobId,
        status: result.success ? 'completed' : 'failed',
        error: result.error
      })
    }

    // Create job record
    const jobId = crypto.randomUUID()
    await db.prepare(`
      INSERT INTO pdf_jobs (id, r2Key, conversationId, projectId, messageId, status)
      VALUES (?, ?, ?, ?, ?, 'queued')
    `).bind(jobId, r2Key, conversationId || null, projectId || null, messageId || null).run()

    // Enqueue for async processing
    await queue.send({
      jobId,
      r2Key,
      conversationId,
      projectId,
      messageId,
      fileName
    })

    console.log(`📄 [PDF Process] Queued job ${jobId} for ${r2Key}`)

    return NextResponse.json({
      jobId,
      status: 'queued',
      message: 'PDF processing started'
    })

  } catch (error: any) {
    console.error('❌ [PDF Process] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process PDF' },
      { status: 500 }
    )
  }
}
