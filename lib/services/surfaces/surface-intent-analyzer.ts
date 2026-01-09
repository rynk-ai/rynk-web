/**
 * Surface Intent Analyzer
 * 
 * Analyzes user queries to extract structured information for surface generation.
 * Similar to chat service's intent-analyzer, but optimized for surface types.
 */

import type { SurfaceType } from '@/lib/services/domain-types'

export interface SurfaceAnalysis {
  // Extracted from query
  topic: string              // Main topic/subject
  subtopics: string[]        // Related subtopics to cover
  intent: 'learn' | 'do' | 'compare' | 'test' | 'reference' | 'memorize' | 'timeline'
  
  // For web search
  suggestedQueries: string[] // Optimized search queries
  needsWebSearch: boolean    // Whether web data would improve quality
  
  // Quality hints  
  depth: 'basic' | 'intermediate' | 'advanced'
  audience: string           // Target audience
  
  // Original query (cleaned)
  cleanedQuery: string
}

// Map surface type to expected intent
const SURFACE_INTENT_MAP: Record<string, SurfaceAnalysis['intent']> = {
  'learning': 'learn',
  'guide': 'do',
  'quiz': 'test',
  'comparison': 'compare',
  'flashcard': 'memorize',
  'timeline': 'timeline',
  'wiki': 'reference',
  'chat': 'reference',
  'research': 'reference',
  'events': 'reference',
  'professional': 'reference',
  'creative': 'reference',
}

// Surfaces that benefit from web search
const WEB_SEARCH_SURFACES: SurfaceType[] = ['wiki', 'guide', 'comparison', 'timeline']

/**
 * Analyze a query for surface generation
 * OPTIMIZED: Uses tool calling with tool_choice for reliable structured output (like chat-service's intent-analyzer)
 */
export async function analyzeSurfaceQuery(
  query: string,
  surfaceType: SurfaceType
): Promise<SurfaceAnalysis> {
  const apiKey = process.env.GROQ_API_KEY
  
  // Default analysis if API unavailable
  const defaultAnalysis: SurfaceAnalysis = {
    topic: extractMainTopic(query),
    subtopics: [],
    intent: SURFACE_INTENT_MAP[surfaceType] || 'reference',
    suggestedQueries: [query],
    needsWebSearch: WEB_SEARCH_SURFACES.includes(surfaceType),
    depth: 'intermediate',
    audience: 'general learners',
    cleanedQuery: query.trim()
  }
  
  if (!apiKey) {
    console.warn('[SurfaceIntentAnalyzer] Missing GROQ_API_KEY, using default analysis')
    return defaultAnalysis
  }

  // Define tool for structured analysis extraction
  const ANALYZE_QUERY_TOOL = {
    type: 'function',
    function: {
      name: 'analyze_surface_query',
      description: 'Analyze a query and extract structured information for surface generation',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Main topic/subject (clean, concise)'
          },
          subtopics: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key subtopics to cover (3-6 items)'
          },
          suggestedQueries: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optimized search queries for web research'
          },
          needsWebSearch: {
            type: 'boolean',
            description: 'Whether external information would improve quality'
          },
          depth: {
            type: 'string',
            enum: ['basic', 'intermediate', 'advanced'],
            description: 'Appropriate depth level for the content'
          },
          audience: {
            type: 'string',
            description: 'Target audience for this content'
          },
          cleanedQuery: {
            type: 'string',
            description: 'Cleaned/improved version of the original query'
          }
        },
        required: ['topic', 'subtopics', 'suggestedQueries', 'needsWebSearch', 'depth', 'audience', 'cleanedQuery']
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
        model: 'moonshotai/kimi-k2-instruct-0905',
        messages: [{
          role: 'system',
          content: `You are a query analyzer for an educational content platform. The user wants to create a "${surfaceType}" surface.

Guidelines:
- For current events or technology: needsWebSearch = true
- For established concepts or history: needsWebSearch may be false
- suggestedQueries should be specific, optimized for search engines
- subtopics should be 3-6 key areas to cover
- depth should match the query complexity`
        }, {
          role: 'user',
          content: `Analyze this query for a ${surfaceType} surface: "${query}"`
        }],
        tools: [ANALYZE_QUERY_TOOL],
        tool_choice: { type: 'function', function: { name: 'analyze_surface_query' } },
        temperature: 0.1,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data: any = await response.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
    
    if (!toolCall?.function?.arguments) {
      console.warn('[SurfaceIntentAnalyzer] No tool call in response, using fallback')
      return defaultAnalysis
    }
    
    const result = JSON.parse(toolCall.function.arguments)
    
    return {
      topic: result.topic || defaultAnalysis.topic,
      subtopics: result.subtopics || [],
      intent: SURFACE_INTENT_MAP[surfaceType] || 'reference',
      suggestedQueries: result.suggestedQueries || [query],
      needsWebSearch: result.needsWebSearch ?? defaultAnalysis.needsWebSearch,
      depth: result.depth || 'intermediate',
      audience: result.audience || 'general learners',
      cleanedQuery: result.cleanedQuery || query.trim()
    }
    
  } catch (error) {
    console.error('[SurfaceIntentAnalyzer] Error:', error)
    return defaultAnalysis
  }
}


/**
 * Simple topic extraction fallback
 */
function extractMainTopic(query: string): string {
  // Remove common prefixes
  let cleaned = query
    .replace(/^(how to|what is|what are|explain|teach me|learn about|guide to|guide for)\s+/i, '')
    .replace(/^(the|a|an)\s+/i, '')
    .trim()
  
  // Limit length
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 100).trim()
  }
  
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

/**
 * Determine if a topic likely needs current information
 */
export function topicNeedsWebSearch(query: string, surfaceType: SurfaceType): boolean {
  // Always search for these surface types
  if (WEB_SEARCH_SURFACES.includes(surfaceType)) {
    // Check for patterns suggesting current info is needed
    const currentInfoPatterns = [
      /\b(2024|2025|latest|current|recent|new|today|now)\b/i,
      /\b(price|cost|stock|rate|market)\b/i,
      /\b(best|top|recommended|popular)\b/i,
      /\b(vs|versus|compare|comparison)\b/i,
      /\b(how to|setup|install|configure|deploy)\b/i
    ]
    
    return currentInfoPatterns.some(pattern => pattern.test(query))
  }
  
  return false
}
