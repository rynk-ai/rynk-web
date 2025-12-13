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

// Export default handler for fetch, scheduled, etc.
const handler: ExportedHandler<CloudflareEnv> = {
  fetch: openNextHandler.fetch,
  scheduled: async (event, env, ctx) => {
    console.log('[Custom Worker] Scheduled event triggered');
  },
};

export default handler;

// Export our Durable Object class
export { TaskProcessor };
