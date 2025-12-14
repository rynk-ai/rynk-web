/**
 * Finance Query Analyzer - Search-First Approach
 * 
 * New architecture (Option A from redesign):
 * 1. Quick classification (Groq) - is this finance-related?
 * 2. Direct API search (Yahoo + CoinGecko) - get real matches
 * 3. LLM selection (optional) - pick best match from real results
 * 
 * This eliminates the fragile Perplexity-based ticker ID that often failed.
 */

import { getAIProvider } from '@/lib/services/ai-factory'
import { searchSymbol, searchCrypto } from '@/lib/services/agentic/financial-orchestrator'

export interface FinanceAnalysis {
  isFinanceRelated: boolean
  confidence: number
  
  symbols: {
    symbol: string
    name: string
    type: 'stock' | 'crypto' | 'index' | 'etf'
  }[]
  
  intent: 'price_check' | 'analysis' | 'comparison' | 'education' | 'news' | 'general'
  depth: 'quick' | 'standard' | 'comprehensive'
  topics: string[]
  query: string
  
  // Search context for fallback UI
  searchedTerms?: string[]
  partialMatches?: { symbol: string; name: string; type: string; score: number }[]
  failureReason?: string
}

interface QuickFinanceCheck {
  isFinance: boolean
  category: 'stock' | 'crypto' | 'index' | 'general'
  confidence: number
  searchTerms: string[]  // Keywords to search for
}

/**
 * Step 1: Quick classification + keyword extraction using Groq
 */
async function quickFinanceCheck(query: string): Promise<QuickFinanceCheck> {
  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    console.warn('[FinanceAnalyzer] No GROQ_API_KEY, using fallback')
    return fallbackClassification(query)
  }
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'system',
          content: `You classify finance queries and extract search keywords.

Respond ONLY with JSON:
{
  "isFinance": true/false,
  "category": "stock" | "crypto" | "index" | "general",
  "confidence": 0.0 to 1.0,
  "searchTerms": ["keyword1", "keyword2"]
}

searchTerms should be:
- The company/asset name mentioned (e.g., "netflix", "apple", "nvidia")
- Known ticker symbols (e.g., "NFLX", "AAPL", "BTC")
- Both if available (e.g., ["netflix", "NFLX"])

Examples:
- "analyse netflix" → isFinance:true, category:"stock", searchTerms:["netflix","NFLX"]
- "bitcoin price" → isFinance:true, category:"crypto", searchTerms:["bitcoin","btc"]
- "s&p 500 outlook" → isFinance:true, category:"index", searchTerms:["s&p 500","SPY"]
- "compare MSFT and GOOGL" → isFinance:true, category:"stock", searchTerms:["MSFT","GOOGL","microsoft","google"]
- "how to bake a cake" → isFinance:false, category:"general", searchTerms:[]`
        }, {
          role: 'user',
          content: query
        }],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 150
      })
    })
    
    if (!response.ok) {
      throw new Error(`Groq error: ${response.status}`)
    }
    
    const data = await response.json() as any
    const result = JSON.parse(data.choices[0].message.content || '{}')
    
    console.log(`[FinanceAnalyzer] Quick check:`, result)
    return {
      isFinance: result.isFinance ?? false,
      category: result.category ?? 'general',
      confidence: result.confidence ?? 0.5,
      searchTerms: result.searchTerms ?? extractKeywords(query)
    }
    
  } catch (error) {
    console.error('[FinanceAnalyzer] Quick check failed:', error)
    return fallbackClassification(query)
  }
}

/**
 * Fallback classification using patterns
 */
function fallbackClassification(query: string): QuickFinanceCheck {
  const lowerQuery = query.toLowerCase()
  
  // Finance signals
  const financeSignals = [
    'stock', 'share', 'price', 'market', 'invest', 'crypto', 'bitcoin', 
    'ethereum', 'analyse', 'analyze', 'trading', 'buy', 'sell', 'nasdaq',
    'dow', 's&p', 'portfolio', 'dividend', 'earnings', 'etf', 'index'
  ]
  
  const isFinance = financeSignals.some(s => lowerQuery.includes(s))
  
  // Detect category
  const cryptoSignals = ['bitcoin', 'ethereum', 'crypto', 'btc', 'eth', 'solana', 'doge', 'coin']
  const indexSignals = ['s&p', 'dow', 'nasdaq', 'index', 'sp500']
  
  let category: 'stock' | 'crypto' | 'index' | 'general' = 'general'
  if (cryptoSignals.some(s => lowerQuery.includes(s))) category = 'crypto'
  else if (indexSignals.some(s => lowerQuery.includes(s))) category = 'index'
  else if (isFinance) category = 'stock'
  
  return {
    isFinance,
    category,
    confidence: 0.5,
    searchTerms: extractKeywords(query)
  }
}

/**
 * Extract potential asset names/ticker from query
 */
function extractKeywords(query: string): string[] {
  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'in', 'on', 
    'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into', 'through',
    'stock', 'share', 'price', 'market', 'analyse', 'analyze', 'analysis',
    'show', 'tell', 'give', 'what', 'how', 'why', 'when', 'where', 'which',
    'me', 'i', 'you', 'we', 'they', 'it', 'about', 'please', 'want', 'need'
  ])
  
  const words = query
    .replace(/[^\w\s&$-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w.toLowerCase()))
  
  // Include original case (for tickers like AAPL) and lowercase
  const keywords: string[] = []
  for (const word of words) {
    if (word === word.toUpperCase() && word.length <= 5) {
      // Likely a ticker
      keywords.push(word)
    } else {
      keywords.push(word.toLowerCase())
    }
  }
  
  return [...new Set(keywords)].slice(0, 5)
}

/**
 * Step 2: Search directly using Yahoo Finance + CoinGecko APIs
 */
async function searchAssets(
  searchTerms: string[], 
  category: 'stock' | 'crypto' | 'index' | 'general'
): Promise<{
  matches: { symbol: string; name: string; type: 'stock' | 'crypto' | 'index' | 'etf'; score: number }[]
  searchedTerms: string[]
}> {
  const allMatches: { symbol: string; name: string; type: 'stock' | 'crypto' | 'index' | 'etf'; score: number }[] = []
  
  // Search both stocks and crypto unless category is specific
  const searchStocks = category !== 'crypto'
  const searchCryptos = category === 'crypto' || category === 'general'
  
  const searchPromises: Promise<void>[] = []
  
  for (const term of searchTerms) {
    if (searchStocks) {
      searchPromises.push(
        searchSymbol(term).then(results => {
          for (const r of results.slice(0, 3)) {
            // Score based on match quality
            const exactMatch = r.symbol.toLowerCase() === term.toLowerCase() || 
                               r.name.toLowerCase() === term.toLowerCase()
            const score = exactMatch ? 1.0 : 0.7
            
            allMatches.push({
              symbol: r.symbol,
              name: r.name,
              type: r.type === 'etf' ? 'etf' : 'stock',
              score
            })
          }
        }).catch(() => {})
      )
    }
    
    if (searchCryptos) {
      searchPromises.push(
        searchCrypto(term).then(results => {
          for (const r of results.slice(0, 3)) {
            const exactMatch = r.symbol.toLowerCase() === term.toLowerCase() || 
                               r.name.toLowerCase() === term.toLowerCase() ||
                               r.id.toLowerCase() === term.toLowerCase()
            const score = exactMatch ? 1.0 : 0.6
            
            allMatches.push({
              symbol: r.id,  // CoinGecko uses id as symbol for API calls
              name: r.name,
              type: 'crypto',
              score
            })
          }
        }).catch(() => {})
      )
    }
  }
  
  await Promise.all(searchPromises)
  
  // Dedupe by symbol and sort by score
  const seen = new Set<string>()
  const uniqueMatches = allMatches
    .sort((a, b) => b.score - a.score)
    .filter(m => {
      const key = `${m.type}:${m.symbol.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  
  console.log(`[FinanceAnalyzer] Search found ${uniqueMatches.length} matches for:`, searchTerms)
  
  return {
    matches: uniqueMatches,
    searchedTerms: searchTerms
  }
}

/**
 * Step 3: LLM picks the best match (if multiple found)
 */
async function selectBestMatch(
  query: string,
  matches: { symbol: string; name: string; type: string; score: number }[]
): Promise<{ symbol: string; name: string; type: 'stock' | 'crypto' | 'index' | 'etf' } | null> {
  if (matches.length === 0) return null
  
  // If only one high-confidence match, use it directly
  if (matches.length === 1 || (matches[0].score >= 0.9 && matches[0].score > (matches[1]?.score ?? 0) + 0.2)) {
    const m = matches[0]
    return { symbol: m.symbol, name: m.name, type: m.type as any }
  }
  
  // Use LLM to pick the right one
  try {
    const aiProvider = getAIProvider(false)
    
    const options = matches.slice(0, 5).map((m, i) => 
      `${i + 1}. ${m.symbol} - ${m.name} (${m.type})`
    ).join('\n')
    
    const response = await aiProvider.sendMessage({
      messages: [{
        role: 'system',
        content: `You help select the correct financial asset. Respond with JSON only: {"choice": 1}`
      }, {
        role: 'user',
        content: `Query: "${query}"\n\nOptions:\n${options}\n\nWhich option best matches the query? Pick the number.`
      }]
    })
    
    let content = ''
    for await (const chunk of response) {
      content += chunk
    }
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const { choice } = JSON.parse(jsonMatch[0])
      const selected = matches[Math.min(choice - 1, matches.length - 1)]
      console.log(`[FinanceAnalyzer] LLM selected:`, selected)
      return { symbol: selected.symbol, name: selected.name, type: selected.type as any }
    }
  } catch (error) {
    console.error('[FinanceAnalyzer] LLM selection failed:', error)
  }
  
  // Fallback to highest score
  const best = matches[0]
  return { symbol: best.symbol, name: best.name, type: best.type as any }
}

/**
 * Main entry point - Search-First approach
 */
export async function analyzeFinanceQuery(query: string): Promise<FinanceAnalysis> {
  console.log(`[FinanceAnalyzer] Starting: "${query.substring(0, 50)}..."`)
  
  // Step 1: Quick classification + keyword extraction
  const quickCheck = await quickFinanceCheck(query)
  
  if (!quickCheck.isFinance || quickCheck.searchTerms.length === 0) {
    console.log(`[FinanceAnalyzer] Not finance-related or no search terms`)
    return {
      isFinanceRelated: quickCheck.isFinance,
      confidence: quickCheck.confidence,
      symbols: [],
      intent: 'general',
      depth: 'standard',
      topics: [],
      query,
      searchedTerms: quickCheck.searchTerms,
      failureReason: quickCheck.isFinance 
        ? 'Could not extract search terms from query'
        : 'Query does not appear to be finance-related'
    }
  }
  
  // Step 2: Direct API search
  const { matches, searchedTerms } = await searchAssets(quickCheck.searchTerms, quickCheck.category)
  
  if (matches.length === 0) {
    console.log(`[FinanceAnalyzer] No matches found for:`, searchedTerms)
    return {
      isFinanceRelated: true,
      confidence: quickCheck.confidence,
      symbols: [],
      intent: 'general',
      depth: 'standard',
      topics: [],
      query,
      searchedTerms,
      failureReason: `No matching assets found for: ${searchedTerms.join(', ')}`
    }
  }
  
  // Step 3: Select best match
  const selected = await selectBestMatch(query, matches)
  
  if (!selected) {
    console.log(`[FinanceAnalyzer] Could not select from matches`)
    return {
      isFinanceRelated: true,
      confidence: quickCheck.confidence,
      symbols: [],
      intent: 'general',
      depth: 'standard',
      topics: [],
      query,
      searchedTerms,
      partialMatches: matches.slice(0, 5),
      failureReason: 'Found matches but could not determine the best one'
    }
  }
  
  console.log(`[FinanceAnalyzer] Final selection:`, selected)
  
  return {
    isFinanceRelated: true,
    confidence: quickCheck.confidence,
    symbols: [selected],
    intent: 'analysis',
    depth: 'comprehensive',
    topics: ['fundamentals', 'technicals', 'news'],
    query,
    searchedTerms,
    partialMatches: matches.filter(m => m.symbol !== selected.symbol).slice(0, 3)
  }
}
