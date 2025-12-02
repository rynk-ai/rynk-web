import { useState, useRef, useCallback, useEffect } from 'react';

import { isPDFFile } from '@/lib/utils/file-converter';

export interface IndexingJob {
  id: string;
  fileName: string;
  conversationId?: string; // Made optional for project-level indexing
  messageId?: string; // Made optional for project-level indexing
  projectId?: string; // NEW: For project-level attachments
  status: 'pending' | 'parsing' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalChunks?: number;
  processedChunks?: number;
  error?: string;
}

export function useIndexingQueue() {
  const [jobs, setJobs] = useState<IndexingJob[]>([]);
  const workerRef = useRef<Worker | null>(null);


  // Initialize worker on first use
  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      try {
        workerRef.current = new Worker('/workers/pdf-indexer.worker.js');
        
        workerRef.current.onmessage = (event) => {
          const { type, data } = event.data;
          
          if (type === 'PROGRESS') {
            // Update job progress
            setJobs(prev => prev.map(job => 
              job.status === 'processing' 
                ? {
                    ...job,
                    progress: data.percentage,
                    processedChunks: data.processed,
                    totalChunks: data.total
                  }
                : job
            ));


          } else if (type === 'COMPLETE') {
            // Mark job as completed
            setJobs(prev => prev.map(job =>
              job.status === 'processing'
                ? { ...job, status: 'completed', progress: 100 }
                : job
            ));


          } else if (type === 'ERROR') {
            console.error(`[Indexing Queue] Batch ${data.batch} error:`, data.error);
            
            // Continue processing, just log the error

          } else if (type === 'FATAL_ERROR') {
            // Mark job as failed
            setJobs(prev => prev.map(job =>
              job.status === 'processing'
                ? { ...job, status: 'failed', error: data.error }
                : job
            ));


          }
        };

        workerRef.current.onerror = (error) => {
          console.error('[Indexing Queue] Worker error:', error);

        };

        console.log('[Indexing Queue] Worker initialized');
      } catch (error) {
        console.error('[Indexing Queue] Failed to initialize worker:', error);

      }
    }
    return workerRef.current;
  }, [jobs]);

  /**
   * Enqueue a PDF file for background indexing
   */
  const enqueueFile = useCallback(async (
    file: File,
    conversationId: string,
    messageId: string,
    r2Url: string | Promise<string>
  ): Promise<string> => { // ← Return job ID for tracking
    if (!isPDFFile(file)) {
      console.warn('[Indexing Queue] Not a PDF file, skipping:', file.name);
      return '';
    }

    const jobId = crypto.randomUUID();
    
    console.log('[Indexing Queue] Enqueueing file:', file.name);

    // Add job to queue
    setJobs(prev => [...prev, {
      id: jobId,
      fileName: file.name,
      conversationId,
      messageId,
      status: 'pending',
      progress: 0
    }]);

    try {
      // Update status to parsing
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'parsing' } : j
      ));

      // Parse PDF on client-side
      const { processPDF } = await import('@/lib/utils/pdf-processor');
      const processedPDF = await processPDF(file, (progress) => {
        console.log(`[Indexing Queue] Parse progress: ${progress.stage} ${progress.current}/${progress.total}`);
      });

      console.log(`[Indexing Queue] PDF parsed: ${processedPDF.chunks.length} chunks`);

      // Update status to processing
      setJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { ...j, status: 'processing', totalChunks: processedPDF.chunks.length, processedChunks: 0 } 
          : j
      ));



      // Initialize worker and send chunks
      const worker = initWorker();
      if (!worker) {
        throw new Error('Worker not initialized');
      }

      // Wait for R2 URL if it's a promise
      let resolvedR2Url = '';
      if (r2Url instanceof Promise) {
        console.log(`[Indexing Queue] Waiting for R2 upload to complete for ${file.name}...`);
        resolvedR2Url = await r2Url;
        console.log(`[Indexing Queue] R2 upload complete for ${file.name}`);
      } else {
        resolvedR2Url = r2Url;
      }

      worker.postMessage({
        type: 'INGEST_CHUNKS',
        data: {
          conversationId,
          messageId,
          file: {
            name: file.name,
            type: file.type,
            r2Url: resolvedR2Url,
            metadata: processedPDF.metadata
          },
          chunks: processedPDF.chunks,
          batchSize: 10 // Process 10 chunks at a time (worker handles concurrency)
        }
      });

    } catch (error: any) {
      console.error('[Indexing Queue] Failed to process file:', error);
      setJobs(prev => prev.map(j =>
        j.id === jobId
          ? { ...j, status: 'failed', error: error.message }
          : j
      ));

    }
    
    return jobId; // ← Return the ID
  }, [initWorker]);

  /**
   * Enqueue a file for project-level background indexing
   * Supports PDFs, code files, markdown, text files, etc.
   */
  const enqueueProjectFile = useCallback(async (
    file: File,
    projectId: string,
    r2Url: string | Promise<string>
  ): Promise<string> => {
    const jobId = crypto.randomUUID();
    
    console.log('[Indexing Queue] Enqueueing project file:', file.name);

    // Add job to queue
    setJobs(prev => [...prev, {
      id: jobId,
      fileName: file.name,
      projectId,
      status: 'pending',
      progress: 0
    }]);

    try {
      // Update status to parsing
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'parsing' } : j
      ));

      // Process file (PDFs, code, markdown, etc.)
      const { processFile } = await import('@/lib/utils/universal-file-processor');
      const processedFile = await processFile(file, (progress) => {
        console.log(`[Indexing Queue] Parse progress: ${progress.stage} ${progress.current}/${progress.total}`);
      });

      console.log(`[Indexing Queue] File parsed: ${processedFile.chunks.length} chunks`);

      if (processedFile.chunks.length === 0) {
        console.warn(`[Indexing Queue] No chunks extracted from ${file.name}, skipping`);
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: 'completed', progress: 100 } : j
        ));
        return jobId;
      }

      // Update status to processing
      setJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { ...j, status: 'processing', totalChunks: processedFile.chunks.length, processedChunks: 0 } 
          : j
      ));

      // Initialize worker and send chunks
      const worker = initWorker();
      if (!worker) {
        throw new Error('Worker not initialized');
      }

      // Wait for R2 URL if it's a promise
      let resolvedR2Url = '';
      if (r2Url instanceof Promise) {
        console.log(`[Indexing Queue] Waiting for R2 upload to complete for ${file.name}...`);
        resolvedR2Url = await r2Url;
        console.log(`[Indexing Queue] R2 upload complete for ${file.name}`);
      } else {
        resolvedR2Url = r2Url;
      }

      worker.postMessage({
        type: 'INGEST_CHUNKS',
        data: {
          projectId, // Pass projectId instead of conversationId/messageId
          file: {
            name: file.name,
            type: file.type,
            r2Url: resolvedR2Url,
            metadata: processedFile.metadata
          },
          chunks: processedFile.chunks,
          batchSize: 10
        }
      });

    } catch (error: any) {
      console.error('[Indexing Queue] Failed to process project file:', error);
      setJobs(prev => prev.map(j =>
        j.id === jobId
          ? { ...j, status: 'failed', error: error.message }
          : j
      ));
    }
    
    return jobId;
  }, [initWorker]);

  /**
   * Get currently processing jobs
   */
  const getActiveJobs = useCallback(() => {
    return jobs.filter(j => j.status === 'processing' || j.status === 'parsing');
  }, [jobs]);

  /**
   * Clean up worker on unmount
   */
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return {
    jobs,
    enqueueFile,
    enqueueProjectFile, // NEW
    getActiveJobs,
    isProcessing: jobs.some(j => j.status === 'processing' || j.status === 'parsing')
  };
}
