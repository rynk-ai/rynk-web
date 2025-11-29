import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { isPDFFile } from '@/lib/utils/file-converter';

export interface IndexingJob {
  id: string;
  fileName: string;
  conversationId: string;
  messageId: string;
  status: 'pending' | 'parsing' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalChunks?: number;
  processedChunks?: number;
  error?: string;
}

export function useIndexingQueue() {
  const [jobs, setJobs] = useState<IndexingJob[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

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

            // Update toast
            const currentJob = jobs.find(j => j.status === 'processing');
            if (currentJob && toastIdRef.current) {
              toast.loading(
                `Indexing ${currentJob.fileName}... ${data.percentage}%`,
                { id: toastIdRef.current }
              );
            }
          } else if (type === 'COMPLETE') {
            // Mark job as completed
            setJobs(prev => prev.map(job =>
              job.status === 'processing'
                ? { ...job, status: 'completed', progress: 100 }
                : job
            ));

            // Show success toast
            if (toastIdRef.current) {
              toast.success(`PDF indexed: ${data.file}`, { id: toastIdRef.current });
              toastIdRef.current = null;
            }
          } else if (type === 'ERROR') {
            console.error(`[Indexing Queue] Batch ${data.batch} error:`, data.error);
            
            // Continue processing, just log the error
            if (data.canRetry) {
              toast.error(`Batch ${data.batch} failed, retrying...`, { duration: 2000 });
            }
          } else if (type === 'FATAL_ERROR') {
            // Mark job as failed
            setJobs(prev => prev.map(job =>
              job.status === 'processing'
                ? { ...job, status: 'failed', error: data.error }
                : job
            ));

            if (toastIdRef.current) {
              toast.error(`Indexing failed: ${data.error}`, { id: toastIdRef.current });
              toastIdRef.current = null;
            }
          }
        };

        workerRef.current.onerror = (error) => {
          console.error('[Indexing Queue] Worker error:', error);
          toast.error('PDF indexing worker error');
        };

        console.log('[Indexing Queue] Worker initialized');
      } catch (error) {
        console.error('[Indexing Queue] Failed to initialize worker:', error);
        toast.error('Failed to initialize PDF indexing');
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
    r2Url: string
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

      // Show loading toast
      toastIdRef.current = toast.loading(`Indexing ${file.name}... 0%`);

      // Initialize worker and send chunks
      const worker = initWorker();
      if (!worker) {
        throw new Error('Worker not initialized');
      }

      worker.postMessage({
        type: 'INGEST_CHUNKS',
        data: {
          conversationId,
          messageId,
          file: {
            name: file.name,
            type: file.type,
            r2Url,
            metadata: processedPDF.metadata
          },
          chunks: processedPDF.chunks,
          batchSize: 10 // Process 10 chunks at a time
        }
      });

    } catch (error: any) {
      console.error('[Indexing Queue] Failed to process file:', error);
      setJobs(prev => prev.map(j =>
        j.id === jobId
          ? { ...j, status: 'failed', error: error.message }
          : j
      ));
      toast.error(`Failed to process ${file.name}: ${error.message}`);
    }
    
    return jobId; // ← Return the ID
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
    getActiveJobs,
    isProcessing: jobs.some(j => j.status === 'processing' || j.status === 'parsing')
  };
}
