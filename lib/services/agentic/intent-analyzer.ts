
import { QuickAnalysis, SourcePlan } from './types'
import { escapeDelimiters } from '@/lib/security/prompt-sanitizer'

const PLAN_RESEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'plan_research',
    description: 'Analyze query and create a research plan with source selection',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['current_events', 'factual', 'technical', 'conversational', 'complex'],
          description: 'Category of the user query'
        },
        needsWebSearch: {
          type: 'boolean',
          description: 'Whether external information is needed',
        },
        needsReasoning: {
          type: 'boolean',
          description: 'Whether deep chain-of-thought reasoning is needed (for complex analysis, comparisons, coding, or "why" questions)',
        },
        confidence: {
          type: 'number',
          description: 'Confidence score (0-1)'
        },
        sources: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['exa', 'perplexity', 'wikipedia']
          },
          description: 'List of sources to query'
        },
        reasoning: {
          type: 'string',
          description: 'Explanation for the plan'
        },
        searchQueries: {
          type: 'object',
          properties: {
            exa: { type: 'string' },
            perplexity: { type: 'string' },
            wikipedia: { 
              type: 'array',
              items: { type: 'string' }
            }
          },
          description: 'Specific queries for each selected source'
        },
        expectedType: {
          type: 'string',
          enum: ['quick_fact', 'deep_research', 'current_event', 'comparison', 'market_data']
        }
      },
      required: ['category', 'needsWebSearch', 'needsReasoning', 'confidence', 'sources', 'reasoning', 'searchQueries', 'expectedType']
    }
  }
}

/**
 * Single-step Intent Analysis & Planning using Kimi K2 Tool Calling
 * Combines categorization and planning into one fast request (~200ms)
 */
export async function analyzeIntent(
  query: string,
  history: { role: string; content: string }[] = []
): Promise<{
  quickAnalysis: QuickAnalysis
  sourcePlan: SourcePlan
}> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('[analyzeIntent] Missing GROQ_API_KEY')
    return getFallbackResult(query)
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
        model: 'moonshotai/kimi-k2-instruct-0905',
        messages: [{
          role: 'system',
          content: `You are an expert research planner. Analyze the user's query and call the 'plan_research' tool to create an execution plan.

Available sources:
- exa: Semantic web search, excellent for finding specific articles, technical content, recent information
- perplexity: AI-powered search with real-time web data and automatic citations
- wikipedia: Encyclopedic knowledge, definitions, historical facts, established information
- For comparisons: Use all sources
- For simple facts: Use wikipedia`
        }, {
          role: 'user',
          content: `${context}User query: <user_input>${escapeDelimiters(query)}</user_input>`
        }],
        tools: [PLAN_RESEARCH_TOOL],
        tool_choice: 'required', // Force the model to use the tool
        temperature: 0,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
        // Log detailed error for debugging
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Groq API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as any
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
    
    if (!toolCall) {
      console.warn('[analyzeIntent] No tool call in response, using fallback')
      return getFallbackResult(query)
    }

    const args = JSON.parse(toolCall.function.arguments)
    
    // Map tool arguments to our strict types
    return {
      quickAnalysis: {
        category: args.category,
        needsWebSearch: args.needsWebSearch,
        needsReasoning: args.needsReasoning,
        confidence: args.confidence
      },
      sourcePlan: {
        sources: args.sources,
        reasoning: args.reasoning,
        searchQueries: args.searchQueries,
        expectedType: args.expectedType
      }
    }

  } catch (error) {
    console.error('[analyzeIntent] Error:', error)
    return getFallbackResult(query)
  }
}



function getFallbackResult(query: string): { quickAnalysis: QuickAnalysis, sourcePlan: SourcePlan } {
  return {
    quickAnalysis: {
      category: 'complex',
      needsWebSearch: true,
      needsReasoning: false,
      confidence: 0.5
    },
    sourcePlan: {
      sources: ['perplexity'],
      reasoning: 'Fallback plan due to analysis error',
      searchQueries: {
        exa: query,
        perplexity: query
      },
      expectedType: 'deep_research'
    }
  }
}
