/**
 * Enhanced Reasoning Detector
 * 
 * Analyzes queries to determine:
 * - If extended reasoning is needed
 * - If web search should be triggered
 * - Domain and sub-domain classification
 * - Information type (factual, procedural, analytical, etc.)
 * - Response requirements (diagrams, citations, disclaimers, etc.)
 */

import {
  Domain,
  InformationType,
  ComplexityLevel,
  EnhancedDetectionResult,
  getDefaultDetectionResult
} from './domain-types'

// Legacy interface for backward compatibility
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

// ============================================================================
// ENHANCED DETECTION PROMPT
// ============================================================================

const ENHANCED_DETECTION_PROMPT = `You are an advanced query classifier for a premium AI knowledge assistant.

TASK: Analyze the user's query and provide comprehensive classification for generating high-quality responses.

OUTPUT FORMAT (JSON only, no other text):
{
  "needsReasoning": boolean,
  "needsWebSearch": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  
  "domain": "science|medicine|business|law|arts|journalism|technology|design|social|environment|general",
  "subDomain": "specific sub-domain or null",
  
  "informationType": "factual|conceptual|procedural|analytical|mathematical|current_events|research|creative|diagnostic|market_data",
  
  "responseRequirements": {
    "needsDiagrams": boolean,
    "needsRealTimeData": boolean,
    "needsCitations": boolean,
    "needsStepByStep": boolean,
    "needsDisclaimer": boolean,
    "needsComparison": boolean,
    "needsCode": boolean
  },
  
  "queryContext": {
    "isUrgent": boolean,
    "isAcademic": boolean,
    "isProfessional": boolean,
    "complexityLevel": "basic|intermediate|advanced|expert"
  },
  
  "detectedTypes": {
    "math": boolean,
    "code": boolean,
    "logic": boolean,
    "analysis": boolean,
    "currentEvents": boolean
  }
}

DOMAIN CLASSIFICATION RULES:
- science: Physics, chemistry, biology, math, engineering, astronomy
- medicine: Health, medical, pharmacy, nursing, psychology, nutrition
- business: Finance, economics, marketing, management, investing, crypto
- law: Legal, constitutional, criminal, contracts, policy, politics
- arts: Literature, history, philosophy, music, film, languages
- journalism: News, current events, media, reporting
- technology: Software, coding, web dev, AI/ML, cybersecurity, cloud
- design: Architecture, UX/UI, graphic design, interior, industrial
- social: Sociology, education, anthropology, geography
- environment: Climate, energy, agriculture, conservation
- general: Casual chat, general knowledge, unclear domain

INFORMATION TYPE RULES:
- factual: Direct facts, definitions, data lookup (What is X?)
- conceptual: Explanations, understanding (How does X work?)
- procedural: Step-by-step instructions (How do I do X?)
- analytical: Comparisons, analysis (Compare X vs Y, Analyze X)
- mathematical: Calculations, proofs, equations
- current_events: News, recent developments, trends (What's happening with X?)
- research: Academic research, literature reviews (Research on X)
- creative: Writing, brainstorming, ideation (Write a poem about X)
- diagnostic: Troubleshooting, debugging (Why isn't X working?)
- market_data: Prices, stocks, crypto, financial data (Price of X)

RESPONSE REQUIREMENTS RULES:
- needsDiagrams: Concepts that benefit from visual representation
- needsRealTimeData: Prices, news, weather, current stats
- needsCitations: Medical, legal, academic, scientific claims
- needsStepByStep: How-to, tutorials, procedures
- needsDisclaimer: Medical advice, legal advice, financial advice
- needsComparison: A vs B, which is better, compare
- needsCode: Programming, debugging, implementation questions

WEB SEARCH DECISION GUIDE (LEAN TOWARD SEARCH):
Set needsWebSearch: true for ANY of these:
- Current events, news, or recent developments
- Prices, market data, statistics, or financial information
- Comparisons between products, services, or technologies
- Research topics or academic questions
- Specific entities (companies, people, products, places)
- Technology questions (frameworks, tools, best practices change)
- Medical or health questions (for latest guidance)
- Legal or regulatory questions (laws change)
- "Best", "top", "recommended" queries
- Anything where current/verified information would improve the answer

Set needsWebSearch: false only for:
- Pure math calculations
- Creative writing requests
- General conceptual explanations that don't change
- Abstract philosophical questions
- Personal advice or opinions
- Simple coding syntax questions

When in doubt, lean toward needsWebSearch: true - fresh information improves response quality.

EXAMPLES:

Query: "What are the side effects of ibuprofen?"
→ domain: "medicine", subDomain: "pharmacy", informationType: "factual"
→ needsDisclaimer: true, needsCitations: true, needsWebSearch: true

Query: "Compare React vs Vue for a new project"
→ domain: "technology", subDomain: "web_development", informationType: "analytical"
→ needsComparison: true, needsWebSearch: true

Query: "Solve ∫(x² + 3x)dx"
→ domain: "science", subDomain: "mathematics", informationType: "mathematical"
→ needsStepByStep: true, needsWebSearch: false

Query: "How do I configure NGINX as a reverse proxy?"
→ domain: "technology", subDomain: "devops", informationType: "procedural"
→ needsStepByStep: true, needsCode: true, needsWebSearch: true

Query: "Current price of Bitcoin"
→ domain: "business", subDomain: "cryptocurrency", informationType: "market_data"
→ needsRealTimeData: true, needsDisclaimer: true, needsWebSearch: true

Query: "Latest news on AI regulation"
→ domain: "journalism", informationType: "current_events"
→ needsRealTimeData: true, needsCitations: true, needsWebSearch: true

Query: "Why is my React component re-rendering infinitely?"
→ domain: "technology", subDomain: "web_development", informationType: "diagnostic"
→ needsCode: true, needsWebSearch: true

Query: "Explain the difference between civil and criminal law"
→ domain: "law", informationType: "conceptual"
→ needsDisclaimer: true, needsWebSearch: true

Query: "Write a haiku about autumn"
→ domain: "arts", subDomain: "creative_writing", informationType: "creative"
→ needsWebSearch: false

Query: "What is photosynthesis?"
→ domain: "science", subDomain: "biology", informationType: "conceptual"
→ needsWebSearch: false
`

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Enhanced detection with domain awareness
 * Returns comprehensive classification for high-quality response generation
 */
export async function detectEnhanced(
  query: string
): Promise<EnhancedDetectionResult> {
  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    console.error('[detectEnhanced] Missing GROQ_API_KEY')
    return getDefaultDetectionResult()
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
        messages: [
          {
            role: 'system',
            content: ENHANCED_DETECTION_PROMPT
          },
          {
            role: 'user',
            content: query
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`)
    }

    const data: any = await response.json()
    const result = JSON.parse(data.choices[0].message.content || '{}')
    
    // Validate and normalize the result
    return normalizeDetectionResult(result)
    
  } catch (error) {
    console.error('[detectEnhanced] Error:', error)
    return getDefaultDetectionResult()
  }
}

/**
 * Legacy detection function for backward compatibility
 */
export async function detectReasoning(
  query: string
): Promise<ReasoningDetectionResult> {
  // Use enhanced detection and extract legacy fields
  const enhanced = await detectEnhanced(query)
  
  return {
    needsReasoning: enhanced.needsReasoning,
    needsWebSearch: enhanced.needsWebSearch,
    confidence: enhanced.confidence,
    reasoning: enhanced.reasoning,
    detectedTypes: enhanced.detectedTypes
  }
}

/**
 * Normalize and validate detection result
 */
function normalizeDetectionResult(raw: any): EnhancedDetectionResult {
  const defaults = getDefaultDetectionResult()
  
  // Validate domain
  const validDomains: Domain[] = [
    'science', 'medicine', 'business', 'law', 'arts', 
    'journalism', 'technology', 'design', 'social', 
    'environment', 'general'
  ]
  const domain: Domain = validDomains.includes(raw.domain) ? raw.domain : 'general'
  
  // Validate information type
  const validInfoTypes: InformationType[] = [
    'factual', 'conceptual', 'procedural', 'analytical',
    'mathematical', 'current_events', 'research', 
    'creative', 'diagnostic', 'market_data'
  ]
  const informationType: InformationType = validInfoTypes.includes(raw.informationType) 
    ? raw.informationType 
    : 'factual'
  
  // Validate complexity level
  const validComplexity: ComplexityLevel[] = ['basic', 'intermediate', 'advanced', 'expert']
  const complexityLevel: ComplexityLevel = 
    raw.queryContext?.complexityLevel && validComplexity.includes(raw.queryContext.complexityLevel)
      ? raw.queryContext.complexityLevel
      : 'basic'

  return {
    needsReasoning: Boolean(raw.needsReasoning),
    needsWebSearch: Boolean(raw.needsWebSearch),
    confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.5,
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : '',
    
    domain,
    subDomain: typeof raw.subDomain === 'string' ? raw.subDomain : null,
    
    informationType,
    
    responseRequirements: {
      needsDiagrams: Boolean(raw.responseRequirements?.needsDiagrams),
      needsRealTimeData: Boolean(raw.responseRequirements?.needsRealTimeData),
      needsCitations: Boolean(raw.responseRequirements?.needsCitations),
      needsStepByStep: Boolean(raw.responseRequirements?.needsStepByStep),
      needsDisclaimer: Boolean(raw.responseRequirements?.needsDisclaimer),
      needsComparison: Boolean(raw.responseRequirements?.needsComparison),
      needsCode: Boolean(raw.responseRequirements?.needsCode),
    },
    
    queryContext: {
      isUrgent: Boolean(raw.queryContext?.isUrgent),
      isAcademic: Boolean(raw.queryContext?.isAcademic),
      isProfessional: Boolean(raw.queryContext?.isProfessional),
      complexityLevel,
    },
    
    detectedTypes: {
      math: Boolean(raw.detectedTypes?.math),
      code: Boolean(raw.detectedTypes?.code),
      logic: Boolean(raw.detectedTypes?.logic),
      analysis: Boolean(raw.detectedTypes?.analysis),
      currentEvents: Boolean(raw.detectedTypes?.currentEvents),
    }
  }
}

// ============================================================================
// REASONING MODE RESOLUTION
// ============================================================================

/**
 * Resolve the final reasoning mode based on user preference and detection
 */
export function resolveReasoningMode(
  userMode: ReasoningMode,
  detection: ReasoningDetectionResult | EnhancedDetectionResult
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
