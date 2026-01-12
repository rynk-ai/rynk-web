import type { D1Database, R2Bucket, Ai, VectorizeIndex, Queue } from "@cloudflare/workers-types"

declare module "@cloudflare/next-on-pages" {
  interface CloudflareEnv {
    DB: D1Database
    BUCKET: R2Bucket
    AI: Ai
    VECTORIZE_INDEX: VectorizeIndex
    PDF_QUEUE: Queue<any>
  }
}
