import { D1Database } from '@cloudflare/workers-types'
import { randomUUID } from 'crypto'

export const GUEST_CREDITS_LIMIT = 5

export interface GuestSession {
  guest_id: string
  ip_hash: string
  user_agent: string
  credits_remaining: number
  message_count: number
  created_at: string
  last_active: string
}

/**
 * Generate a cryptographically secure guest ID
 */
export function generateGuestId(): string {
  return `guest_${randomUUID()}`
}

/**
 * Hash IP address for privacy
 */
export async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + process.env.IP_HASH_SALT || 'default-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
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
 * Get or create a guest session
 */
export async function getOrCreateGuestSession(
  db: D1Database,
  request: Request
): Promise<GuestSession | null> {
  const guestId = getGuestIdFromRequest(request)
  const ip = getClientIP(request)
  const ipHash = await hashIP(ip)
  const userAgent = request.headers.get('user-agent') || ''

  if (guestId) {
    // Check if guest session exists
    const existing = await db
      .prepare(
        'SELECT * FROM guest_sessions WHERE guest_id = ? LIMIT 1'
      )
      .bind(guestId)
      .first<GuestSession>()

    if (existing) {
      // Update last_active
      await db
        .prepare(
          'UPDATE guest_sessions SET last_active = CURRENT_TIMESTAMP WHERE guest_id = ?'
        )
        .bind(guestId)
        .run()

      return existing
    }
  }

  // Check IP verification for daily limit across ALL sessions for this IP
  // User feedback: 24h is too short, extending to 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
  const ipUsage = await db
    .prepare(
      `SELECT SUM(message_count) as total_messages 
       FROM guest_sessions 
       WHERE ip_hash = ? AND created_at > ?`
    )
    .bind(ipHash, sevenDaysAgo)
    .first<{ total_messages: number }>()

  const usedMessages = ipUsage?.total_messages || 0
  const remainingDailyCredits = Math.max(0, GUEST_CREDITS_LIMIT - usedMessages)

  // Generate new guest ID if one wasn't provided or didn't exist
  const newGuestId = guestId || generateGuestId()

  // Create new guest session
  const newSession: GuestSession = {
    guest_id: newGuestId,
    ip_hash: ipHash,
    user_agent: userAgent,
    credits_remaining: remainingDailyCredits, // Give only what's left for this IP
    message_count: 0,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  }

  await db
    .prepare(
      `INSERT INTO guest_sessions (
        guest_id, ip_hash, user_agent, credits_remaining, message_count, created_at, last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      newSession.guest_id,
      newSession.ip_hash,
      newSession.user_agent,
      newSession.credits_remaining,
      newSession.message_count,
      newSession.created_at,
      newSession.last_active
    )
    .run()

  return newSession
}

/**
 * Extract guest ID from request headers or cookies
 */
export function getGuestIdFromRequest(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer guest_')) {
    return authHeader.substring('Bearer '.length)
  }

  // Check cookies
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim())
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=')
      if (name === 'guest_id' && value?.startsWith('guest_')) {
        return value
      }
    }
  }

  // Check query parameter (for GET requests)
  const url = new URL(request.url)
  const guestId = url.searchParams.get('guest_id')
  if (guestId?.startsWith('guest_')) {
    return guestId
  }

  return null
}

/**
 * Get guest session by ID
 */
export async function getGuestSession(
  db: D1Database,
  guestId: string
): Promise<GuestSession | null> {
  const session = await db
    .prepare(
      'SELECT * FROM guest_sessions WHERE guest_id = ? LIMIT 1'
    )
    .bind(guestId)
    .first<GuestSession>()

  return session || null
}

/**
 * Decrement guest credits
 */
export async function decrementGuestCredits(
  db: D1Database,
  guestId: string
): Promise<boolean> {
  const session = await getGuestSession(db, guestId)

  if (!session || session.credits_remaining <= 0) {
    return false
  }

  await db
    .prepare(
      'UPDATE guest_sessions SET credits_remaining = credits_remaining - 1, message_count = message_count + 1, last_active = CURRENT_TIMESTAMP WHERE guest_id = ?'
    )
    .bind(guestId)
    .run()

  return true
}

/**
 * Check if guest has remaining credits
 */
export async function checkGuestCredits(
  db: D1Database,
  guestId: string
): Promise<{ hasCredits: boolean; remaining: number }> {
  const session = await getGuestSession(db, guestId)

  if (!session) {
    return { hasCredits: false, remaining: 0 }
  }

  return {
    hasCredits: session.credits_remaining > 0,
    remaining: session.credits_remaining
  }
}

/**
 * Clean up old guest sessions (older than 30 days)
 */
export async function cleanupOldGuestSessions(db: D1Database): Promise<void> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  await db
    .prepare(
      'DELETE FROM guest_sessions WHERE created_at < ?'
    )
    .bind(thirtyDaysAgo.toISOString())
    .run()
}
