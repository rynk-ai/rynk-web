/**
 * Finance Query Analyzer - Chat Service Pattern
 * 
 * Uses the same pattern as chat-service:
 * 1. Quick pattern detection (Groq) - 50ms
 * 2. Deep analysis with web search (Perplexity) - ticker identification
 * 3. Symbol validation (Yahoo/CoinGecko API)
 */

import { getAIProvider } from '@/lib/services/ai-factory'
import { SourceOrchestrator } from '@/lib/services/agentic/source-orchestrator'
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
  
  // Context from web search
  webContext?: string
}

interface QuickFinanceCheck {
  isFinance: boolean
  category: 'stock' | 'crypto' | 'index' | 'general'
  confidence: number
}

/**
 * Step 1: Quick pattern detection using Groq (50-100ms)
 */
async function quickFinanceCheck(query: string): Promise<QuickFinanceCheck> {
  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    console.warn('[FinanceAnalyzer] No GROQ_API_KEY, using fallback')
    return { isFinance: hasFinanceSignals(query), category: 'general', confidence: 0.5 }
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
          content: `You are a query classifier. Determine if this is a finance-related query.

Respond ONLY with JSON:
{
  "isFinance": true/false,
  "category": "stock" | "crypto" | "index" | "general",
  "confidence": 0.0 to 1.0
}

Examples:
- "analyse netflix" → isFinance: true, category: "stock"
- "bitcoin price" → isFinance: true, category: "crypto"
- "s&p 500 outlook" → isFinance: true, category: "index"
- "how to bake a cake" → isFinance: false, category: "general"`
        }, {
          role: 'user',
          content: query
        }],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 100
      })
    })
    
    if (!response.ok) {
      throw new Error(`Groq error: ${response.status}`)
    }
    
    const data = await response.json() as any
    const result = JSON.parse(data.choices[0].message.content || '{}')
    
    console.log(`[FinanceAnalyzer] Quick check:`, result)
    return result as QuickFinanceCheck
    
  } catch (error) {
    console.error('[FinanceAnalyzer] Quick check failed:', error)
    return { isFinance: hasFinanceSignals(query), category: 'general', confidence: 0.5 }
  }
}

/**
 * Step 2: Web search to identify exact ticker (Perplexity)
 */
async function identifyTicker(query: string, category: string): Promise<{
  symbol: string
  name: string
  type: 'stock' | 'crypto' | 'index' | 'etf'
  webContext: string
} | null> {
  try {
    const orchestrator = new SourceOrchestrator()
    
    const searchQuery = category === 'crypto'
      ? `What is the CoinGecko ID for the cryptocurrency mentioned in "${query}"? Provide the exact ID like "bitcoin", "ethereum", "solana".`
      : `What is the stock ticker symbol for the company or asset mentioned in "${query}"? Provide the exact NYSE/NASDAQ ticker like "NFLX", "AAPL", "TSLA".`
    
    const results = await orchestrator.executeSourcePlan({
      sources: ['perplexity'],
      reasoning: `Identifying ticker for: "${query}"`,
      searchQueries: {
        perplexity: searchQuery,
      },
      expectedType: 'quick_fact',
    })
    
    let webContext = ''
    for (const result of results) {
      if (result.source === 'perplexity' && result.data) {
        webContext = typeof result.data === 'string' 
          ? result.data 
          : JSON.stringify(result.data)
      }
    }
    
    if (!webContext) return null
    
    // Use LLM to extract ticker from web context
    const aiProvider = getAIProvider(false)
    const extractResponse = await aiProvider.sendMessage({
      messages: [{
        role: 'system',
        content: 'Extract the exact ticker symbol from the text. Respond with JSON only: {"symbol": "TICKER", "name": "Full Name", "type": "stock|crypto|index|etf"}'
      }, {
        role: 'user',
        content: `Query: "${query}"\nWeb result: ${webContext}`
      }]
    })
    
    let content = ''
    for await (const chunk of extractResponse) {
      content += chunk
    }
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0])
      console.log(`[FinanceAnalyzer] Extracted:`, extracted)
      return { ...extracted, webContext }
    }
    
  } catch (error) {
    console.error('[FinanceAnalyzer] Ticker identification failed:', error)
  }
  
  return null
}

/**
 * Step 3: Validate symbol with Yahoo/CoinGecko
 */
async function validateSymbol(
  symbol: string, 
  type: 'stock' | 'crypto' | 'index' | 'etf'
): Promise<{ symbol: string; name: string; type: typeof type } | null> {
  try {
    if (type === 'crypto') {
      const results = await searchCrypto(symbol)
      if (results.length > 0) {
        return {
          symbol: results[0].id,
          name: results[0].name,
          type: 'crypto'
        }
      }
    } else {
      const results = await searchSymbol(symbol)
      if (results.length > 0) {
        return {
          symbol: results[0].symbol,
          name: results[0].name,
          type: (results[0].type === 'etf' ? 'etf' : 'stock')
        }
      }
    }
  } catch (error) {
    console.error('[FinanceAnalyzer] Validation failed:', error)
  }
  
  // Trust the extracted symbol
  return { symbol, name: symbol, type }
}

/**
 * Fallback signal detection
 */
function hasFinanceSignals(query: string): boolean {
  const lowerQuery = query.toLowerCase()
  const signals = [
    'stock', 'share', 'price', 'market', 'invest', 'crypto', 'bitcoin', 
    'ethereum', 'analyse', 'analyze', 'trading', 'buy', 'sell', 'nasdaq',
    'dow', 's&p', 'portfolio', 'dividend', 'earnings'
  ]
  return signals.some(s => lowerQuery.includes(s))
}

/**
 * Main entry point - analyzes query using chat service pattern
 */
export async function analyzeFinanceQuery(query: string): Promise<FinanceAnalysis> {
  console.log(`[FinanceAnalyzer] Starting: "${query.substring(0, 50)}..."`)
  
  // Step 1: Quick classification (Groq - 50ms)
  const quickCheck = await quickFinanceCheck(query)
  
  if (!quickCheck.isFinance) {
    console.log(`[FinanceAnalyzer] Not finance-related`)
    return {
      isFinanceRelated: false,
      confidence: quickCheck.confidence,
      symbols: [],
      intent: 'general',
      depth: 'standard',
      topics: [],
      query
    }
  }
  
  // Step 2: Web search for ticker (Perplexity)
  const ticker = await identifyTicker(query, quickCheck.category)
  
  if (!ticker) {
    console.log(`[FinanceAnalyzer] Could not identify ticker`)
    return {
      isFinanceRelated: true,
      confidence: quickCheck.confidence,
      symbols: [],
      intent: 'general',
      depth: 'standard',
      topics: [],
      query
    }
  }
  
  // Step 3: Validate with API
  const validatedSymbol = await validateSymbol(ticker.symbol, ticker.type)
  
  if (!validatedSymbol) {
    console.log(`[FinanceAnalyzer] Validation failed, using extracted symbol`)
  }
  
  const finalSymbol = validatedSymbol || {
    symbol: ticker.symbol,
    name: ticker.name,
    type: ticker.type
  }
  
  console.log(`[FinanceAnalyzer] Final symbol:`, finalSymbol)
  
  return {
    isFinanceRelated: true,
    confidence: quickCheck.confidence,
    symbols: [finalSymbol],
    intent: 'analysis',
    depth: 'comprehensive',
    topics: ['fundamentals', 'technicals', 'news'],
    query,
    webContext: ticker.webContext
  }
}
