/**
 * Finance Query Analyzer
 * 
 * Analyzes user queries to:
 * - Detect if query is finance-related
 * - Extract stock/crypto symbols
 * - Determine analysis depth and type
 */

import { getAIProvider } from '@/lib/services/ai-factory'

// Common stock symbols for pattern matching
const MAJOR_STOCKS = ['AAPL', 'GOOGL', 'GOOG', 'MSFT', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'NFLX', 'DIS', 'BA', 'JPM', 'GS', 'V', 'MA', 'WMT', 'HD', 'COST']
const MAJOR_CRYPTOS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot', 'avalanche', 'polygon', 'chainlink', 'uniswap', 'aave', 'dogecoin', 'shiba-inu', 'xrp', 'litecoin', 'stellar']
const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK', 'UNI', 'AAVE', 'DOGE', 'SHIB', 'XRP', 'LTC', 'XLM']

// Financial keywords
const FINANCE_KEYWORDS = [
  'stock', 'stocks', 'share', 'shares', 'equity', 'equities',
  'crypto', 'cryptocurrency', 'coin', 'token', 'bitcoin', 'ethereum',
  'price', 'market', 'trading', 'invest', 'investment', 'portfolio',
  'analysis', 'analyze', 'valuation', 'p/e', 'pe ratio', 'earnings',
  'dividend', 'yield', 'rsi', 'macd', 'moving average', 'support', 'resistance',
  'bullish', 'bearish', 'buy', 'sell', 'hold',
  'nasdaq', 'nyse', 's&p', 'dow', 'index', 'etf',
  'fundamental', 'technical', 'chart', 'trend'
]

export interface FinanceAnalysis {
  isFinanceRelated: boolean
  confidence: number  // 0-1
  
  // Extracted symbols
  symbols: {
    symbol: string
    name?: string
    type: 'stock' | 'crypto' | 'index' | 'etf'
  }[]
  
  // Query intent
  intent: 'price_check' | 'analysis' | 'comparison' | 'education' | 'news' | 'general'
  
  // Analysis depth requested
  depth: 'quick' | 'standard' | 'comprehensive'
  
  // Specific topics of interest
  topics: string[]
  
  // Original query for reference
  query: string
}

/**
 * Quick heuristic check for finance keywords
 */
function quickFinanceCheck(query: string): { isFinance: boolean; confidence: number } {
  const lowerQuery = query.toLowerCase()
  
  // Check for stock ticker pattern ($AAPL, AAPL, etc.)
  const tickerPattern = /\$?[A-Z]{1,5}\b/g
  const potentialTickers: string[] = query.match(tickerPattern) || []
  
  // Check major stocks
  const hasKnownStock = potentialTickers.some((t: string) => MAJOR_STOCKS.includes(t.replace('$', '')))
  
  // Check major cryptos
  const hasKnownCrypto = MAJOR_CRYPTOS.some(c => lowerQuery.includes(c)) || 
                         CRYPTO_SYMBOLS.some((c: string) => potentialTickers.includes(c))
  
  // Check keywords
  const keywordCount = FINANCE_KEYWORDS.filter(kw => lowerQuery.includes(kw)).length
  
  if (hasKnownStock || hasKnownCrypto) {
    return { isFinance: true, confidence: 0.95 }
  }
  
  if (keywordCount >= 3) {
    return { isFinance: true, confidence: 0.9 }
  }
  
  if (keywordCount >= 1) {
    return { isFinance: true, confidence: 0.7 }
  }
  
  // Check for price/trading related patterns
  if (/\b(price of|how is|what's|analyze|investing in)\b/i.test(query)) {
    return { isFinance: true, confidence: 0.6 }
  }
  
  return { isFinance: false, confidence: 0.3 }
}

/**
 * Extract stock symbols from query
 */
function extractStockSymbols(query: string): { symbol: string; type: 'stock' | 'index' | 'etf' }[] {
  const symbols: { symbol: string; type: 'stock' | 'index' | 'etf' }[] = []
  
  // Pattern: $AAPL or standalone uppercase like AAPL
  const tickerPattern = /\$([A-Z]{1,5})\b|\b([A-Z]{2,5})\b/g
  let match
  
  while ((match = tickerPattern.exec(query)) !== null) {
    const symbol = match[1] || match[2]
    
    // Filter out common words that look like tickers
    const commonWords = ['I', 'A', 'THE', 'IS', 'IT', 'TO', 'FOR', 'AND', 'OR', 'AS', 'AT', 'BY', 'AN', 'BE', 'DO', 'IF', 'IN', 'NO', 'OF', 'ON', 'SO', 'UP', 'WE', 'AI', 'AM', 'PM']
    if (commonWords.includes(symbol)) continue
    
    // Check if it's a known stock
    if (MAJOR_STOCKS.includes(symbol)) {
      symbols.push({ symbol, type: 'stock' })
    } else if (symbol.length >= 2 && symbol.length <= 5) {
      // Potential unknown ticker
      symbols.push({ symbol, type: 'stock' })
    }
  }
  
  // Check for index mentions
  if (/\b(s&p|sp500|nasdaq|dow jones|djia)\b/i.test(query)) {
    if (/s&p|sp500/i.test(query)) symbols.push({ symbol: '^GSPC', type: 'index' })
    if (/nasdaq/i.test(query)) symbols.push({ symbol: '^IXIC', type: 'index' })
    if (/dow|djia/i.test(query)) symbols.push({ symbol: '^DJI', type: 'index' })
  }
  
  return symbols
}

/**
 * Extract crypto symbols from query
 */
function extractCryptoSymbols(query: string): { symbol: string; name: string; type: 'crypto' }[] {
  const symbols: { symbol: string; name: string; type: 'crypto' }[] = []
  const lowerQuery = query.toLowerCase()
  
  // Map of crypto names to CoinGecko IDs
  const cryptoMap: Record<string, { id: string; symbol: string }> = {
    'bitcoin': { id: 'bitcoin', symbol: 'BTC' },
    'btc': { id: 'bitcoin', symbol: 'BTC' },
    'ethereum': { id: 'ethereum', symbol: 'ETH' },
    'eth': { id: 'ethereum', symbol: 'ETH' },
    'solana': { id: 'solana', symbol: 'SOL' },
    'sol': { id: 'solana', symbol: 'SOL' },
    'cardano': { id: 'cardano', symbol: 'ADA' },
    'ada': { id: 'cardano', symbol: 'ADA' },
    'polkadot': { id: 'polkadot', symbol: 'DOT' },
    'dot': { id: 'polkadot', symbol: 'DOT' },
    'avalanche': { id: 'avalanche-2', symbol: 'AVAX' },
    'avax': { id: 'avalanche-2', symbol: 'AVAX' },
    'polygon': { id: 'matic-network', symbol: 'MATIC' },
    'matic': { id: 'matic-network', symbol: 'MATIC' },
    'chainlink': { id: 'chainlink', symbol: 'LINK' },
    'link': { id: 'chainlink', symbol: 'LINK' },
    'dogecoin': { id: 'dogecoin', symbol: 'DOGE' },
    'doge': { id: 'dogecoin', symbol: 'DOGE' },
    'xrp': { id: 'ripple', symbol: 'XRP' },
    'ripple': { id: 'ripple', symbol: 'XRP' },
    'litecoin': { id: 'litecoin', symbol: 'LTC' },
    'ltc': { id: 'litecoin', symbol: 'LTC' },
  }
  
  for (const [name, data] of Object.entries(cryptoMap)) {
    if (lowerQuery.includes(name)) {
      // Avoid duplicates
      if (!symbols.find(s => s.symbol === data.id)) {
        symbols.push({ 
          symbol: data.id,  // CoinGecko ID
          name: name.charAt(0).toUpperCase() + name.slice(1),
          type: 'crypto'
        })
      }
    }
  }
  
  return symbols
}

/**
 * Determine query intent
 */
function determineIntent(query: string): 'price_check' | 'analysis' | 'comparison' | 'education' | 'news' | 'general' {
  const lowerQuery = query.toLowerCase()
  
  if (/\b(compare|vs|versus|difference between|which is better)\b/i.test(query)) {
    return 'comparison'
  }
  
  if (/\b(news|latest|recent|update|happening)\b/i.test(query)) {
    return 'news'
  }
  
  if (/\b(what is|explain|how does|learn about|understand)\b/i.test(query)) {
    return 'education'
  }
  
  if (/\b(analy|fundamentals|technicals|valuation|outlook|forecast|predict)\b/i.test(query)) {
    return 'analysis'
  }
  
  if (/\b(price|cost|worth|value|trading at)\b/i.test(query)) {
    return 'price_check'
  }
  
  return 'general'
}

/**
 * Determine analysis depth
 */
function determineDepth(query: string): 'quick' | 'standard' | 'comprehensive' {
  const lowerQuery = query.toLowerCase()
  
  if (/\b(comprehensive|detailed|full|in-depth|deep dive|thorough)\b/i.test(query)) {
    return 'comprehensive'
  }
  
  if (/\b(quick|brief|short|just|simple|fast)\b/i.test(query)) {
    return 'quick'
  }
  
  return 'standard'
}

/**
 * Extract topics of interest
 */
function extractTopics(query: string): string[] {
  const topics: string[] = []
  const lowerQuery = query.toLowerCase()
  
  const topicPatterns: Record<string, string> = {
    'fundamental': 'fundamentals',
    'valuation': 'valuation',
    'p/e|pe ratio|earnings': 'earnings',
    'dividend': 'dividends',
    'technical': 'technicals',
    'rsi|macd|indicator': 'indicators',
    'support|resistance': 'levels',
    'trend': 'trend',
    'momentum': 'momentum',
    'volatility': 'volatility',
    'risk': 'risk',
    'sector|industry': 'sector',
    'market cap|size': 'size',
    'growth': 'growth',
    'value': 'value',
  }
  
  for (const [pattern, topic] of Object.entries(topicPatterns)) {
    if (new RegExp(pattern, 'i').test(lowerQuery) && !topics.includes(topic)) {
      topics.push(topic)
    }
  }
  
  return topics
}

/**
 * Main analysis function
 */
export async function analyzeFinanceQuery(query: string): Promise<FinanceAnalysis> {
  // Quick heuristic check first
  const heuristic = quickFinanceCheck(query)
  
  // Extract symbols
  const stockSymbols = extractStockSymbols(query)
  const cryptoSymbols = extractCryptoSymbols(query)
  const allSymbols = [
    ...stockSymbols.map(s => ({ ...s, name: undefined })),
    ...cryptoSymbols
  ]
  
  // Determine intent and depth
  const intent = determineIntent(query)
  const depth = determineDepth(query)
  const topics = extractTopics(query)
  
  // Adjust confidence based on symbols found
  let confidence = heuristic.confidence
  if (allSymbols.length > 0) {
    confidence = Math.max(confidence, 0.85)
  }
  
  return {
    isFinanceRelated: heuristic.isFinance || allSymbols.length > 0,
    confidence,
    symbols: allSymbols,
    intent,
    depth,
    topics,
    query
  }
}

/**
 * Use LLM to enhance analysis for complex queries
 */
export async function enhancedFinanceAnalysis(query: string): Promise<FinanceAnalysis> {
  // First do heuristic analysis
  const basic = await analyzeFinanceQuery(query)
  
  // If clearly not finance or clearly is with symbols, skip LLM
  if (!basic.isFinanceRelated && basic.confidence < 0.4) {
    return basic
  }
  
  if (basic.symbols.length > 0 && basic.confidence > 0.8) {
    return basic
  }
  
  // Use LLM for ambiguous cases
  try {
    const aiProvider = getAIProvider(false)
    
    const prompt = `Analyze this query for financial content:
"${query}"

Respond in JSON:
{
  "isFinance": boolean,
  "symbols": [{"symbol": "AAPL", "type": "stock|crypto", "name": "Apple Inc"}],
  "intent": "price_check|analysis|comparison|education|news|general",
  "additionalTopics": ["string"]
}

Only include symbols explicitly mentioned or clearly implied. Be conservative.`

    const response = await aiProvider.sendMessage({
      messages: [
        { role: 'system', content: 'You are a financial query analyzer. Extract symbols and intent from queries. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ]
    })
    
    let content = ''
    for await (const chunk of response) {
      content += chunk
    }
    
    // Parse LLM response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const llmResult = JSON.parse(jsonMatch[0]) as {
        isFinance: boolean
        symbols: { symbol: string; type: string; name?: string }[]
        intent: string
        additionalTopics: string[]
      }
      
      // Merge LLM results with heuristic
      return {
        ...basic,
        isFinanceRelated: basic.isFinanceRelated || llmResult.isFinance,
        confidence: Math.max(basic.confidence, llmResult.isFinance ? 0.9 : 0.3),
        symbols: [
          ...basic.symbols,
          ...llmResult.symbols
            .filter(s => !basic.symbols.find(bs => bs.symbol === s.symbol))
            .map(s => ({
              symbol: s.symbol,
              name: s.name,
              type: s.type as 'stock' | 'crypto' | 'index' | 'etf'
            }))
        ],
        intent: llmResult.intent as any || basic.intent,
        topics: [...new Set([...basic.topics, ...(llmResult.additionalTopics || [])])]
      }
    }
  } catch (error) {
    console.error('[FinanceAnalyzer] LLM enhancement failed:', error)
  }
  
  return basic
}
