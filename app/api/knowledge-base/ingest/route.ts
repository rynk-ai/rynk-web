import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { knowledgeBase } from '@/lib/services/knowledge-base';

/**
 * API Route for PDF chunk ingestion called by Web Worker
 * Receives pre-processed chunks and stores them with embeddings
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { conversationId, messageId, file, chunks, batchNumber, totalBatches } = await request.json() as any;

    // Validate input
    if (!conversationId || !messageId || !file || !chunks || !Array.isArray(chunks)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[API /ingest] Batch ${batchNumber}/${totalBatches}: ${chunks.length} chunks for ${file.name}`);

    // Use existing ingestProcessedSource method from knowledge base service
    const sourceId = await knowledgeBase.ingestProcessedSource(
      conversationId,
      {
        name: file.name,
        type: file.type,
        r2Key: file.r2Url || '',
        metadata: file.metadata || {}
      },
      chunks,
      messageId,
      batchNumber === 1, // isFirstBatch
      batchNumber === totalBatches // isLastBatch - will trigger indexing verification
    );

    console.log(`✅ [API /ingest] Batch ${batchNumber}/${totalBatches} complete, sourceId: ${sourceId}`);

    return Response.json({ 
      success: true, 
      sourceId,
      batch: batchNumber, 
      totalBatches,
      chunksProcessed: chunks.length
    });

  } catch (error: any) {
    console.error('[API /ingest] Error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { 
      status: 500 
    });
  }
}
