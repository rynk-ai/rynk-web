import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'



/**
 * GET /api/pdf/status/[jobId]
 * Returns the current status of a PDF processing job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      )
    }

    const ctx = getCloudflareContext()
    const db = ctx.env.DB

    const job = await db.prepare(`
      SELECT id, r2Key, conversationId, projectId, messageId, sourceId,
             status, progress, totalChunks, processedChunks, error,
             createdAt, completedAt
      FROM pdf_jobs WHERE id = ?
    `).bind(jobId).first()

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress || 0,
      totalChunks: job.totalChunks,
      processedChunks: job.processedChunks,
      sourceId: job.sourceId,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    })

  } catch (error: any) {
    console.error('❌ [PDF Status] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get job status' },
      { status: 500 }
    )
  }
}
