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

// === HEURISTIC PATTERNS FOR FAST DETECTION ===
const WEB_SEARCH_KEYWORDS = [
  // Current events
  'latest', 'recent', 'current', 'today', 'now', 'news', '2024', '2025',
  // Market data
  'price', 'stock', 'crypto', 'bitcoin', 'ethereum', 'market',
  // Comparisons
  'vs', 'versus', 'compare', 'comparison', 'better', 'best', 'top', 'recommended',
  // Research
  'research', 'study', 'statistics', 'data on', 'facts about',
  // Tech (frameworks change)
  'tutorial', 'guide', 'documentation', 'docs'
]

const WEB_SEARCH_PATTERNS = [
  /what.*(happen|going on|trending)/i,
  /who (is|are) (the|a)?/i,
  /(when|where) (is|was|will)/i,
  /how much (is|does|do)/i,
  /price of/i,
  /latest (news|updates|version)/i,
  /\d{4}.*\b(best|top|new)\b/i,  // Year + best/top/new
  /(update|release|launch|announce)/i
]

const REASONING_PATTERNS = [
  /explain.*(how|why|what)/i,
  /analyze|analysis/i,
  /compare|comparison|versus|vs\b/i,
  /solve|calculate|compute/i,
  /debug|troubleshoot|fix/i,
  /implement|build|create.*code/i,
  /step[- ]?by[- ]?step/i
]

const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  medicine: [/medical|health|symptom|disease|drug|medicine|therapy|doctor|patient|clinic/i],
  technology: [/code|programming|software|api|database|server|frontend|backend|react|python|javascript/i],
  business: [/finance|invest|stock|market|crypto|bitcoin|business|startup|profit/i],
  law: [/legal|law|court|attorney|contract|liability|sue|lawsuit/i],
  science: [/physics|chemistry|biology|math|equation|formula|experiment|research/i],
  arts: [/poem|story|write|creative|art|music|movie|film|book|novel/i],
}

const CODE_PATTERNS = [
  /\b(code|programming|function|class|method|variable|debug|error|bug|implement)/i,
  /\b(react|vue|angular|python|javascript|typescript|java|go|rust|sql)\b/i,
  /\b(api|endpoint|server|database|query|crud)\b/i,
  /```/,  // Code blocks in message
]

const MATH_PATTERNS = [
  /\b(solve|calculate|compute|integrate|derivative|sum|equation)\b/i,
  /[∫∑∏√±÷×]/,  // Math symbols
  /\d+\s*[+\-*/^]\s*\d+/,  // Basic arithmetic
  /\b(algebra|calculus|geometry|trigonometry|statistics)\b/i
]

const DISCLAIMER_DOMAINS = ['medicine', 'law', 'business']

/**
 * FAST Enhanced detection using heuristics (no LLM call)
 * Runs in microseconds instead of 100-500ms
 */
export function detectEnhancedFast(query: string): EnhancedDetectionResult {
  const lowerQuery = query.toLowerCase()
  
  // === DOMAIN DETECTION ===
  let domain: Domain = 'general'
  let subDomain: string | null = null
  
  for (const [d, patterns] of Object.entries(DOMAIN_PATTERNS)) {
    if (patterns.some(p => p.test(query))) {
      domain = d as Domain
      break
    }
  }

  // === WEB SEARCH DETECTION ===
  const hasWebSearchKeyword = WEB_SEARCH_KEYWORDS.some(kw => lowerQuery.includes(kw))
  const matchesWebSearchPattern = WEB_SEARCH_PATTERNS.some(p => p.test(query))
  const needsWebSearch = hasWebSearchKeyword || matchesWebSearchPattern

  // === REASONING DETECTION ===
  const matchesReasoningPattern = REASONING_PATTERNS.some(p => p.test(query))
  const needsReasoning = matchesReasoningPattern || needsWebSearch

  // === CODE DETECTION ===
  const needsCode = CODE_PATTERNS.some(p => p.test(query))
  
  // === MATH DETECTION ===
  const isMath = MATH_PATTERNS.some(p => p.test(query))
  
  // === INFORMATION TYPE ===
  let informationType: InformationType = 'factual'
  if (isMath) informationType = 'mathematical'
  else if (/how (do|to|can)/i.test(query)) informationType = 'procedural'
  else if (/compare|vs|versus/i.test(query)) informationType = 'analytical'
  else if (/explain|what is|define/i.test(query)) informationType = 'conceptual'
  else if (/news|latest|current/i.test(query)) informationType = 'current_events'
  else if (/write|create.*story|poem|creative/i.test(query)) informationType = 'creative'
  else if (/debug|error|fix|troubleshoot/i.test(query)) informationType = 'diagnostic'
  else if (/price|market|stock/i.test(query)) informationType = 'market_data'

  // === COMPLEXITY ===
  const queryLength = query.length
  let complexityLevel: ComplexityLevel = 'basic'
  if (queryLength > 500) complexityLevel = 'advanced'
  else if (queryLength > 200) complexityLevel = 'intermediate'

  return {
    needsReasoning,
    needsWebSearch,
    confidence: 0.8,  // Heuristic confidence
    reasoning: 'Fast heuristic detection',
    
    domain,
    subDomain,
    informationType,
    
    responseRequirements: {
      needsDiagrams: /diagram|visual|chart|graph/i.test(query),
      needsRealTimeData: /price|current|live|now/i.test(query),
      needsCitations: domain === 'science' || domain === 'medicine',
      needsStepByStep: /step|how to|tutorial|guide/i.test(query),
      needsDisclaimer: DISCLAIMER_DOMAINS.includes(domain),
      needsComparison: /compare|vs|versus|difference/i.test(query),
      needsCode,
    },
    
    queryContext: {
      isUrgent: /urgent|asap|immediately|now/i.test(query),
      isAcademic: /research|paper|thesis|academic|study/i.test(query),
      isProfessional: /client|project|deadline|work/i.test(query),
      complexityLevel,
    },
    
    detectedTypes: {
      math: isMath,
      code: needsCode,
      logic: /logic|reason|proof|argument/i.test(query),
      analysis: /analyze|analysis|evaluate/i.test(query),
      currentEvents: /news|latest|current|today/i.test(query),
    }
  }
}

/**
 * Enhanced detection with domain awareness
 * NOW USES FAST HEURISTICS BY DEFAULT - no LLM call
 * Falls back to LLM only if explicitly requested
 */
export async function detectEnhanced(
  query: string,
  useLLM: boolean = false  // Default to fast heuristics
): Promise<EnhancedDetectionResult> {
  // === OPTIMIZATION: Use fast heuristics by default ===
  if (!useLLM) {
    console.log('⚡ [detectEnhanced] Using fast heuristics (no LLM call)')
    return detectEnhancedFast(query)
  }
  
  // === FALLBACK: LLM-based detection (only if explicitly requested) ===
  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    console.error('[detectEnhanced] Missing GROQ_API_KEY, using heuristics')
    return detectEnhancedFast(query)
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
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
    console.error('[detectEnhanced] LLM error, falling back to heuristics:', error)
    return detectEnhancedFast(query)
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
