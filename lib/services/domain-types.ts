/**
 * Domain-Specific Response Types
 * 
 * Comprehensive type definitions for domain-aware AI response formatting.
 * Used by the enhanced reasoning detector and domain formatter.
 */

// ============================================================================
// DOMAIN CLASSIFICATION
// ============================================================================

/**
 * Top-level domain classification for academic and professional fields
 */
export type Domain = 
  | 'science'       // Natural, Formal, Applied Sciences
  | 'medicine'      // Health, Medical, Pharmacy, Nursing
  | 'business'      // Finance, Economics, Marketing, Management
  | 'law'           // Legal, Political, Policy
  | 'arts'          // Literature, History, Philosophy, Music, Film
  | 'journalism'    // News, Media, Communications
  | 'technology'    // Software, Hardware, IT, Cybersecurity
  | 'design'        // Architecture, UX/UI, Industrial, Interior
  | 'social'        // Sociology, Psychology, Education, Anthropology
  | 'environment'   // Climate, Energy, Agriculture, Marine
  | 'general'       // Default for unclassified queries

/**
 * Sub-domains for more specific classification
 */
export const SUB_DOMAINS: Record<Domain, string[]> = {
  science: [
    'physics', 'chemistry', 'biology', 'astronomy', 'earth_sciences',
    'mathematics', 'statistics', 'computer_science', 'logic',
    'civil_engineering', 'mechanical_engineering', 'electrical_engineering',
    'software_engineering', 'chemical_engineering', 'aerospace_engineering'
  ],
  medicine: [
    'general_medicine', 'surgery', 'pharmacy', 'nursing', 'dentistry',
    'physiotherapy', 'psychology', 'psychiatry', 'public_health',
    'nutrition', 'pediatrics', 'cardiology', 'oncology', 'neurology'
  ],
  business: [
    'finance', 'accounting', 'marketing', 'management', 'economics',
    'entrepreneurship', 'hr', 'operations', 'supply_chain', 'consulting',
    'real_estate', 'investment_banking', 'venture_capital', 'cryptocurrency'
  ],
  law: [
    'constitutional', 'criminal', 'civil', 'corporate', 'international',
    'intellectual_property', 'tax', 'labor', 'environmental', 'immigration',
    'family', 'contract', 'tort', 'administrative'
  ],
  arts: [
    'literature', 'history', 'philosophy', 'art_history', 'music',
    'film', 'theater', 'dance', 'photography', 'creative_writing',
    'languages', 'linguistics', 'religious_studies', 'classics'
  ],
  journalism: [
    'news_reporting', 'investigative', 'data_journalism', 'broadcast',
    'digital_media', 'photojournalism', 'sports_journalism', 'science_journalism',
    'opinion', 'feature_writing'
  ],
  technology: [
    'web_development', 'mobile_development', 'ai_ml', 'data_science',
    'cybersecurity', 'cloud_computing', 'devops', 'blockchain',
    'iot', 'ar_vr', 'game_development', 'databases', 'networking'
  ],
  design: [
    'architecture', 'interior_design', 'urban_planning', 'industrial_design',
    'ux_design', 'ui_design', 'graphic_design', 'fashion_design',
    'product_design', 'service_design'
  ],
  social: [
    'sociology', 'anthropology', 'geography', 'education', 'social_work',
    'political_science', 'international_relations', 'criminology',
    'demographics', 'cultural_studies'
  ],
  environment: [
    'climate_science', 'sustainable_energy', 'agriculture', 'forestry',
    'marine_science', 'ecology', 'conservation', 'environmental_policy',
    'waste_management', 'water_resources'
  ],
  general: []
}

// ============================================================================
// INFORMATION TYPE CLASSIFICATION
// ============================================================================

/**
 * Type of information/response the user is seeking
 * Determines response structure and formatting
 */
export type InformationType = 
  | 'factual'         // Direct facts, definitions, data points
  | 'conceptual'      // Explanations, understanding concepts
  | 'procedural'      // How-to, step-by-step instructions
  | 'analytical'      // Comparisons, analysis, evaluations
  | 'mathematical'    // Calculations, proofs, formulas
  | 'current_events'  // News, recent developments, trends
  | 'research'        // Academic research, literature reviews
  | 'creative'        // Writing, ideas, brainstorming
  | 'diagnostic'      // Troubleshooting, debugging, problem-solving
  | 'market_data'     // Prices, financial data, market analysis

/**
 * Complexity level of the query
 */
export type ComplexityLevel = 'basic' | 'intermediate' | 'advanced' | 'expert'

// ============================================================================
// RESPONSE REQUIREMENTS
// ============================================================================

/**
 * Requirements for response formatting and content
 */
export interface ResponseRequirements {
  /** Whether the response needs visual diagrams or descriptions */
  needsDiagrams: boolean
  /** Whether real-time/current data should be fetched */
  needsRealTimeData: boolean
  /** Whether sources must be cited (academic, medical, legal) */
  needsCitations: boolean
  /** Whether response should be step-by-step format */
  needsStepByStep: boolean
  /** Whether a disclaimer is required (medical, financial, legal) */
  needsDisclaimer: boolean
  /** Whether response is a comparison (A vs B) */
  needsComparison: boolean
  /** Whether code examples are expected */
  needsCode: boolean
}

/**
 * Context about the query/user
 */
export interface QueryContext {
  /** Whether this is an urgent/emergency query */
  isUrgent: boolean
  /** Whether context suggests academic/student use */
  isAcademic: boolean
  /** Whether context suggests professional use */
  isProfessional: boolean
  /** Estimated complexity level of the query */
  complexityLevel: ComplexityLevel
}

// ============================================================================
// ENHANCED DETECTION RESULT
// ============================================================================

/**
 * Legacy detection types for backward compatibility
 */
export interface LegacyDetectedTypes {
  math: boolean
  code: boolean
  logic: boolean
  analysis: boolean
  currentEvents: boolean
}

/**
 * Enhanced detection result with domain awareness
 * Extends the original ReasoningDetectionResult with domain-specific fields
 */
export interface EnhancedDetectionResult {
  // ---- Core Reasoning (Original) ----
  /** Whether extended reasoning/thinking is needed */
  needsReasoning: boolean
  /** Whether web search should be triggered */
  needsWebSearch: boolean
  /** Confidence level of the detection (0-1) */
  confidence: number
  /** Brief explanation of the detection rationale */
  reasoning: string
  
  // ---- Domain Classification (NEW) ----
  /** Primary domain of the query */
  domain: Domain
  /** Specific sub-domain if detectable, null otherwise */
  subDomain: string | null
  
  // ---- Information Type (NEW) ----
  /** Type of information the user is seeking */
  informationType: InformationType
  
  // ---- Response Requirements (NEW) ----
  /** Specific requirements for the response format */
  responseRequirements: ResponseRequirements
  
  // ---- Query Context (NEW) ----
  /** Contextual information about the query */
  queryContext: QueryContext
  
  // ---- Legacy Compatibility ----
  /** Original detection types for backward compatibility */
  detectedTypes: LegacyDetectedTypes
}

// ============================================================================
// DISCLAIMER TYPES
// ============================================================================

/**
 * Types of disclaimers that can be injected
 */
export type DisclaimerType = 
  | 'medical'     // Healthcare advice disclaimer
  | 'legal'       // Legal advice disclaimer
  | 'financial'   // Financial/investment advice disclaimer
  | 'emergency'   // Emergency/urgent situation disclaimer
  | 'professional' // General professional advice disclaimer

/**
 * Domains that require specific disclaimers
 */
export const DOMAIN_DISCLAIMERS: Partial<Record<Domain, DisclaimerType[]>> = {
  medicine: ['medical', 'professional'],
  law: ['legal', 'professional'],
  business: ['financial', 'professional'],
}

/**
 * Disclaimer text templates
 */
export const DISCLAIMER_TEMPLATES: Record<DisclaimerType, string> = {
  medical: `⚠️ **Medical Disclaimer**: This information is for educational purposes only and should not replace professional medical advice. Please consult a qualified healthcare provider for personalized medical guidance.`,
  
  legal: `⚠️ **Legal Disclaimer**: This information is for educational purposes only and does not constitute legal advice. Laws vary by jurisdiction. Please consult a qualified attorney for legal matters.`,
  
  financial: `⚠️ **Financial Disclaimer**: This is not financial advice. Investment decisions involve risk, and past performance does not guarantee future results. Please consult a qualified financial advisor.`,
  
  emergency: `🚨 **Emergency Notice**: If this is a medical emergency, please call emergency services immediately (911 in US, 999 in UK, 112 in EU).`,
  
  professional: `ℹ️ **Note**: For specific situations, please consult a qualified professional in this field.`
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get default detection result for fallback scenarios
 */
export function getDefaultDetectionResult(): EnhancedDetectionResult {
  return {
    needsReasoning: false,
    needsWebSearch: false,
    confidence: 0.5,
    reasoning: 'Default detection - no specific classification',
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
      needsCode: false,
    },
    queryContext: {
      isUrgent: false,
      isAcademic: false,
      isProfessional: false,
      complexityLevel: 'basic',
    },
    detectedTypes: {
      math: false,
      code: false,
      logic: false,
      analysis: false,
      currentEvents: false,
    }
  }
}

/**
 * Check if a domain requires a specific disclaimer
 */
export function getRequiredDisclaimers(domain: Domain): DisclaimerType[] {
  return DOMAIN_DISCLAIMERS[domain] || []
}

/**
 * Get disclaimer text for a domain
 */
export function getDisclaimerText(domain: Domain): string {
  const types = getRequiredDisclaimers(domain)
  if (types.length === 0) return ''
  
  return types
    .map(type => DISCLAIMER_TEMPLATES[type])
    .join('\n\n')
}

// ============================================================================
// ADAPTIVE SURFACES - Version Switcher Model
// ============================================================================

/**
 * Surface types - alternative views of AI responses
 */
export type SurfaceType = 
  | 'chat'         // 💬 Default conversational response
  | 'guide'        // ✅ Step-by-step instructions
  | 'research'     // 🔬 Evidence cards, citations



/**
 * Metadata for Guide surface (sequential checklist)
 */
export interface GuideMetadata {
  type: 'guide'
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number // minutes
  
  // Checkpoints generated upfront with substeps
  checkpoints: {
    id: string
    title: string              // Action verb: "Set up...", "Configure..."
    description: string        // 1-2 sentence summary
    substeps: string[]         // Visible upfront (compact, 3-5 items)
    estimatedTime: number
    status: 'locked' | 'current' | 'completed'
  }[]
}

/**
 * Metadata for default chat surface
 */
export interface ChatMetadata {
  type: 'chat'
}

/**
 * Research vertical - a research angle explored
 */
export interface ResearchVertical {
  id: string
  name: string                    // e.g., "Historical Context"
  description: string
  searchQueries: string[]
  status: 'pending' | 'searching' | 'completed' | 'error'
  sourcesCount: number
}

/**
 * Research section with generation status
 */
export interface ResearchSection {
  id: string
  heading: string
  verticalId: string              // Links to which vertical this came from
  content: string                 // Markdown content
  wordCount: number
  citations: string[]             // [1], [2] refs in this section
  status: 'pending' | 'generating' | 'completed'
  // Per-section sources from vertical web search
  sectionCitations?: Array<{ url: string; title: string; snippet?: string }>
  sectionImages?: Array<{ url: string; sourceUrl: string; sourceTitle: string }>
}

/**
 * Research citation with full metadata
 */
export interface ResearchCitation {
  id: string                      // [1], [2] etc.
  url: string
  title: string
  author?: string
  date?: string
  snippet: string
  sourceType: 'web' | 'academic' | 'news' | 'official'
}

/**
 * Metadata for Research surface (deep comprehensive research)
 */
export interface ResearchMetadata {
  type: 'research'
  title: string
  query: string                   // Original user query
  abstract: string                // 200-300 word executive summary
  keyFindings: string[]           // 5-7 bullet points
  methodology: string             // How research was conducted
  limitations: string[]           // Known gaps
  generatedAt: number
  
  // Research structure
  verticals: ResearchVertical[]
  sections: ResearchSection[]
  
  // Citations
  allCitations: ResearchCitation[]
  
  // Images
  heroImages: Array<{
    url: string
    title: string
    sourceUrl: string
  }>
  
  // Stats
  totalSources: number
  totalWordCount: number
  estimatedReadTime: number       // minutes
}

// ============================================================================
// COURSE SURFACE - EDUCATION MACHINE
// ============================================================================

/**
 * Union type for all surface metadata
 */
export type SurfaceMetadata = 
  | GuideMetadata 
  | ResearchMetadata
  | ChatMetadata

/**
 * State for a specific surface version
 */
export interface SurfaceState {
  surfaceType: SurfaceType
  metadata: SurfaceMetadata
  createdAt: number
  updatedAt: number

  guide?: {
    currentCheckpoint: number          // Index of current checkpoint
    completedCheckpoints: number[]     // Completed checkpoint indices
    checkpointContent: Record<number, string>  // Generated "Learn more" content
  }

  // Research-specific state
  research?: {
    expandedSections: string[]      // IDs of expanded sections
    bookmarkedSections: string[]    // IDs of bookmarked sections
    generationProgress?: {
      phase: 'analyzing' | 'verticals' | 'searching' | 'skeleton' | 'sections' | 'synthesis' | 'complete'
      currentVertical?: number
      totalVerticals?: number
      currentSection?: number
      totalSections?: number
      sourcesFound?: number
      message: string
    }
  }

  // Available images from web search (for hero display and inline embedding)
  availableImages?: Array<{
    url: string
    title: string
    sourceUrl?: string
    sourceTitle?: string
  }>
  // Progressive section generation tracking
  sectionProgress?: {
    totalSections: number
    completedSections: number
    readySections: Array<{
      sectionId: string
      content: string
      order: number
    }>
    isStreaming: boolean  // True while sections are being generated
  }
  // Web source citations (from Exa, Perplexity, etc.)
  citations?: Array<{
    url: string
    title: string
    snippet?: string
    image?: string
    favicon?: string
    source?: 'exa' | 'perplexity' | 'wikipedia'
  }>
  // Flag indicating this is a skeleton (incomplete content)
  isSkeleton?: boolean
}

/**
 * Surface state stored per message - multiple versions can coexist
 */
export interface MessageSurfaceState {
  // Available versions for this message
  versions: {
    chat: { content: string; generated: true }
    guide?: { generated: boolean; state: SurfaceState }
  }
  // Currently displayed version
  activeVersion: SurfaceType
  // Version currently being generated (null if none)
  generatingVersion: SurfaceType | null
}

// ============================================================================
// ACADEMIC SOURCES
// ============================================================================

export interface AcademicCitation {
  id: string
  source: 'semantic_scholar' | 'crossref' | 'open_library' | 'wikidata' | 'wikipedia' | 'pubmed' | 'google_books' | 'hathi_trust' | 'exa'
  title: string
  authors?: string[]
  year?: number
  doi?: string
  url?: string
  abstract?: string
  snippet?: string
  citationCount?: number
  relevanceScore?: number
}

