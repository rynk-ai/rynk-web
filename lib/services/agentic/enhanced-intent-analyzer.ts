/**
 * Enhanced Intent Analyzer
 * 
 * LLM-powered intent classification using structured tool calling.
 * Returns comprehensive EnhancedDetectionResult for domain-aware responses.
 */

import { 
  Domain, 
  InformationType, 
  ComplexityLevel,
  EnhancedDetectionResult,
  ResponseRequirements,
  QueryContext,
  LegacyDetectedTypes
} from '../domain-types'
import { escapeDelimiters } from '@/lib/security/prompt-sanitizer'
import { SourcePlan } from './types'

// ============================================================================
// LLM TOOL SCHEMA
// ============================================================================

const ANALYZE_INTENT_TOOL = {
  type: 'function',
  function: {
    name: 'analyze_intent',
    description: 'Analyze the user query for domain, information type, and response requirements',
    parameters: {
      type: 'object',
      properties: {
        // Domain Classification
        domain: {
          type: 'string',
          enum: ['science', 'medicine', 'business', 'law', 'arts', 'journalism', 
                 'technology', 'design', 'social', 'environment', 'general'],
          description: 'Primary domain of the query'
        },
        subDomain: {
          type: 'string',
          description: 'Specific sub-domain (e.g., "physics", "web_development", "finance"). Use null if unclear.'
        },
        
        // Information Type
        informationType: {
          type: 'string',
          enum: ['factual', 'conceptual', 'procedural', 'analytical', 'mathematical',
                 'current_events', 'research', 'creative', 'diagnostic', 'market_data'],
          description: 'Type of information the user is seeking'
        },
        
        // Reasoning & Search Needs
        needsReasoning: {
          type: 'boolean',
          description: 'Whether deep chain-of-thought reasoning is needed (complex analysis, comparisons, "why" questions)'
        },
        needsWebSearch: {
          type: 'boolean',
          description: 'Whether external/real-time information is needed (current events, prices, latest info)'
        },
        confidence: {
          type: 'number',
          description: 'Confidence in classification (0-1)'
        },
        reasoning: {
          type: 'string',
          description: 'Brief explanation for the classification'
        },
        
        // Response Requirements
        responseRequirements: {
          type: 'object',
          properties: {
            needsDiagrams: { type: 'boolean', description: 'Concept would benefit from visual representation' },
            needsRealTimeData: { type: 'boolean', description: 'Needs current data (prices, news, weather)' },
            needsCitations: { type: 'boolean', description: 'Needs source citations (medical, legal, academic)' },
            needsStepByStep: { type: 'boolean', description: 'Should be formatted as step-by-step guide' },
            needsDisclaimer: { type: 'boolean', description: 'Needs disclaimer (medical, legal, financial advice)' },
            needsComparison: { type: 'boolean', description: 'Is a comparison (A vs B)' },
            needsCode: { type: 'boolean', description: 'Needs code examples' }
          },
          required: ['needsDiagrams', 'needsRealTimeData', 'needsCitations', 'needsStepByStep', 
                     'needsDisclaimer', 'needsComparison', 'needsCode']
        },
        
        // Query Context
        queryContext: {
          type: 'object',
          properties: {
            isUrgent: { type: 'boolean', description: 'Query suggests urgent/emergency situation' },
            isAcademic: { type: 'boolean', description: 'Context suggests academic/student use' },
            isProfessional: { type: 'boolean', description: 'Context suggests professional use' },
            complexityLevel: { 
              type: 'string', 
              enum: ['basic', 'intermediate', 'advanced', 'expert'],
              description: 'Estimated complexity level'
            }
          },
          required: ['isUrgent', 'isAcademic', 'isProfessional', 'complexityLevel']
        },
        
        // Source Planning
        sources: {
          type: 'array',
          items: { type: 'string', enum: ['exa', 'perplexity', 'wikipedia', 'academic'] },
          description: 'Recommended sources to query'
        },
        searchQueries: {
          type: 'object',
          properties: {
            exa: { type: 'string' },
            perplexity: { type: 'string' },
            wikipedia: { type: 'array', items: { type: 'string' } }
          },
          description: 'Optimized queries for each source'
        }
      },
      required: ['domain', 'informationType', 'needsReasoning', 'needsWebSearch', 
                 'confidence', 'reasoning', 'responseRequirements', 'queryContext', 'sources']
    }
  }
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are an expert query analyzer. Analyze the user's query and classify it precisely.

DOMAINS:
- science: Physics, chemistry, biology, mathematics, engineering, astronomy
- medicine: Health, symptoms, treatments, medications, pharmacy, nutrition, mental health (ALWAYS needs disclaimer)
- business: Finance, investing, crypto, marketing, economics, management, accounting (financial advice needs disclaimer)
- law: Legal questions, rights, regulations, policies, contracts (ALWAYS needs disclaimer)
- arts: Literature, history, philosophy, music, film, creative arts, languages
- journalism: News, current events, media, politics, sports reporting
- technology: Software, hardware, programming, cybersecurity, AI/ML, databases, web/mobile dev
- design: UX/UI, architecture, graphic design, industrial design, fashion
- social: Psychology, sociology, education, anthropology, demographics
- environment: Climate, energy, sustainability, conservation, agriculture
- general: Casual questions, greetings, unclear domain

INFORMATION TYPES:
- factual: Quick facts, definitions, data points ("What is X?")
- conceptual: Explanations, understanding how things work ("Explain X")
- procedural: How-to guides, step-by-step instructions ("How do I X?")
- analytical: Comparisons, evaluations, pros/cons ("Compare X vs Y")
- mathematical: Calculations, proofs, formulas, equations
- current_events: Recent news, ongoing situations, latest updates
- research: Deep research, literature reviews, academic analysis
- creative: Writing, brainstorming, ideation ("Write a poem about X")
- diagnostic: Troubleshooting, debugging, problem-solving ("Why isn't X working?")
- market_data: Prices, stocks, crypto, financial data

DISCLAIMER RULES:
- medicine: ALWAYS set needsDisclaimer=true
- law: ALWAYS set needsDisclaimer=true  
- business (financial advice): set needsDisclaimer=true for investment/trading advice

CITATION RULES:
- medicine, law, academic research: ALWAYS set needsCitations=true
- factual claims that could be disputed: set needsCitations=true

WEB SEARCH RULES:
- current_events, market_data: ALWAYS needsWebSearch=true
- Simple conceptual/factual queries about well-known topics: needsWebSearch=false
- When unsure, prefer needsWebSearch=true for better quality`

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export interface EnhancedIntentResult {
  detection: EnhancedDetectionResult
  sourcePlan: SourcePlan
}

/**
 * Analyze query intent using LLM tool calling
 * Returns comprehensive EnhancedDetectionResult + SourcePlan
 */
export async function analyzeIntentEnhanced(
  query: string,
  history: { role: string; content: string }[] = []
): Promise<EnhancedIntentResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('[analyzeIntentEnhanced] Missing GROQ_API_KEY')
    return getEnhancedFallback(query)
  }

  // Format recent history for context
  const recentHistory = history.slice(-4).map(m => `${m.role}: ${m.content.substring(0, 300)}`).join('\n')
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
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${context}User query: <user_input>${escapeDelimiters(query)}</user_input>` }
        ],
        tools: [ANALYZE_INTENT_TOOL],
        tool_choice: 'required',
        temperature: 0,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Groq API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as any
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
    
    if (!toolCall) {
      console.warn('[analyzeIntentEnhanced] No tool call in response, using fallback')
      return getEnhancedFallback(query)
    }

    const args = JSON.parse(toolCall.function.arguments)
    
    // Build EnhancedDetectionResult from tool response
    const detection: EnhancedDetectionResult = {
      // Core reasoning
      needsReasoning: args.needsReasoning,
      needsWebSearch: args.needsWebSearch,
      confidence: args.confidence,
      reasoning: args.reasoning,
      
      // Domain classification
      domain: args.domain as Domain,
      subDomain: args.subDomain || null,
      
      // Information type
      informationType: args.informationType as InformationType,
      
      // Response requirements
      responseRequirements: {
        needsDiagrams: args.responseRequirements?.needsDiagrams ?? false,
        needsRealTimeData: args.responseRequirements?.needsRealTimeData ?? false,
        needsCitations: args.responseRequirements?.needsCitations ?? false,
        needsStepByStep: args.responseRequirements?.needsStepByStep ?? false,
        needsDisclaimer: args.responseRequirements?.needsDisclaimer ?? false,
        needsComparison: args.responseRequirements?.needsComparison ?? false,
        needsCode: args.responseRequirements?.needsCode ?? false
      },
      
      // Query context
      queryContext: {
        isUrgent: args.queryContext?.isUrgent ?? false,
        isAcademic: args.queryContext?.isAcademic ?? false,
        isProfessional: args.queryContext?.isProfessional ?? false,
        complexityLevel: (args.queryContext?.complexityLevel as ComplexityLevel) ?? 'intermediate'
      },
      
      // Legacy compatibility
      detectedTypes: mapToLegacyTypes(args)
    }
    
    // Build SourcePlan
    const sourcePlan: SourcePlan = {
      sources: args.sources || ['perplexity'],
      reasoning: args.reasoning,
      searchQueries: args.searchQueries || { perplexity: query },
      expectedType: mapInfoTypeToExpected(args.informationType)
    }

    console.log(`[analyzeIntentEnhanced] Classified: domain=${detection.domain}, type=${detection.informationType}, webSearch=${detection.needsWebSearch}`)
    
    return { detection, sourcePlan }

  } catch (error) {
    console.error('[analyzeIntentEnhanced] Error:', error)
    return getEnhancedFallback(query)
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function mapToLegacyTypes(args: any): LegacyDetectedTypes {
  return {
    math: args.informationType === 'mathematical',
    code: args.responseRequirements?.needsCode ?? false,
    logic: args.needsReasoning ?? false,
    analysis: args.informationType === 'analytical',
    currentEvents: args.informationType === 'current_events'
  }
}

function mapInfoTypeToExpected(infoType: string): SourcePlan['expectedType'] {
  switch (infoType) {
    case 'factual': return 'quick_fact'
    case 'current_events': return 'current_event'
    case 'analytical': return 'comparison'
    case 'market_data': return 'market_data'
    case 'research': return 'deep_research'
    default: return 'deep_research'
  }
}

function getEnhancedFallback(query: string): EnhancedIntentResult {
  return {
    detection: {
      needsReasoning: false,
      needsWebSearch: true,
      confidence: 0.5,
      reasoning: 'Fallback due to analysis error',
      domain: 'general',
      subDomain: null,
      informationType: 'factual',
      responseRequirements: {
        needsDiagrams: false,
        needsRealTimeData: false,
        needsCitations: false,
        needsStepByStep: false,
        needsDisclaimer: false,
        needsComparison: false,
        needsCode: false
      },
      queryContext: {
        isUrgent: false,
        isAcademic: false,
        isProfessional: false,
        complexityLevel: 'intermediate'
      },
      detectedTypes: {
        math: false,
        code: false,
        logic: false,
        analysis: false,
        currentEvents: false
      }
    },
    sourcePlan: {
      sources: ['perplexity'],
      reasoning: 'Fallback plan',
      searchQueries: { perplexity: query },
      expectedType: 'deep_research'
    }
  }
}
