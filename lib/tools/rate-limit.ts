import { D1Database } from '@cloudflare/workers-types'
import { auth } from '@/lib/auth'

export interface ToolConfig {
  name: string;
  guestDailyLimit: number;
  creditCost: number;
  windowHours: number;
}

export const TOOL_CONFIG: Record<string, ToolConfig> = {
  humanizer: {
    name: 'AI Humanizer',
    guestDailyLimit: 3,
    creditCost: 1,
    windowHours: 24,
  },
  "youtube-research": {
    name: 'YouTube Research',
    guestDailyLimit: 1,
    creditCost: 5,
    windowHours: 24,
  },
  extension: {
    name: 'Rynk Companion',
    guestDailyLimit: 10,
    creditCost: 1, 
    windowHours: 24,
  },
  detector: {
    name: 'AI Detector',
    guestDailyLimit: 5,
    creditCost: 1,
    windowHours: 24,
  },
};

export type ToolId = keyof typeof TOOL_CONFIG

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt?: Date
  isGuest: boolean
  error?: string
}

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

/**
 * Check and Consume Rate Limit (Hybrid: Guest vs User)
 */
export async function checkAndConsumeToolLimit(
  db: D1Database,
  request: Request,
  toolId: ToolId
): Promise<RateLimitResult> {
  const session = await auth()
  const user = session?.user
  
  const config = TOOL_CONFIG[toolId]
  if (!config) throw new Error(`Invalid tool ID: ${toolId}`)

  if (user?.id) {
    // --- AUTHENTICATED USER FLOW ---
    // Check credits
    const userCredits = await db
      .prepare('SELECT credits_remaining FROM user_credits WHERE user_id = ?')
      .bind(user.id)
      .first<{ credits_remaining: number }>()

    // Default to free credits if no record (e.g. new user)
    // We should probably auto-create the record here or trigger it on signup
    // For now, let's assume if no record, they get a starter pack or we insert it
    let credits = userCredits?.credits_remaining
    
    if (credits === undefined) {
      // Initialize new user
      await db.prepare(
        'INSERT INTO user_credits (user_id, credits_remaining, last_refill_date) VALUES (?, 1000, ?)'
      ).bind(user.id, new Date().toISOString()).run()
      credits = 1000
    }

    if (credits < config.creditCost) {
      return {
        allowed: false,
        remaining: credits,
        isGuest: false,
        error: 'Insufficient credits',
      }
    }

    // Deduct credits
    await db.prepare(
      'UPDATE user_credits SET credits_remaining = credits_remaining - ?, total_credits_used = total_credits_used + ? WHERE user_id = ?'
    ).bind(config.creditCost, config.creditCost, user.id).run()

    return {
      allowed: true,
      remaining: credits - config.creditCost,
      isGuest: false,
    }

  } else {
    // --- GUEST FLOW (IP BASED) ---
    const ip = getClientIP(request)
    const ipHash = await hashIP(ip)
    const now = new Date()
    
    const windowMs = config.windowHours * 60 * 60 * 1000
    // Calculate window start (e.g. rolling 24h or fixed daily? Let's do rolling for simplicity or fixed blocks?
    // Implementation plan said "daily limit". Let's do "reset after X hours since first request" or "fixed daily buckets".
    // "Fixed buckets" (e.g. resets at midnight) is easier for "Daily limit".
    // "Rolling window" is fairer.
    // Let's stick to the logic from `humanizer.ts` but adapted: window buckets.
    const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs)
    const windowEnd = new Date(windowStart.getTime() + windowMs)

    const existing = await db
      .prepare(
        'SELECT request_count, window_start FROM tool_guest_limits WHERE ip_hash = ? AND tool_id = ?'
      )
      .bind(ipHash, toolId)
      .first<{ request_count: number; window_start: string }>()

    let currentCount = 0
    
    if (existing) {
      const recordWindowStart = new Date(existing.window_start)
      if (recordWindowStart >= windowStart) {
        currentCount = existing.request_count
      }
    }

    if (currentCount >= config.guestDailyLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowEnd,
        isGuest: true,
        error: 'Daily limit exceeded',
      }
    }

    // Increment usage
    await db.prepare(
       `INSERT INTO tool_guest_limits (ip_hash, tool_id, request_count, window_start, last_request)
        VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(ip_hash, tool_id) DO UPDATE SET
          request_count = CASE 
            WHEN window_start < ? THEN 1 
            ELSE request_count + 1 
          END,
          window_start = CASE 
            WHEN window_start < ? THEN ? 
            ELSE window_start 
          END,
          last_request = ?`
    ).bind(
      ipHash, toolId, windowStart.toISOString(), now.toISOString(),
      windowStart.toISOString(), // check
      windowStart.toISOString(), // check
      windowStart.toISOString(), // new window start
      now.toISOString()
    ).run()

    return {
      allowed: true,
      remaining: config.guestDailyLimit - (currentCount + 1),
      resetAt: windowEnd,
      isGuest: true,
    }
  }
}

/**
 * Get Rate Limit Info (Read Only)
 */
export async function getToolLimitInfo(
  db: D1Database,
  request: Request,
  toolId: ToolId
): Promise<RateLimitResult> {
  const session = await auth()
  const user = session?.user
  const config = TOOL_CONFIG[toolId]

  if (user?.id) {
    const userCredits = await db
      .prepare('SELECT credits_remaining FROM user_credits WHERE user_id = ?')
      .bind(user.id)
      .first<{ credits_remaining: number }>()
    
    return {
      allowed: true, // Info only
      remaining: userCredits?.credits_remaining ?? 1000,
      isGuest: false,
    }
  } else {
    const ip = getClientIP(request)
    const ipHash = await hashIP(ip)
    const now = new Date()
    const windowMs = config.windowHours * 60 * 60 * 1000
    const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs)
    const windowEnd = new Date(windowStart.getTime() + windowMs)

    const existing = await db
      .prepare(
        'SELECT request_count, window_start FROM tool_guest_limits WHERE ip_hash = ? AND tool_id = ?'
      )
      .bind(ipHash, toolId)
      .first<{ request_count: number; window_start: string }>()

    let currentCount = 0
    if (existing) {
      const recordWindowStart = new Date(existing.window_start)
      if (recordWindowStart >= windowStart) {
        currentCount = existing.request_count
      }
    }

    return {
      allowed: currentCount < config.guestDailyLimit,
      remaining: Math.max(0, config.guestDailyLimit - currentCount),
      resetAt: windowEnd,
      isGuest: true,
    }
  }
}
