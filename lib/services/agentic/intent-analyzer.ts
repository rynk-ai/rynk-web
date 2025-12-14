
import { QuickAnalysis, SourcePlan } from './types'
import { sanitize, escapeDelimiters } from '@/lib/security/prompt-sanitizer'

/**
 * Step 1: Quick Pattern Detection using Groq Llama 3.1 8B (ultra-fast)
 * This provides initial categorization in ~50-100ms
 */
export async function quickPatternDetection(
  query: string,
  history: { role: string; content: string }[] = []
): Promise<QuickAnalysis> {
  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    console.error('[quickPatternDetection] Missing GROQ_API_KEY')
    return {
      category: 'complex',
      needsWebSearch: true,
      confidence: 0
    }
  }
  
  // Format recent history (last 3 messages) for context
  const recentHistory = history.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')
  const context = recentHistory ? `\nRecent conversation:\n${recentHistory}\n` : ''
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{
          role: 'system',
          content: `You are a query categorizer. Analyze the user's query and determine:
1. What category it falls into
2. Whether it needs web search for current information
3. Your confidence level (0-1)

Respond ONLY with valid JSON in this exact format:
{
  "category": "current_events" | "factual" | "technical" | "conversational" | "complex",
  "needsWebSearch": true | false,
  "confidence": 0.0 to 1.0
}

Examples:
- "What's the latest news?" → current_events, needsWebSearch: true
- "What is quantum computing?" → factual, needsWebSearch: false
- "How do I implement binary search?" → technical, needsWebSearch: false
- "Hello, how are you?" → conversational, needsWebSearch: false
- "Compare React vs Vue for 2024" → complex, needsWebSearch: true`
        }, {
          role: 'user',
          content: `${context}User query: <user_input>${escapeDelimiters(query)}</user_input>`
        }],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 150
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as any
    const result = JSON.parse(data.choices[0].message.content || '{}')
    return result as QuickAnalysis
  } catch (error) {
    console.error('[quickPatternDetection] Error:', error)
    // Fallback to conservative analysis
    return {
      category: 'complex',
      needsWebSearch: true,
      confidence: 0.5
    }
  }
}

/**
 * Step 2: Deep Intent Analysis using Claude Haiku (reasoning)
 * Determines exactly which sources to use and what queries to make
 */
export async function deepIntentAnalysis(
  query: string,
  quickAnalysis: QuickAnalysis,
  history: { role: string; content: string }[] = []
): Promise<SourcePlan> {
  // Format recent history (last 5 messages) for context
  const recentHistory = history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')
  const context = recentHistory ? `\nRecent conversation:\n${recentHistory}\n` : ''

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://rynk.io',
        'X-Title': 'Rynk'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [{
          role: 'system',
          content: `You are an expert research planner. Your job is to determine which information sources to use and what to search for.

Available sources:
- exa: Semantic web search, excellent for finding specific articles, technical content, recent information
- perplexity: AI-powered search with real-time web data and automatic citations
- wikipedia: Encyclopedic knowledge, definitions, historical facts, established information
- financial: Real-time stock and cryptocurrency data (prices, charts, market data)

Guidelines:
- For current events (2024-2025): Use exa + perplexity
- For historical facts: Use wikipedia
- For technical deep-dives: Use exa
- For comparisons: Use all sources
- For simple facts: Use wikipedia
- For stock prices/analysis: Use financial (extract ticker symbols like AAPL, MSFT, GOOGL)
- For crypto prices: Use financial (use coin IDs like bitcoin, ethereum, solana)
- For market questions: Combine financial + perplexity for context

IMPORTANT: For financial queries:
- Extract ticker symbols (e.g., "Apple stock" → AAPL, "Tesla" → TSLA)
- For crypto, use lowercase coin IDs (bitcoin, ethereum, solana, dogecoin)
- Indian stocks use .NS suffix (e.g., RELIANCE.NS, TCS.NS)

You must respond with a JSON object following this schema:
{
  "sources": ["exa", "perplexity", "wikipedia", "financial"], // Array of selected sources
  "reasoning": "string", // Explanation of why these sources were chosen
  "searchQueries": {
    "exa": "string", // Query for Exa (optional)
    "perplexity": "string", // Query for Perplexity (optional)
    "wikipedia": ["string"], // Array of Wikipedia titles (optional)
    "financial": { // For stock/crypto data (optional)
      "type": "stock" | "crypto",
      "symbols": ["string"] // Ticker symbols or coin IDs
    }
  },
  "expectedType": "quick_fact" | "deep_research" | "current_event" | "comparison" | "market_data"
}

Create optimized search queries for each source. Be specific and targeted.
Respond ONLY with valid JSON. Do not include any conversational text.`
        }, {
          role: 'user',
          content: `${context}Original query: <user_input>${escapeDelimiters(query)}</user_input>

Quick analysis results:
- Category: ${quickAnalysis.category}
- Needs web search: ${quickAnalysis.needsWebSearch}
- Confidence: ${quickAnalysis.confidence}

Determine the best sources to use and create specific search queries for each.`
        }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 500
      })
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json() as any
    const content = data.choices?.[0]?.message?.content
    
    if (!content) {
      throw new Error('No content in response')
    }

    let plan: SourcePlan
    try {
      // Try to parse directly first
      plan = JSON.parse(content) as SourcePlan
    } catch (e) {
      // If direct parse fails, try to extract JSON object
      // Look for the first '{' and the last '}'
      const firstBrace = content.indexOf('{')
      const lastBrace = content.lastIndexOf('}')
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonString = content.substring(firstBrace, lastBrace + 1)
        plan = JSON.parse(jsonString) as SourcePlan
      } else {
        throw e
      }
    }
    
    return plan
  } catch (error) {
    console.error('[deepIntentAnalysis] Error:', error)
    // Fallback plan based on quick analysis
    return {
      sources: quickAnalysis.needsWebSearch ? ['exa', 'perplexity'] : ['perplexity'],
      reasoning: 'Fallback plan due to analysis error',
      searchQueries: {
        exa: query,
        perplexity: query
      },
      expectedType: quickAnalysis.category === 'current_events' ? 'current_event' : 'deep_research'
    }
  }
}

/**
 * Main entry point: Analyze user intent and create execution plan
 */
export async function analyzeIntent(
  query: string,
  history: { role: string; content: string }[] = []
): Promise<{
  quickAnalysis: QuickAnalysis
  sourcePlan: SourcePlan
}> {
  // Step 1: Quick categorization (50-100ms)
  const quickAnalysis = await quickPatternDetection(query, history)
  
  // Step 2: Deep planning (200-300ms)
  const sourcePlan = await deepIntentAnalysis(query, quickAnalysis, history)
  
  return {
    quickAnalysis,
    sourcePlan
  }
}
