/**
 * Academic Sources Service
 * 
 * Multi-source academic search orchestration for the Education Machine.
 * Searches across Semantic Scholar, Crossref, Open Library, Wikidata, and Exa.
 */

import type { AcademicCitation } from './domain-types'

// ============================================================================
// TYPES
// ============================================================================

export interface AcademicSearchOptions {
  maxResults?: number           // Per source, default 5
  yearRange?: [number, number]  // [startYear, endYear]
  includeAbstracts?: boolean    // Include full abstracts
  timeout?: number              // Per-source timeout in ms
}

export interface SearchContext {
  topic: string
  subtopics?: string[]
  depth?: 'overview' | 'detailed' | 'comprehensive'
}

// ============================================================================
// RETRY HELPER: Exponential backoff for rate-limited APIs
// ============================================================================

interface FetchWithRetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  timeoutMs?: number
  headers?: Record<string, string>
}

async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response | null> {
  const { maxRetries = 2, initialDelayMs = 500, timeoutMs = 5000, headers = {} } = options
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers
      })
      
      clearTimeout(timeoutId)
      
      // Success
      if (response.ok) {
        return response
      }
      
      // Rate limited - retry with backoff
      if (response.status === 429 && attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt)
        console.log(`[Retry] Rate limited, waiting ${delay}ms before retry ${attempt + 1}`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // Other error - don't retry
      console.warn(`[Fetch] API error: ${response.status}`)
      return null
      
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt)
        console.log(`[Retry] Network error, waiting ${delay}ms before retry ${attempt + 1}`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      console.error('[Fetch] All retries failed:', error)
      return null
    }
  }
  
  return null
}

// ============================================================================
// SEMANTIC SCHOLAR (Free API - no key required)
// https://api.semanticscholar.org/
// ============================================================================

interface SemanticScholarPaper {
  paperId: string
  title: string
  abstract?: string
  year?: number
  authors?: { name: string }[]
  citationCount?: number
  url?: string
  doi?: string
  fieldsOfStudy?: string[]
}

async function searchSemanticScholar(
  query: string,
  options: AcademicSearchOptions = {}
): Promise<AcademicCitation[]> {
  const { maxResults = 5, timeout = 5000 } = options
  
  try {
    const params = new URLSearchParams({
      query,
      limit: String(maxResults),
      fields: 'paperId,title,abstract,year,authors,citationCount,url,doi,fieldsOfStudy'
    })
    
    const response = await fetchWithRetry(
      `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
      { timeoutMs: timeout, maxRetries: 2 }
    )
    
    if (!response) return []
    
    const data = await response.json() as { data?: SemanticScholarPaper[] }
    
    return (data.data || []).map((paper, idx): AcademicCitation => ({
      id: `ss-${paper.paperId || idx}`,
      source: 'semantic_scholar',
      title: paper.title,
      authors: paper.authors?.map(a => a.name),
      year: paper.year,
      doi: paper.doi,
      url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      abstract: paper.abstract,
      citationCount: paper.citationCount,
      relevanceScore: 1 - (idx * 0.1)
    }))
  } catch (error) {
    console.error('[SemanticScholar] Search failed:', error)
    return []
  }
}

// ============================================================================
// CROSSREF (Free API - no key required, but rate-limited)
// https://api.crossref.org/
// ============================================================================

interface CrossrefWork {
  DOI: string
  title?: string[]
  abstract?: string
  author?: { given?: string; family?: string }[]
  'published-print'?: { 'date-parts'?: number[][] }
  'published-online'?: { 'date-parts'?: number[][] }
  URL?: string
  'is-referenced-by-count'?: number
  type?: string
}

async function searchCrossref(
  query: string,
  options: AcademicSearchOptions = {}
): Promise<AcademicCitation[]> {
  const { maxResults = 5, timeout = 5000 } = options
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const params = new URLSearchParams({
      query,
      rows: String(maxResults),
      select: 'DOI,title,abstract,author,published-print,published-online,URL,is-referenced-by-count,type'
    })
    
    const response = await fetch(
      `https://api.crossref.org/works?${params}`,
      { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'EducationMachine/1.0 (mailto:contact@rynk.io)'
        }
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.warn('[Crossref] API error:', response.status)
      return []
    }
    
    const data = await response.json() as { message?: { items?: CrossrefWork[] } }
    
    return (data.message?.items || []).map((work, idx): AcademicCitation => {
      const year = work['published-print']?.['date-parts']?.[0]?.[0] ||
                   work['published-online']?.['date-parts']?.[0]?.[0]
      
      return {
        id: `cr-${work.DOI || idx}`,
        source: 'crossref',
        title: work.title?.[0] || 'Untitled',
        authors: work.author?.map(a => `${a.given || ''} ${a.family || ''}`.trim()),
        year,
        doi: work.DOI,
        url: work.URL || `https://doi.org/${work.DOI}`,
        abstract: work.abstract,
        citationCount: work['is-referenced-by-count'],
        relevanceScore: 1 - (idx * 0.1)
      }
    })
  } catch (error) {
    console.error('[Crossref] Search failed:', error)
    return []
  }
}

// ============================================================================
// OPEN LIBRARY (Free API - no key required)
// https://openlibrary.org/dev/docs/api/search
// ============================================================================

interface OpenLibraryDoc {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  subject?: string[]
  cover_i?: number
  edition_count?: number
}

async function searchOpenLibrary(
  query: string,
  options: AcademicSearchOptions = {}
): Promise<AcademicCitation[]> {
  const { maxResults = 5, timeout = 5000 } = options
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const params = new URLSearchParams({
      q: query,
      limit: String(maxResults),
      fields: 'key,title,author_name,first_publish_year,subject,cover_i,edition_count'
    })
    
    const response = await fetch(
      `https://openlibrary.org/search.json?${params}`,
      { signal: controller.signal }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.warn('[OpenLibrary] API error:', response.status)
      return []
    }
    
    const data = await response.json() as { docs?: OpenLibraryDoc[] }
    
    return (data.docs || []).map((doc, idx): AcademicCitation => ({
      id: `ol-${doc.key.replace('/works/', '')}`,
      source: 'open_library',
      title: doc.title,
      authors: doc.author_name,
      year: doc.first_publish_year,
      url: `https://openlibrary.org${doc.key}`,
      snippet: doc.subject?.slice(0, 5).join(', '),
      relevanceScore: 1 - (idx * 0.1)
    }))
  } catch (error) {
    console.error('[OpenLibrary] Search failed:', error)
    return []
  }
}

// ============================================================================
// WIKIDATA (Free API - no key required)
// https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service
// ============================================================================

async function searchWikidata(
  query: string,
  options: AcademicSearchOptions = {}
): Promise<AcademicCitation[]> {
  const { maxResults = 5, timeout = 5000 } = options
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    // Use Wikidata's search API instead of SPARQL for simplicity
    const params = new URLSearchParams({
      action: 'wbsearchentities',
      search: query,
      language: 'en',
      format: 'json',
      limit: String(maxResults),
      origin: '*'
    })
    
    const response = await fetch(
      `https://www.wikidata.org/w/api.php?${params}`,
      { signal: controller.signal }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.warn('[Wikidata] API error:', response.status)
      return []
    }
    
    const data = await response.json() as { 
      search?: { id: string; label: string; description?: string; url?: string }[] 
    }
    
    return (data.search || []).map((entity, idx): AcademicCitation => ({
      id: `wd-${entity.id}`,
      source: 'wikidata',
      title: entity.label,
      url: entity.url || `https://www.wikidata.org/wiki/${entity.id}`,
      snippet: entity.description,
      relevanceScore: 1 - (idx * 0.1)
    }))
  } catch (error) {
    console.error('[Wikidata] Search failed:', error)
    return []
  }
}

// ============================================================================
// WIKIPEDIA (Free API - no key required)
// For quick context and definitions
// ============================================================================

interface WikipediaSearchResult {
  title: string
  pageid: number
  snippet: string
}

async function searchWikipedia(
  query: string,
  options: AcademicSearchOptions = {}
): Promise<AcademicCitation[]> {
  const { maxResults = 3, timeout = 5000 } = options
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: String(maxResults),
      format: 'json',
      origin: '*'
    })
    
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?${params}`,
      { signal: controller.signal }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.warn('[Wikipedia] API error:', response.status)
      return []
    }
    
    const data = await response.json() as { query?: { search?: WikipediaSearchResult[] } }
    
    return (data.query?.search || []).map((result, idx): AcademicCitation => ({
      id: `wp-${result.pageid}`,
      source: 'wikipedia',
      title: result.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`,
      snippet: result.snippet.replace(/<[^>]*>/g, ''), // Strip HTML
      relevanceScore: 1 - (idx * 0.1)
    }))
  } catch (error) {
    console.error('[Wikipedia] Search failed:', error)
    return []
  }
}

// ============================================================================
// ORCHESTRATOR: Search All Sources in Parallel
// ============================================================================

export interface AcademicSearchResult {
  citations: AcademicCitation[]
  sourceStats: {
    source: string
    count: number
    success: boolean
  }[]
  totalResults: number
  searchTime: number
}

export async function searchAcademicSources(
  query: string,
  options: AcademicSearchOptions = {}
): Promise<AcademicSearchResult> {
  const startTime = Date.now()
  
  // Search all sources in parallel
  const [semanticScholar, crossref, openLibrary, wikidata, wikipedia] = await Promise.all([
    searchSemanticScholar(query, options),
    searchCrossref(query, options),
    searchOpenLibrary(query, options),
    searchWikidata(query, options),
    searchWikipedia(query, options)
  ])
  
  // Combine and deduplicate results
  const allCitations = [
    ...semanticScholar,
    ...crossref,
    ...openLibrary,
    ...wikidata,
    ...wikipedia
  ]
  
  // Deduplicate by DOI or title similarity
  const seen = new Set<string>()
  const dedupedCitations = allCitations.filter(c => {
    const key = c.doi || c.title.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  
  // Sort by citation count (if available) then relevance
  dedupedCitations.sort((a, b) => {
    // Prioritize sources with citation counts
    if (a.citationCount && b.citationCount) {
      return b.citationCount - a.citationCount
    }
    if (a.citationCount) return -1
    if (b.citationCount) return 1
    return (b.relevanceScore || 0) - (a.relevanceScore || 0)
  })
  
  return {
    citations: dedupedCitations,
    sourceStats: [
      { source: 'semantic_scholar', count: semanticScholar.length, success: semanticScholar.length > 0 },
      { source: 'crossref', count: crossref.length, success: crossref.length > 0 },
      { source: 'open_library', count: openLibrary.length, success: openLibrary.length > 0 },
      { source: 'wikidata', count: wikidata.length, success: wikidata.length > 0 },
      { source: 'wikipedia', count: wikipedia.length, success: wikipedia.length > 0 }
    ],
    totalResults: dedupedCitations.length,
    searchTime: Date.now() - startTime
  }
}

// ============================================================================
// TOPIC-AWARE SEARCH
// Generates multiple search queries for comprehensive coverage
// ============================================================================

export async function searchForCourseContext(
  context: SearchContext,
  options: AcademicSearchOptions = {}
): Promise<AcademicSearchResult> {
  const queries = [context.topic]
  
  // Add subtopic queries
  if (context.subtopics?.length) {
    queries.push(...context.subtopics.slice(0, 3))
  }
  
  // Add depth-specific queries
  if (context.depth === 'comprehensive') {
    queries.push(`${context.topic} foundations`)
    queries.push(`${context.topic} advanced concepts`)
  }
  
  // Search each query and merge results
  const results = await Promise.all(
    queries.map(q => searchAcademicSources(q, { ...options, maxResults: 3 }))
  )
  
  // Merge all citations
  const allCitations = results.flatMap(r => r.citations)
  
  // Deduplicate
  const seen = new Set<string>()
  const dedupedCitations = allCitations.filter(c => {
    const key = c.doi || c.title.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  
  // Aggregate stats
  const sourceStats = [
    'semantic_scholar', 'crossref', 'open_library', 'wikidata', 'wikipedia'
  ].map(source => ({
    source,
    count: dedupedCitations.filter(c => c.source === source).length,
    success: dedupedCitations.some(c => c.source === source)
  }))
  
  return {
    citations: dedupedCitations,
    sourceStats,
    totalResults: dedupedCitations.length,
    searchTime: results.reduce((sum, r) => sum + r.searchTime, 0)
  }
}

// ============================================================================
// HELPER: Format citations for display
// ============================================================================

export function formatCitationForDisplay(citation: AcademicCitation): string {
  const parts = []
  
  if (citation.authors?.length) {
    const authorStr = citation.authors.length > 2
      ? `${citation.authors[0]} et al.`
      : citation.authors.join(' & ')
    parts.push(authorStr)
  }
  
  if (citation.year) {
    parts.push(`(${citation.year})`)
  }
  
  parts.push(`"${citation.title}"`)
  
  if (citation.doi) {
    parts.push(`DOI: ${citation.doi}`)
  }
  
  return parts.join(' ')
}

export function getSourceDisplayName(source: AcademicCitation['source']): string {
  const names: Record<string, string> = {
    semantic_scholar: 'Semantic Scholar',
    crossref: 'Crossref',
    pubmed: 'PubMed',
    google_books: 'Google Books',
    open_library: 'Open Library',
    hathi_trust: 'HathiTrust',
    wikidata: 'Wikidata',
    exa: 'Exa',
    wikipedia: 'Wikipedia'
  }
  return names[source] || source
}
