/**
 * Finance Cache Service
 * 
 * Caches financial data from Yahoo Finance and CoinGecko with TTL-based invalidation.
 * Uses D1 database for persistence.
 */

// Cache TTLs in seconds
export const CACHE_TTL = {
  QUOTE: 60,              // 1 minute for real-time quotes
  HISTORY_1D: 300,        // 5 minutes for intraday
  HISTORY_1MO: 3600,      // 1 hour for monthly+
  FUNDAMENTALS: 86400,    // 24 hours for fundamentals
  NEWS: 900,              // 15 minutes for news
} as const

export type CacheDataType = 'quote' | 'history_1d' | 'history_5d' | 'history_1mo' | 'history_1y' | 'fundamentals' | 'news'

interface CacheEntry {
  id: string
  source: string
  symbol: string
  data_type: string
  data: string
  created_at: number
  expires_at: number
}

/**
 * Get TTL for a data type
 */
function getTTL(dataType: CacheDataType): number {
  switch (dataType) {
    case 'quote':
      return CACHE_TTL.QUOTE
    case 'history_1d':
      return CACHE_TTL.HISTORY_1D
    case 'history_5d':
    case 'history_1mo':
    case 'history_1y':
      return CACHE_TTL.HISTORY_1MO
    case 'fundamentals':
      return CACHE_TTL.FUNDAMENTALS
    case 'news':
      return CACHE_TTL.NEWS
    default:
      return CACHE_TTL.QUOTE
  }
}

/**
 * Generate cache key
 */
function getCacheKey(source: string, symbol: string, dataType: CacheDataType): string {
  return `${source}:${symbol.toLowerCase()}:${dataType}`
}

/**
 * Finance Cache class
 */
export class FinanceCache {
  private db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  /**
   * Get cached data if valid
   */
  async get<T>(source: string, symbol: string, dataType: CacheDataType): Promise<T | null> {
    const key = getCacheKey(source, symbol, dataType)
    const now = Math.floor(Date.now() / 1000)

    try {
      const result = await this.db
        .prepare('SELECT data FROM finance_cache WHERE id = ? AND expires_at > ?')
        .bind(key, now)
        .first<{ data: string }>()

      if (result?.data) {
        console.log(`[FinanceCache] HIT: ${key}`)
        return JSON.parse(result.data) as T
      }

      console.log(`[FinanceCache] MISS: ${key}`)
      return null
    } catch (error) {
      console.error('[FinanceCache] Get error:', error)
      return null
    }
  }

  /**
   * Set cache data with TTL
   */
  async set<T>(source: string, symbol: string, dataType: CacheDataType, data: T): Promise<void> {
    const key = getCacheKey(source, symbol, dataType)
    const now = Math.floor(Date.now() / 1000)
    const ttl = getTTL(dataType)
    const expiresAt = now + ttl

    try {
      await this.db
        .prepare(`
          INSERT OR REPLACE INTO finance_cache (id, source, symbol, data_type, data, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(key, source, symbol.toLowerCase(), dataType, JSON.stringify(data), now, expiresAt)
        .run()

      console.log(`[FinanceCache] SET: ${key} (TTL: ${ttl}s)`)
    } catch (error) {
      console.error('[FinanceCache] Set error:', error)
    }
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(source: string, symbol: string, dataType: CacheDataType): Promise<void> {
    const key = getCacheKey(source, symbol, dataType)

    try {
      await this.db
        .prepare('DELETE FROM finance_cache WHERE id = ?')
        .bind(key)
        .run()

      console.log(`[FinanceCache] INVALIDATED: ${key}`)
    } catch (error) {
      console.error('[FinanceCache] Invalidate error:', error)
    }
  }

  /**
   * Invalidate all cache for a symbol
   */
  async invalidateSymbol(source: string, symbol: string): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM finance_cache WHERE source = ? AND symbol = ?')
        .bind(source, symbol.toLowerCase())
        .run()

      console.log(`[FinanceCache] INVALIDATED ALL: ${source}:${symbol}`)
    } catch (error) {
      console.error('[FinanceCache] InvalidateSymbol error:', error)
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<number> {
    const now = Math.floor(Date.now() / 1000)

    try {
      const result = await this.db
        .prepare('DELETE FROM finance_cache WHERE expires_at < ?')
        .bind(now)
        .run()

      const deleted = result.meta?.changes || 0
      console.log(`[FinanceCache] CLEANUP: Removed ${deleted} expired entries`)
      return deleted
    } catch (error) {
      console.error('[FinanceCache] Cleanup error:', error)
      return 0
    }
  }
}

/**
 * Get FinanceCache instance with Cloudflare D1 binding
 */
export async function getFinanceCache(): Promise<FinanceCache | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = getCloudflareContext()
    
    if (env.DB) {
      return new FinanceCache(env.DB)
    }
    
    console.warn('[FinanceCache] D1 database not available')
    return null
  } catch (error) {
    console.warn('[FinanceCache] Failed to get Cloudflare context:', error)
    return null
  }
}
