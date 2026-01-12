/**
 * Custom Worker Entry Point
 * 
 * Re-exports the OpenNext generated fetch handler AND our TaskProcessor DO.
 * See: https://opennext.js.org/cloudflare/howtos/custom-worker
 */

// @ts-ignore - .open-next/worker.js is generated at build time
import openNextHandler from "./.open-next/worker.js";

// Import our custom Durable Object
import { TaskProcessor } from "./lib/durable-objects/task-processor";

// Import PDF processor
import { processPDFFromR2, type PDFJob } from "./lib/services/pdf-processor-server";

// Export default handler for fetch, scheduled, etc.
const handler: ExportedHandler<CloudflareEnv> = {
  fetch: openNextHandler.fetch,
  
  scheduled: async (event, env, ctx) => {
    console.log('[Custom Worker] Scheduled event triggered');
  },

  // Queue handler for PDF processing
  queue: async (batch, env, ctx) => {
    console.log(`[Queue] Processing batch of ${batch.messages.length} messages`);
    
    for (const msg of batch.messages) {
      try {
        const job = msg.body as any; // PDFJob type without 'id' vs 'jobId' mismatch check
        console.log(`[Queue] Processing job: ${job.jobId} for file: ${job.r2Key}`);
        
        await processPDFFromR2(
          env as any, // Cast env to match ProcessingEnv
          job.jobId,
          job.r2Key,
          job.conversationId,
          job.projectId,
          job.messageId
        );
        
        msg.ack();
      } catch (err) {
        console.error(`[Queue] Failed to process message ${msg.id}:`, err);
        // Retry the message if it failed
        msg.retry();
      }
    }
  },
};

export default handler;

// Export our Durable Object class
export { TaskProcessor };
