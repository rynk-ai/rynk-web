/**
 * Financial Data Orchestrator
 * 
 * Fetches stock data from Yahoo Finance and crypto from CoinGecko.
 * Integrates with cache layer for performance.
 */

import { getFinanceCache, type CacheDataType } from '@/lib/services/finance/cache'

// ============================================================================
// Types
// ============================================================================

export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  previousClose: number
  marketCap?: number
  name?: string
  timestamp: string
}

export interface StockHistoryPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface CryptoPrice {
  id: string
  symbol: string
  name: string
  price: number
  priceChange24h: number
  priceChangePercent24h: number
  marketCap: number
  volume24h: number
  high24h: number
  low24h: number
  lastUpdated: string
}

export interface CryptoHistoryPoint {
  date: string
  price: number
}

export interface SymbolSearchResult {
  symbol: string
  name: string
  type: string
  region: string
  exchange: string
}

export interface CryptoSearchResult {
  id: string
  symbol: string
  name: string
  marketCapRank?: number
}

// ============================================================================
// Yahoo Finance API (Unofficial)
// ============================================================================

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com'

/**
 * Fetch stock quote from Yahoo Finance (with caching)
 */
export async function fetchStockQuote(symbol: string, useCache = true): Promise<StockQuote | null> {
  const cache = useCache ? await getFinanceCache() : null
  
  // Check cache first
  if (cache) {
    const cached = await cache.get<StockQuote>('yahoo', symbol, 'quote')
    if (cached) return cached
  }
  
  try {
    const url = `${YAHOO_BASE_URL}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    
    if (!response.ok) {
      console.error(`[FinancialOrchestrator] Yahoo quote failed for ${symbol}: ${response.status}`)
      return null
    }
    
    const data = await response.json() as any
    const result = data?.chart?.result?.[0]
    
    if (!result) return null
    
    const meta = result.meta
    const quote = result.indicators?.quote?.[0]
    
    const lastClose = quote?.close?.slice(-1)?.[0] ?? meta.regularMarketPrice
    const lastOpen = quote?.open?.slice(-1)?.[0] ?? meta.chartPreviousClose
    const lastHigh = quote?.high?.slice(-1)?.[0] ?? meta.regularMarketDayHigh
    const lastLow = quote?.low?.slice(-1)?.[0] ?? meta.regularMarketDayLow
    const lastVolume = quote?.volume?.slice(-1)?.[0] ?? meta.regularMarketVolume
    
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? lastOpen
    const currentPrice = meta.regularMarketPrice ?? lastClose
    const change = currentPrice - previousClose
    const changePercent = previousClose ? (change / previousClose) * 100 : 0
    
    const stockQuote: StockQuote = {
      symbol: symbol.toUpperCase(),
      name: meta.shortName || meta.longName || symbol,
      price: currentPrice,
      change,
      changePercent,
      high: meta.regularMarketDayHigh ?? lastHigh ?? currentPrice,
      low: meta.regularMarketDayLow ?? lastLow ?? currentPrice,
      volume: meta.regularMarketVolume ?? lastVolume ?? 0,
      previousClose,
      marketCap: meta.marketCap,
      timestamp: new Date().toISOString()
    }
    
    // Cache the result
    if (cache) {
      await cache.set('yahoo', symbol, 'quote', stockQuote)
    }
    
    return stockQuote
  } catch (error) {
    console.error(`[FinancialOrchestrator] Error fetching stock quote:`, error)
    return null
  }
}

/**
 * Fetch stock history from Yahoo Finance (with caching)
 */
export async function fetchStockHistory(
  symbol: string,
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' = '1mo',
  useCache = true
): Promise<StockHistoryPoint[]> {
  const cache = useCache ? await getFinanceCache() : null
  const cacheType = `history_${range}` as CacheDataType
  
  // Check cache first
  if (cache) {
    const cached = await cache.get<StockHistoryPoint[]>('yahoo', symbol, cacheType)
    if (cached) return cached
  }
  
  try {
    const rangeMap: Record<string, { range: string; interval: string }> = {
      '1d': { range: '1d', interval: '5m' },
      '5d': { range: '5d', interval: '15m' },
      '1mo': { range: '1mo', interval: '1d' },
      '3mo': { range: '3mo', interval: '1d' },
      '6mo': { range: '6mo', interval: '1d' },
      '1y': { range: '1y', interval: '1wk' },
      '5y': { range: '5y', interval: '1mo' }
    }
    
    const params = rangeMap[range] || rangeMap['1mo']
    const url = `${YAHOO_BASE_URL}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${params.interval}&range=${params.range}`
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    
    if (!response.ok) {
      console.error(`[FinancialOrchestrator] Yahoo history failed for ${symbol}: ${response.status}`)
      return []
    }
    
    const data = await response.json() as any
    const result = data?.chart?.result?.[0]
    
    if (!result || !result.timestamp) return []
    
    const timestamps = result.timestamp
    const quote = result.indicators?.quote?.[0]
    
    if (!quote) return []
    
    const history: StockHistoryPoint[] = []
    
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.close?.[i] == null) continue
      
      history.push({
        date: new Date(timestamps[i] * 1000).toISOString(),
        open: quote.open?.[i] ?? 0,
        high: quote.high?.[i] ?? 0,
        low: quote.low?.[i] ?? 0,
        close: quote.close?.[i] ?? 0,
        volume: quote.volume?.[i] ?? 0
      })
    }
    
    // Cache the result
    if (cache && history.length > 0) {
      await cache.set('yahoo', symbol, cacheType, history)
    }
    
    return history
  } catch (error) {
    console.error(`[FinancialOrchestrator] Error fetching stock history:`, error)
    return []
  }
}

/**
 * Search for stock symbols
 */
export async function searchSymbol(query: string): Promise<SymbolSearchResult[]> {
  try {
    const url = `${YAHOO_BASE_URL}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableFuzzyQuery=false`
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    
    if (!response.ok) return []
    
    const data = await response.json() as any
    const quotes = data?.quotes || []
    
    return quotes
      .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType?.toLowerCase() || 'stock',
        region: q.exchDisp || 'Unknown',
        exchange: q.exchange || ''
      }))
  } catch (error) {
    console.error(`[FinancialOrchestrator] Error searching stocks:`, error)
    return []
  }
}

// ============================================================================
// CoinGecko API
// ============================================================================

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3'

/**
 * Fetch crypto price (with caching)
 */
export async function fetchCryptoPrice(coinId: string, useCache = true): Promise<CryptoPrice | null> {
  const cache = useCache ? await getFinanceCache() : null
  
  if (cache) {
    const cached = await cache.get<CryptoPrice>('coingecko', coinId, 'quote')
    if (cached) return cached
  }
  
  try {
    const url = `${COINGECKO_BASE_URL}/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`[FinancialOrchestrator] CoinGecko price failed for ${coinId}: ${response.status}`)
      return null
    }
    
    const data = await response.json() as any
    const market = data.market_data
    
    if (!market) return null
    
    const cryptoPrice: CryptoPrice = {
      id: data.id,
      symbol: data.symbol?.toUpperCase() || coinId.toUpperCase(),
      name: data.name || coinId,
      price: market.current_price?.usd || 0,
      priceChange24h: market.price_change_24h || 0,
      priceChangePercent24h: market.price_change_percentage_24h || 0,
      marketCap: market.market_cap?.usd || 0,
      volume24h: market.total_volume?.usd || 0,
      high24h: market.high_24h?.usd || 0,
      low24h: market.low_24h?.usd || 0,
      lastUpdated: market.last_updated || new Date().toISOString()
    }
    
    if (cache) {
      await cache.set('coingecko', coinId, 'quote', cryptoPrice)
    }
    
    return cryptoPrice
  } catch (error) {
    console.error(`[FinancialOrchestrator] Error fetching crypto price:`, error)
    return null
  }
}

/**
 * Fetch crypto history (with caching)
 */
export async function fetchCryptoHistory(coinId: string, days: number = 30, useCache = true): Promise<CryptoHistoryPoint[]> {
  const cache = useCache ? await getFinanceCache() : null
  const cacheType = days <= 1 ? 'history_1d' : days <= 7 ? 'history_5d' : 'history_1mo' as CacheDataType
  
  if (cache) {
    const cached = await cache.get<CryptoHistoryPoint[]>('coingecko', coinId, cacheType)
    if (cached) return cached
  }
  
  try {
    const url = `${COINGECKO_BASE_URL}/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`[FinancialOrchestrator] CoinGecko history failed for ${coinId}: ${response.status}`)
      return []
    }
    
    const data = await response.json() as any
    
    if (!data.prices) return []
    
    const history = data.prices.map((point: [number, number]) => ({
      date: new Date(point[0]).toISOString(),
      price: point[1]
    }))
    
    if (cache && history.length > 0) {
      await cache.set('coingecko', coinId, cacheType, history)
    }
    
    return history
  } catch (error) {
    console.error(`[FinancialOrchestrator] Error fetching crypto history:`, error)
    return []
  }
}

/**
 * Search cryptos
 */
export async function searchCrypto(query: string): Promise<CryptoSearchResult[]> {
  try {
    const url = `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`
    
    const response = await fetch(url)
    if (!response.ok) return []
    
    const data = await response.json() as any
    const coins = data?.coins || []
    
    return coins.slice(0, 10).map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol?.toUpperCase() || '',
      name: coin.name || coin.id,
      marketCapRank: coin.market_cap_rank
    }))
  } catch (error) {
    console.error(`[FinancialOrchestrator] Error searching crypto:`, error)
    return []
  }
}

/**
 * Get top cryptos (with caching)
 */
export async function getTopCryptos(limit: number = 10, useCache = true): Promise<CryptoPrice[]> {
  const cache = useCache ? await getFinanceCache() : null
  
  if (cache) {
    const cached = await cache.get<CryptoPrice[]>('coingecko', `top_${limit}`, 'quote')
    if (cached) return cached
  }
  
  try {
    const url = `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`[FinancialOrchestrator] CoinGecko top cryptos failed: ${response.status}`)
      return []
    }
    
    const data = await response.json() as any[]
    
    const result = data.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol?.toUpperCase() || '',
      name: coin.name || coin.id,
      price: coin.current_price || 0,
      priceChange24h: coin.price_change_24h || 0,
      priceChangePercent24h: coin.price_change_percentage_24h || 0,
      marketCap: coin.market_cap || 0,
      volume24h: coin.total_volume || 0,
      high24h: coin.high_24h || 0,
      low24h: coin.low_24h || 0,
      lastUpdated: coin.last_updated || new Date().toISOString()
    }))
    
    if (cache && result.length > 0) {
      await cache.set('coingecko', `top_${limit}`, 'quote', result)
    }
    
    return result
  } catch (error) {
    console.error(`[FinancialOrchestrator] Error fetching top cryptos:`, error)
    return []
  }
}

// ============================================================================
// Unified Orchestrator Class
// ============================================================================

export class FinancialOrchestrator {
  async fetchMarketData(symbols: string[], type: 'stock' | 'crypto' = 'stock') {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const data = type === 'crypto' 
          ? await fetchCryptoPrice(symbol) 
          : await fetchStockQuote(symbol)
        return { symbol, data }
      })
    )
    return results
  }

  async search(query: string) {
    const [stocks, cryptos] = await Promise.all([searchSymbol(query), searchCrypto(query)])
    return { stocks, cryptos }
  }

  getStockQuote = fetchStockQuote
  getStockHistory = fetchStockHistory
  getCryptoPrice = fetchCryptoPrice
  getCryptoHistory = fetchCryptoHistory
  getTopCryptos = getTopCryptos
}

export const financialOrchestrator = new FinancialOrchestrator()
