// Web Worker for background PDF chunk indexing
// This runs in a separate thread to avoid blocking the UI

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  if (type === 'INGEST_CHUNKS') {
    const { conversationId, messageId, file, chunks, batchSize = 10 } = data;
    
    console.log(`[PDF Worker] Starting ingestion: ${file.name} (${chunks.length} chunks)`);
    
    try {
      // Process chunks in batches to avoid overwhelming the server
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(chunks.length / batchSize);
        
        console.log(`[PDF Worker] Processing batch ${batchNum}/${totalBatches}`);
        
        try {
          // Call API route (not server action, as workers can't use those)
          const response = await fetch('/api/knowledge-base/ingest', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              // Auth is handled server-side via cookies
            },
            body: JSON.stringify({
              conversationId,
              messageId,
              file,
              chunks: batch,
              batchNumber: batchNum,
              totalBatches
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ingestion failed');
          }
          
          // Report progress to main thread
          self.postMessage({
            type: 'PROGRESS',
            data: {
              processed: i + batch.length,
              total: chunks.length,
              percentage: Math.round(((i + batch.length) / chunks.length) * 100),
              batchNum,
              totalBatches
            }
          });
          
        } catch (error) {
          console.error(`[PDF Worker] Batch ${batchNum} failed:`, error);
          
          // Report error but continue with next batch
          self.postMessage({
            type: 'ERROR',
            data: { 
              batch: batchNum, 
              error: error.message,
              canRetry: true
            }
          });
        }
      }
      
      // All batches processed
      console.log('[PDF Worker] Ingestion complete');
      self.postMessage({ 
        type: 'COMPLETE',
        data: {
          file: file.name,
          totalChunks: chunks.length
        }
      });
      
    } catch (error) {
      console.error('[PDF Worker] Fatal error:', error);
      self.postMessage({
        type: 'FATAL_ERROR',
        data: { error: error.message }
      });
    }
  }
});

console.log('[PDF Worker] Worker initialized and ready');
