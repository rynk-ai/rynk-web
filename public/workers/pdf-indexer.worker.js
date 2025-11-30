// Web Worker for background PDF chunk indexing
// This runs in a separate thread to avoid blocking the UI

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  if (type === 'INGEST_CHUNKS') {
    const { conversationId, messageId, file, chunks, batchSize = 10 } = data;
    
    console.log(`[PDF Worker] Starting ingestion: ${file.name} (${chunks.length} chunks)`);
    
    try {
      // Process chunks in batches with concurrency limit
      const CONCURRENCY_LIMIT = 5;
      const totalBatches = Math.ceil(chunks.length / batchSize);
      let activeRequests = 0;
      let nextBatchIndex = 0;
      
      console.log(`[PDF Worker] Processing ${totalBatches} batches with concurrency ${CONCURRENCY_LIMIT}`);

      // Helper to process a single batch
      const processBatch = async (batchNum) => {
        const startIdx = (batchNum - 1) * batchSize;
        const batch = chunks.slice(startIdx, startIdx + batchSize);
        
        console.log(`[PDF Worker] Processing batch ${batchNum}/${totalBatches}`);
        
        try {
          const response = await fetch('/api/knowledge-base/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
          
          // Report progress
          // Calculate processed count based on completed batches
          // This is an approximation since batches complete out of order
          self.postMessage({
            type: 'PROGRESS',
            data: {
              processed: Math.min((batchNum * batchSize), chunks.length), // Approximate
              total: chunks.length,
              percentage: Math.round((batchNum / totalBatches) * 100), // Approximate based on batch number
              batchNum,
              totalBatches
            }
          });
          
        } catch (error) {
          console.error(`[PDF Worker] Batch ${batchNum} failed:`, error);
          self.postMessage({
            type: 'ERROR',
            data: { 
              batch: batchNum, 
              error: error.message,
              canRetry: true
            }
          });
        }
      };

      // Queue manager
      const processQueue = async () => {
        const promises = [];
        
        while (nextBatchIndex < totalBatches) {
          // Fill up to concurrency limit
          while (activeRequests < CONCURRENCY_LIMIT && nextBatchIndex < totalBatches) {
            nextBatchIndex++;
            const currentBatch = nextBatchIndex;
            activeRequests++;
            
            const promise = processBatch(currentBatch).finally(() => {
              activeRequests--;
            });
            promises.push(promise);
          }
          
          // Wait for at least one to finish before checking loop again
          // Actually, we can just wait for all current promises to settle if we want simple batching,
          // but for true pool behavior we should race. 
          // For simplicity in a worker, `Promise.all` on a chunk of promises is easier but less efficient.
          // Let's use a simple pool approach:
          if (activeRequests >= CONCURRENCY_LIMIT) {
             await Promise.race(promises.filter(p => p)); // Wait for one to finish
             // Clean up finished promises? Hard to track which one finished in this simple array.
             // A better way is just to await a small delay or use a proper pool library.
             // Since we don't have a library, let's use a recursive approach or just `Promise.all` on chunks of batches?
             // `Promise.all` on chunks of batches is easier to implement and "good enough".
             // But we want "sliding window".
             
             // Let's stick to the simple "Promise.all" for groups of CONCURRENCY_LIMIT for safety and simplicity first.
             // It's much better than sequential anyway.
             // Actually, let's do the proper sliding window.
          }
          
          // Wait a tiny bit to yield event loop
          await new Promise(r => setTimeout(r, 10));
        }
        
        // Wait for remaining
        await Promise.all(promises);
      };

      // Alternative simple implementation:
      // Create an array of functions that return promises
      const queue = Array.from({ length: totalBatches }, (_, i) => () => processBatch(i + 1));
      
      // Execute with concurrency
      async function runConcurrent(tasks, limit) {
        const results = [];
        const executing = [];
        
        for (const task of tasks) {
          const p = task().then(result => {
            executing.splice(executing.indexOf(p), 1);
            return result;
          });
          results.push(p);
          executing.push(p);
          
          if (executing.length >= limit) {
            await Promise.race(executing);
          }
        }
        
        return Promise.all(results);
      }
      
      await runConcurrent(queue, CONCURRENCY_LIMIT);
      
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
