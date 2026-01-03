import { D1Database } from '@cloudflare/workers-types'

export const HUMANIZER_RATE_LIMIT = 30
export const HUMANIZER_WINDOW_HOURS = 2

/**
 * Hash IP address for privacy (edge-compatible)
 */
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + (process.env.IP_HASH_SALT || 'default-salt'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Get client IP from request headers
 */
function getClientIP(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    return xff.split(',')[0].trim()
  }
  const xri = request.headers.get('x-real-ip')
  if (xri) {
    return xri
  }
  return '127.0.0.1'
}

export interface HumanizerRateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  requestCount: number
}

/**
 * Check if request is within rate limit for humanizer
 */
export async function checkHumanizerRateLimit(
  db: D1Database,
  request: Request
): Promise<HumanizerRateLimitResult> {
  const ip = getClientIP(request)
  const ipHash = await hashIP(ip)
  const now = new Date()
  
  // Calculate window boundaries
  const windowMs = HUMANIZER_WINDOW_HOURS * 60 * 60 * 1000
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs)
  const windowEnd = new Date(windowStart.getTime() + windowMs)
  
  // Get current usage for this IP in this window
  const existing = await db
    .prepare(
      'SELECT request_count, window_start FROM humanizer_limits WHERE ip_hash = ? LIMIT 1'
    )
    .bind(ipHash)
    .first<{ request_count: number; window_start: string }>()
  
  if (!existing) {
    // No record exists, user is allowed
    return {
      allowed: true,
      remaining: HUMANIZER_RATE_LIMIT,
      resetAt: windowEnd,
      requestCount: 0
    }
  }
  
  const recordWindowStart = new Date(existing.window_start)
  
  // Check if the record is from a previous window
  if (recordWindowStart < windowStart) {
    // Old window, reset allowed
    return {
      allowed: true,
      remaining: HUMANIZER_RATE_LIMIT,
      resetAt: windowEnd,
      requestCount: 0
    }
  }
  
  // Same window, check limit
  const remaining = Math.max(0, HUMANIZER_RATE_LIMIT - existing.request_count)
  const allowed = existing.request_count < HUMANIZER_RATE_LIMIT
  
  return {
    allowed,
    remaining,
    resetAt: windowEnd,
    requestCount: existing.request_count
  }
}

/**
 * Increment humanizer usage for an IP
 */
export async function incrementHumanizerUsage(
  db: D1Database,
  request: Request
): Promise<void> {
  const ip = getClientIP(request)
  const ipHash = await hashIP(ip)
  const now = new Date()
  
  // Calculate window start
  const windowMs = HUMANIZER_WINDOW_HOURS * 60 * 60 * 1000
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs)
  
  // Upsert the record
  await db
    .prepare(
      `INSERT INTO humanizer_limits (ip_hash, request_count, window_start, last_request)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(ip_hash) DO UPDATE SET
         request_count = CASE 
           WHEN window_start < ? THEN 1 
           ELSE request_count + 1 
         END,
         window_start = CASE 
           WHEN window_start < ? THEN ? 
           ELSE window_start 
         END,
         last_request = ?`
    )
    .bind(
      ipHash,
      windowStart.toISOString(),
      now.toISOString(),
      windowStart.toISOString(),
      windowStart.toISOString(),
      windowStart.toISOString(),
      now.toISOString()
    )
    .run()
}

/**
 * Get rate limit info without incrementing (for display purposes)
 */
export async function getHumanizerRateLimitInfo(
  db: D1Database,
  request: Request
): Promise<{ remaining: number; resetAt: Date }> {
  const result = await checkHumanizerRateLimit(db, request)
  return {
    remaining: result.remaining,
    resetAt: result.resetAt
  }
}
