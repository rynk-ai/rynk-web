/**
 * Finance Surface Generator
 * 
 * Generates comprehensive financial analysis including:
 * - Fundamental analysis
 * - Technical analysis
 * - Market cycles
 * - Research insights
 * - News integration
 */

import { getAIProvider } from '@/lib/services/ai-factory'
import { analyzeFinanceQuery, type FinanceAnalysis } from '@/lib/services/finance/analyzer'
import { fetchStockQuote, fetchCryptoPrice, getTopCryptos, fetchStockHistory } from '@/lib/services/agentic/financial-orchestrator'
import { SourceOrchestrator } from '@/lib/services/agentic/source-orchestrator'
import type { FinanceMetadata, SurfaceState } from '@/lib/services/domain-types'

/**
 * Generate finance surface state
 */
export async function generateFinanceSurface(
  query: string,
  conversationId?: string
): Promise<SurfaceState> {
  console.log(`[FinanceGenerator] Starting for query: "${query.substring(0, 50)}..."`)
  
  // Step 1: Analyze the query
  const analysis = await analyzeFinanceQuery(query)
  console.log(`[FinanceGenerator] Analysis:`, {
    isFinance: analysis.isFinanceRelated,
    symbols: analysis.symbols.length,
    intent: analysis.intent
  })
  
  // Step 2: If not finance-related or no symbols, return generic dashboard
  if (!analysis.isFinanceRelated || analysis.symbols.length === 0) {
    return await generateGenericDashboard(query)
  }
  
  // Step 3: Get the primary symbol to analyze
  const primarySymbol = analysis.symbols[0]
  const isStock = primarySymbol.type === 'stock' || primarySymbol.type === 'index' || primarySymbol.type === 'etf'
  
  // Step 4: Fetch live data
  const liveData = await fetchLiveData(primarySymbol.symbol, isStock)
  if (!liveData) {
    console.log(`[FinanceGenerator] Failed to fetch live data, returning generic`)
    return await generateGenericDashboard(query)
  }
  
  // Step 5: Fetch historical data for technical context
  const historyData = isStock 
    ? await fetchStockHistory(primarySymbol.symbol, '3mo')
    : [] // Crypto history handled differently
  
  // Step 6: Fetch news via web search
  const newsData = await fetchNews(primarySymbol.symbol, primarySymbol.name || primarySymbol.symbol)
  
  // Step 7: Generate LLM analysis
  const llmAnalysis = await generateLLMAnalysis(
    query,
    primarySymbol,
    liveData,
    historyData,
    newsData,
    analysis
  )
  
  // Step 8: Assemble the metadata
  const metadata: FinanceMetadata = {
    type: 'finance',
    query,
    generatedAt: Date.now(),
    
    asset: {
      symbol: primarySymbol.symbol,
      name: liveData.name || primarySymbol.name || primarySymbol.symbol,
      type: primarySymbol.type as any,
      sector: llmAnalysis.sector,
      industry: llmAnalysis.industry,
    },
    
    liveData: {
      price: liveData.price,
      change24h: liveData.change,
      changePercent24h: liveData.changePercent,
      high24h: liveData.high,
      low24h: liveData.low,
      volume: liveData.volume,
      marketCap: liveData.marketCap || 0,
      lastUpdated: new Date().toISOString(),
    },
    
    summary: llmAnalysis.summary,
    fundamentals: llmAnalysis.fundamentals,
    technicals: llmAnalysis.technicals,
    cycles: llmAnalysis.cycles,
    research: llmAnalysis.research,
    news: newsData,
    
    isGeneric: false,
  }
  
  return {
    surfaceType: 'finance',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/**
 * Generate generic market dashboard
 */
async function generateGenericDashboard(query: string): Promise<SurfaceState> {
  console.log(`[FinanceGenerator] Generating generic dashboard`)
  
  // Fetch top cryptos as a sample
  const topCryptos = await getTopCryptos(5)
  
  const metadata: FinanceMetadata = {
    type: 'finance',
    query,
    generatedAt: Date.now(),
    
    asset: {
      symbol: 'MARKET',
      name: 'Market Overview',
      type: 'index',
    },
    
    liveData: {
      price: 0,
      change24h: 0,
      changePercent24h: 0,
      high24h: 0,
      low24h: 0,
      volume: 0,
      marketCap: 0,
      lastUpdated: new Date().toISOString(),
    },
    
    summary: {
      headline: 'Welcome to your Financial Dashboard',
      analysis: 'Select a specific stock or cryptocurrency to see detailed analysis. You can ask about any asset like "Analyze AAPL" or "Bitcoin outlook".',
      sentiment: 'neutral',
    },
    
    fundamentals: {
      available: false,
      verdict: 'fairly-valued',
      metrics: [],
      analysis: '',
    },
    
    technicals: {
      trend: 'sideways',
      support: [],
      resistance: [],
      indicators: [],
      patterns: [],
      analysis: '',
    },
    
    cycles: {
      phase: 'accumulation',
      sentiment: 50,
      sentimentLabel: 'Neutral',
      macroContext: '',
    },
    
    research: {
      thesis: { bull: [], bear: [] },
      risks: [],
      catalysts: [],
      comparables: [],
    },
    
    news: {
      headlines: [],
      summary: 'Ask about a specific asset to see relevant news.',
    },
    
    isGeneric: true,
    genericData: {
      indices: [
        { name: 'S&P 500', symbol: '^GSPC', value: 0, change: 0 },
        { name: 'NASDAQ', symbol: '^IXIC', value: 0, change: 0 },
        { name: 'Dow Jones', symbol: '^DJI', value: 0, change: 0 },
      ],
      topGainers: [],
      topLosers: [],
      topCryptos: topCryptos.slice(0, 5).map(c => ({
        symbol: c.symbol,
        name: c.name,
        price: c.price,
        change: c.priceChangePercent24h,
      })),
      trending: ['Bitcoin', 'Ethereum', 'NVIDIA', 'Apple', 'Tesla'],
    },
  }
  
  return {
    surfaceType: 'finance',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/**
 * Fetch live price data
 */
async function fetchLiveData(symbol: string, isStock: boolean): Promise<{
  name: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  marketCap?: number
} | null> {
  try {
    if (isStock) {
      const data = await fetchStockQuote(symbol)
      if (!data) return null
      return {
        name: data.name || symbol,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        high: data.high,
        low: data.low,
        volume: data.volume,
        marketCap: data.marketCap,
      }
    } else {
      const data = await fetchCryptoPrice(symbol)
      if (!data) return null
      return {
        name: data.name,
        price: data.price,
        change: data.priceChange24h,
        changePercent: data.priceChangePercent24h,
        high: data.high24h,
        low: data.low24h,
        volume: data.volume24h,
        marketCap: data.marketCap,
      }
    }
  } catch (error) {
    console.error('[FinanceGenerator] Error fetching live data:', error)
    return null
  }
}

/**
 * Fetch news and research via web search (Exa + Perplexity)
 */
async function fetchNews(symbol: string, name: string): Promise<FinanceMetadata['news']> {
  try {
    const orchestrator = new SourceOrchestrator()
    
    // Use both Exa and Perplexity for comprehensive research
    const results = await orchestrator.executeSourcePlan({
      sources: ['exa', 'perplexity'],
      reasoning: `Fetching latest news, analysis and research for ${name} (${symbol})`,
      searchQueries: {
        exa: `${name} ${symbol} stock news analysis latest 2024`,
        perplexity: `Latest news and analysis for ${name} ${symbol} stock. What are analysts saying?`,
      },
      expectedType: 'current_event',
    })
    
    const headlines: FinanceMetadata['news']['headlines'] = []
    let webSummary = ''
    
    for (const result of results) {
      if (result.source === 'exa' && Array.isArray(result.data)) {
        for (const item of result.data.slice(0, 5)) {
          headlines.push({
            title: item.title || 'News',
            source: item.url ? new URL(item.url).hostname : 'Unknown',
            url: item.url || '',
            date: item.publishedDate || new Date().toISOString(),
          })
        }
      }
      
      // Get Perplexity summary for additional context
      if (result.source === 'perplexity' && result.data) {
        webSummary = typeof result.data === 'string' ? result.data : JSON.stringify(result.data)
      }
    }
    
    const summary = webSummary 
      ? webSummary.substring(0, 500) + '...'
      : headlines.length > 0 
        ? `Found ${headlines.length} recent news articles about ${name}.`
        : `No recent news found for ${name}.`
    
    return {
      headlines: headlines.slice(0, 5),
      summary,
    }
  } catch (error) {
    console.error('[FinanceGenerator] Error fetching news:', error)
    return { headlines: [], summary: 'Unable to fetch news.' }
  }
}

/**
 * Generate comprehensive LLM analysis
 */
async function generateLLMAnalysis(
  query: string,
  symbol: { symbol: string; name?: string; type: string },
  liveData: { price: number; change: number; changePercent: number; volume: number; marketCap?: number },
  historyData: any[],
  newsData: FinanceMetadata['news'],
  analysis: FinanceAnalysis
): Promise<{
  sector?: string
  industry?: string
  summary: FinanceMetadata['summary']
  fundamentals: FinanceMetadata['fundamentals']
  technicals: FinanceMetadata['technicals']
  cycles: FinanceMetadata['cycles']
  research: FinanceMetadata['research']
}> {
  const aiProvider = getAIProvider(false)
  const isStock = symbol.type === 'stock' || symbol.type === 'index' || symbol.type === 'etf'
  
  const systemPrompt = `You are a senior financial analyst providing comprehensive analysis. 
Use your knowledge to analyze ${symbol.name || symbol.symbol} (${symbol.symbol}).
Current price: $${liveData.price.toFixed(2)}
24h change: ${liveData.changePercent >= 0 ? '+' : ''}${liveData.changePercent.toFixed(2)}%
Volume: ${liveData.volume.toLocaleString()}
${liveData.marketCap ? `Market Cap: $${(liveData.marketCap / 1e9).toFixed(2)}B` : ''}

${newsData.headlines.length > 0 ? `Recent headlines:\n${newsData.headlines.map(h => `- ${h.title}`).join('\n')}` : ''}

Provide analysis in JSON format only.`

  const prompt = `Analyze ${symbol.name || symbol.symbol} for an investor. User query: "${query}"

Respond with JSON:
{
  "sector": "Technology|Healthcare|Finance|...",
  "industry": "Specific industry",
  "summary": {
    "headline": "One-line summary (max 100 chars)",
    "analysis": "2-3 paragraph comprehensive analysis",
    "sentiment": "bullish|neutral|bearish"
  },
  "fundamentals": {
    "available": true,
    "verdict": "undervalued|fairly-valued|overvalued",
    "metrics": [
      {"name": "P/E Ratio", "value": "28.5", "benchmark": "Sector avg: 25", "signal": "neutral", "explanation": "..."},
      {"name": "Revenue Growth", "value": "+12%", "signal": "positive", "explanation": "..."}
    ],
    "analysis": "Fundamental analysis paragraph"
  },
  "technicals": {
    "trend": "uptrend|sideways|downtrend|strong-uptrend|strong-downtrend",
    "support": [{"level": 150.00, "strength": "strong"}],
    "resistance": [{"level": 180.00, "strength": "moderate"}],
    "indicators": [
      {"name": "RSI", "value": "55", "signal": "neutral", "explanation": "..."},
      {"name": "MACD", "value": "Bullish crossover", "signal": "buy", "explanation": "..."}
    ],
    "patterns": [{"name": "Ascending Triangle", "implication": "Bullish continuation"}],
    "analysis": "Technical analysis paragraph"
  },
  "cycles": {
    "phase": "accumulation|markup|distribution|decline",
    "sentiment": 65,
    "sentimentLabel": "Greed|Fear|Neutral",
    "macroContext": "Current macro environment...",
    "seasonality": "Historically strong in Q4"
  },
  "research": {
    "thesis": {
      "bull": ["Bull case point 1", "Bull case point 2"],
      "bear": ["Bear case point 1", "Bear case point 2"]
    },
    "risks": [{"risk": "Competition", "severity": "medium"}, {"risk": "Valuation", "severity": "low"}],
    "catalysts": [{"event": "Earnings Report", "date": "Next month", "impact": "High"}],
    "comparables": [{"symbol": "MSFT", "name": "Microsoft", "note": "Similar business model"}]
  }
}

${isStock ? '' : 'For crypto, skip P/E and traditional metrics. Focus on on-chain metrics, TVL, adoption.'}
Be specific and insightful. Use current knowledge.`

  try {
    const response = await aiProvider.sendMessage({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })
    
    let content = ''
    for await (const chunk of response) {
      content += chunk
    }
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        sector: parsed.sector,
        industry: parsed.industry,
        summary: parsed.summary || { headline: '', analysis: '', sentiment: 'neutral' },
        fundamentals: parsed.fundamentals || { available: false, verdict: 'fairly-valued', metrics: [], analysis: '' },
        technicals: parsed.technicals || { trend: 'sideways', support: [], resistance: [], indicators: [], patterns: [], analysis: '' },
        cycles: parsed.cycles || { phase: 'accumulation', sentiment: 50, sentimentLabel: 'Neutral', macroContext: '' },
        research: parsed.research || { thesis: { bull: [], bear: [] }, risks: [], catalysts: [], comparables: [] },
      }
    }
  } catch (error) {
    console.error('[FinanceGenerator] LLM analysis failed:', error)
  }
  
  // Fallback
  return {
    summary: { 
      headline: `${symbol.name || symbol.symbol} Analysis`, 
      analysis: 'Unable to generate detailed analysis. Please try again.', 
      sentiment: 'neutral' 
    },
    fundamentals: { available: false, verdict: 'fairly-valued', metrics: [], analysis: '' },
    technicals: { trend: 'sideways', support: [], resistance: [], indicators: [], patterns: [], analysis: '' },
    cycles: { phase: 'accumulation', sentiment: 50, sentimentLabel: 'Neutral', macroContext: '' },
    research: { thesis: { bull: [], bear: [] }, risks: [], catalysts: [], comparables: [] },
  }
}
