import { searchWithExa, type ExaResult } from './exa-search'
import { searchWithPerplexity, type PerplexitySearchResponse } from './perplexity-search'
import { searchWikipedia, type WikipediaPage } from './wikipedia-search'

/**
 * Search Orchestrator - Intelligently selects and combines multiple search APIs
 * based on query type and requirements
 */

export interface SearchSource {
  type: 'exa' | 'perplexity' | 'wikipedia'
  url: string
  title: string
  snippet: string
  score?: number
  publishedDate?: string
  author?: string
  highlights?: string[]
  thumbnail?: string
}

export interface OrchestatedSearchResult {
  query: string
  sources: SearchSource[]
  synthesizedResponse?: string // From Perplexity
  searchStrategy: string[] // Which APIs were used
  totalResults: number
}

export type QueryType = 'factual' | 'current-events' | 'research' | 'general' | 'semantic'

/**
 * Classify query to determine best search strategy
 * Priority order: factual > research > semantic > current-events > general
 */
export function classifyQuery(query: string): QueryType {
  const lowerQuery = query.toLowerCase()
  
  // Factual/biographical keywords (highest priority - Wikipedia is great for this)
  const factualKeywords = ['who is', 'what is', 'when was', 'where is', 'biography', 'define', 'definition of']
  if (factualKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'factual'
  }
  
  // Research keywords (academic/deep analysis)
  const researchKeywords = ['research', 'study', 'analysis', 'compare', 'evaluate', 'investigate', 'paper', 'academic', 'theory', 'philosophy', 'concept of']
  if (researchKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'research'
  }
  
  // Semantic/conceptual keywords (ideas, explanations, understanding)
  const semanticKeywords = ['explain', 'how does', 'why', 'understand', 'similar to', 'difference between', 'idea', 'ideology', 'philosophy', 'ism']
  if (semanticKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'semantic'
  }
  
  // Current events keywords (time-sensitive, news)
  const currentEventsKeywords = ['latest', 'recent', 'today', 'this week', 'yesterday', '2024', '2025', 'news', 'breaking', 'now', 'update', 'currently']
  if (currentEventsKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'current-events'
  }
  
  return 'general'
}

/**
 * Orchestrate search across multiple APIs based on query type
 */
export async function orchestrateSearch(query: string, queryType?: QueryType): Promise<OrchestatedSearchResult> {
  const type = queryType || classifyQuery(query)
  const searchStrategy: string[] = []
  let allSources: SearchSource[] = []
  let synthesizedResponse: string | undefined

  console.log(`[search-orchestrator] Query type: ${type}`)

  try {
    switch (type) {
      case 'current-events':
        // Use Perplexity for real-time synthesis + Exa for deep sources
        searchStrategy.push('perplexity', 'exa')
        
        const [perplexityResult, exaResult] = await Promise.all([
          searchWithPerplexity({ 
            query,
            searchRecencyFilter: 'week',
            returnCitations: true
          }),
          searchWithExa({ 
            query,
            numResults: 5,
            type: 'neural',
            startPublishedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
        ])
        
        synthesizedResponse = perplexityResult.content
        
        // Combine sources from both
        allSources = [
          ...perplexityResult.citations.map(c => ({
            type: 'perplexity' as const,
            url: c.url,
            title: c.title || 'Source',
            snippet: c.snippet || ''
          })),
          ...exaResult.results.map(r => ({
            type: 'exa' as const,
            url: r.url,
            title: r.title,
            snippet: r.highlights?.[0] || r.text?.slice(0, 200) || '',
            score: r.score,
            publishedDate: r.publishedDate,
            author: r.author,
            highlights: r.highlights
          }))
        ]
        break

      case 'factual':
        // Use Wikipedia first, then supplement with Exa if needed
        searchStrategy.push('wikipedia', 'exa')
        
        const [wikiResult, exaFactualResult] = await Promise.all([
          searchWikipedia({ query, limit: 3 }),
          searchWithExa({ query, numResults: 5, type: 'neural' })
        ])
        
        allSources = [
          ...wikiResult.results.map(w => ({
            type: 'wikipedia' as const,
            url: w.url,
            title: w.title,
            snippet: w.extract,
            thumbnail: w.thumbnail?.source
          })),
          ...exaFactualResult.results.map(r => ({
            type: 'exa' as const,
            url: r.url,
            title: r.title,
            snippet: r.highlights?.[0] || r.text?.slice(0, 200) || '',
            score: r.score,
            highlights: r.highlights
          }))
        ]
        break

      case 'research':
        // Use Exa for deep semantic research + Wikipedia for background
        searchStrategy.push('exa', 'wikipedia')
        
        const [exaResearchResult, wikiResearchResult] = await Promise.all([
          searchWithExa({ 
            query,
            numResults: 10,
            type: 'neural',
            category: 'research paper',
            includeText: true,
            includeHighlights: true
          }),
          searchWikipedia({ query, limit: 2 })
        ])
        
        allSources = [
          ...exaResearchResult.results.map(r => ({
            type: 'exa' as const,
            url: r.url,
            title: r.title,
            snippet: r.highlights?.[0] || r.text?.slice(0, 200) || '',
            score: r.score,
            publishedDate: r.publishedDate,
            author: r.author,
            highlights: r.highlights
          })),
          ...wikiResearchResult.results.map(w => ({
            type: 'wikipedia' as const,
            url: w.url,
            title: w.title,
            snippet: w.extract.slice(0, 200),
            thumbnail: w.thumbnail?.source
          }))
        ]
        break

      case 'semantic':
        // Use Exa's neural search for conceptual queries
        searchStrategy.push('exa')
        
        const exaSemanticResult = await searchWithExa({ 
          query,
          numResults: 8,
          type: 'neural',
          useAutoprompt: true,
          includeHighlights: true
        })
        
        allSources = exaSemanticResult.results.map(r => ({
          type: 'exa' as const,
          url: r.url,
          title: r.title,
          snippet: r.highlights?.[0] || r.text?.slice(0, 200) || '',
          score: r.score,
          highlights: r.highlights
        }))
        break

      case 'general':
      default:
        // Balanced approach: Perplexity for synthesis + Wikipedia for facts
        searchStrategy.push('perplexity', 'wikipedia')
        
        const [perplexityGeneralResult, wikiGeneralResult] = await Promise.all([
          searchWithPerplexity({ query, returnCitations: true }),
          searchWikipedia({ query, limit: 3 })
        ])
        
        synthesizedResponse = perplexityGeneralResult.content
        
        allSources = [
          ...perplexityGeneralResult.citations.map(c => ({
            type: 'perplexity' as const,
            url: c.url,
            title: c.title || 'Source',
            snippet: c.snippet || ''
          })),
          ...wikiGeneralResult.results.map(w => ({
            type: 'wikipedia' as const,
            url: w.url,
            title: w.title,
            snippet: w.extract.slice(0, 200),
            thumbnail: w.thumbnail?.source
          }))
        ]
        break
    }

    // Deduplicate sources by URL
    const uniqueSources = Array.from(
      new Map(allSources.map(s => [s.url, s])).values()
    )

    return {
      query,
      sources: uniqueSources,
      synthesizedResponse,
      searchStrategy,
      totalResults: uniqueSources.length
    }
  } catch (error) {
    console.error('[search-orchestrator] Search failed:', error)
    return {
      query,
      sources: [],
      searchStrategy,
      totalResults: 0
    }
  }
}

/**
 * Search specifically for knowledge base building (deep research mode)
 */
export async function buildKnowledgeBase(query: string, maxResults: number = 20): Promise<ExaResult[]> {
  const result = await searchWithExa({
    query,
    numResults: maxResults,
    type: 'neural',
    includeText: true,
    includeHighlights: true,
    highlightsPerUrl: 5
  })
  
  return result.results
}
