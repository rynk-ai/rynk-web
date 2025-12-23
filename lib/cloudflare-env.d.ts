import type { D1Database, R2Bucket, Ai } from "@cloudflare/workers-types"

declare module "@cloudflare/next-on-pages" {
  interface CloudflareEnv {
    DB: D1Database
    BUCKET: R2Bucket
    AI: Ai
  }
}
