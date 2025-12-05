

/**
 * Reasoning Detector - Analyzes queries to determine if they need extended reasoning
 * Uses fast LLM (Groq) for classification
 */

export interface ReasoningDetectionResult {
  needsReasoning: boolean
  needsWebSearch: boolean
  confidence: number
  reasoning: string
  detectedTypes: {
    math: boolean
    code: boolean
    logic: boolean
    analysis: boolean
    currentEvents: boolean
  }
}

export type ReasoningMode = 'auto' | 'on' | 'online' | 'off'

/**
 * Detect if a query needs extended reasoning
 */
export async function detectReasoning(
  query: string
): Promise<ReasoningDetectionResult> {
  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    console.error('[detectReasoning] Missing GROQ_API_KEY')
    return {
      needsReasoning: false,
      needsWebSearch: false,
      confidence: 0,
      reasoning: 'Missing API Key',
      detectedTypes: {
        math: false,
        code: false,
        logic: false,
        analysis: false,
        currentEvents: false
      }
    }
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
          content: `You are a query classifier. Analyze if the query needs extended reasoning (deep thinking, step-by-step analysis).

Queries that NEED reasoning:
- Mathematical calculations or word problems
- Code analysis, debugging, or algorithm design
- Logical puzzles or deductive reasoning
- Complex comparisons requiring multi-factor analysis
- Strategic planning or decision-making
- Analysis of current events or trends

Queries that also need WEB SEARCH:
- Current events or recent developments (2024-2025)
- Latest tech trends, releases, or updates
- Recent news or real-time information
- Comparisons requiring current data

Respond ONLY with valid JSON in this format:
{
  "needsReasoning": true/false,
  "needsWebSearch": true/false,
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation",
  "detectedTypes": {
    "math": true/false,
    "code": true/false,
    "logic": true/false,
    "analysis": true/false,
    "currentEvents": true/false
  }
}

Examples:
- "Calculate 15% of 480" → needsReasoning: true, needsWebSearch: false, math: true
- "Debug this React code" → needsReasoning: true, needsWebSearch: false, code: true
- "Compare React vs Vue in 2024" → needsReasoning: true, needsWebSearch: true, analysis: true, currentEvents: true
- "Hello, how are you?" → needsReasoning: false, needsWebSearch: false`
        }, {
          role: 'user',
          content: query
        }],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 200
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`)
    }

    const data :any= await response.json()
    const result = JSON.parse(data.choices[0].message.content || '{}')
    return result as ReasoningDetectionResult
  } catch (error) {
    console.error('[detectReasoning] Error:', error)
    // Fallback: conservative detection
    return {
      needsReasoning: false,
      needsWebSearch: false,
      confidence: 0.5,
      reasoning: 'Detection error - defaulting to no reasoning',
      detectedTypes: {
        math: false,
        code: false,
        logic: false,
        analysis: false,
        currentEvents: false
      }
    }
  }
}

/**
 * Resolve the final reasoning mode based on user preference and detection
 */
export function resolveReasoningMode(
  userMode: ReasoningMode,
  detection: ReasoningDetectionResult
): { useReasoning: boolean; useWebSearch: boolean } {
  // User explicitly disabled reasoning
  if (userMode === 'off') {
    return { useReasoning: false, useWebSearch: false }
  }
  
  // User explicitly enabled reasoning (no web)
  if (userMode === 'on') {
    return { useReasoning: true, useWebSearch: false }
  }
  
  // User explicitly enabled reasoning with web search
  if (userMode === 'online') {
    return { useReasoning: true, useWebSearch: true }
  }
  
  // Auto mode - use detection result
  return {
    useReasoning: detection.needsReasoning,
    useWebSearch: detection.needsWebSearch
  }
}

/**
 * Get the appropriate model based on reasoning and web search needs
 */
export function getReasoningModel(
  useReasoning: boolean,
  useWebSearch: boolean
): string {
  if (!useReasoning) {
    // Normal chat - use fast model
    return 'anthropic/claude-3.5-haiku'
  }
  
  if (useWebSearch) {
    // Reasoning with web search
    return 'anthropic/claude-3.5-haiku:online'
  }
  
  // Reasoning without web search
  return 'anthropic/claude-3.5-haiku'
}
