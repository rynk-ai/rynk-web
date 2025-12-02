import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { knowledgeBase } from '@/lib/services/knowledge-base'
import { vectorDb } from '@/lib/services/vector-db'

/**
 * POST /api/knowledge-base/ingest
 * Receives pre-processed chunks and stores them with embeddings
 * Supports both conversation-level and project-level sources
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any
    const { conversationId, messageId, projectId, file, chunks, batchNumber, totalBatches } = body
    
    console.log('[Ingest API] Received chunks:', {
      conversationId,
      messageId,
      projectId,
      fileName: file?.name,
      chunkCount: chunks?.length,
      batch: `${batchNumber}/${totalBatches}`
    })
    
    // Validate required fields
    if (!file || !chunks || chunks.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: file or chunks' },
        { status: 400 }
      )
    }

    // Either conversationId or projectId must be provided
    if (!conversationId && !projectId) {
      return NextResponse.json(
        { error: 'Either conversationId or projectId must be provided' },
        { status: 400 }
      )
    }
    
    const isFirstBatch = batchNumber === 1
    const isLastBatch = batchNumber === totalBatches
    
    // Ingest the chunks
    const sourceId = await knowledgeBase.ingestProcessedSource(
      conversationId || '', // Empty string for project files
      {
        name: file.name,
        type: file.type,
        r2Key: file.r2Url,
        metadata: file.metadata || {}
      },
      chunks,
      messageId,
      isFirstBatch,
      isLastBatch
    )
    
    // If this is a project file and it's the first batch, link to project
    if (projectId && isFirstBatch) {
      console.log(`[Ingest API] Linking source ${sourceId} to project ${projectId}`)
      await vectorDb.linkSourceToProject(projectId, sourceId)
    }
    
    return NextResponse.json({ 
      success: true, 
      sourceId,
      batch: batchNumber,
      totalBatches
    })
  } catch (error) {
    console.error('[Ingest API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to ingest chunks' },
      { status: 500 }
    )
  }
}
