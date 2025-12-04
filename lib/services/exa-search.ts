import Groq from 'groq-sdk'

/**
 * Exa API - Neural semantic search optimized for AI applications
 * Best for: Deep research, knowledge base building, semantic queries
 */

export interface ExaSearchOptions {
  query: string
  numResults?: number
  type?: 'neural' | 'keyword'
  useAutoprompt?: boolean
  category?: 'company' | 'research paper' | 'news' | 'github' | 'tweet' | 'movie' | 'song' | 'personal site' | 'pdf'
  startPublishedDate?: string // ISO 8601 format
  endPublishedDate?: string
  includeDomains?: string[]
  excludeDomains?: string[]
  includeText?: boolean
  includeHighlights?: boolean
  highlightsPerUrl?: number
}

export interface ExaResult {
  url: string
  title: string
  publishedDate: string
  author?: string
  score: number
  text?: string
  highlights?: string[]
  highlightScores?: number[]
}

export interface ExaSearchResponse {
  results: ExaResult[]
  autopromptString?: string
}

/**
 * Search the web using Exa's neural semantic search
 */
export async function searchWithExa(options: ExaSearchOptions): Promise<ExaSearchResponse> {
  const apiKey = process.env.EXA_API_KEY
  
  if (!apiKey) {
    console.warn('[exa-search] No API key found, returning empty results')
    return { results: [] }
  }

  try {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: options.query,
        num_results: options.numResults || 10,
        type: options.type || 'neural',
        use_autoprompt: options.useAutoprompt ?? true,
        category: options.category,
        start_published_date: options.startPublishedDate,
        end_published_date: options.endPublishedDate,
        include_domains: options.includeDomains,
        exclude_domains: options.excludeDomains,
        contents: {
          text: options.includeText ?? true,
          highlights: options.includeHighlights ?? true,
          highlightsPerUrl: options.highlightsPerUrl || 3
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[exa-search] API error:', error)
      throw new Error(`Exa API error: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      results: data.results || [],
      autopromptString: data.autoprompt_string
    }
  } catch (error) {
    console.error('[exa-search] Search failed:', error)
    return { results: [] }
  }
}

/**
 * Get similar content to a URL using Exa
 */
export async function findSimilarWithExa(url: string, numResults: number = 5): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY
  
  if (!apiKey) {
    console.warn('[exa-search] No API key found, returning empty results')
    return []
  }

  try {
    const response = await fetch('https://api.exa.ai/findSimilar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        num_results: numResults,
        contents: {
          text: true,
          highlights: true
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Exa findSimilar error: ${response.status}`)
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('[exa-search] findSimilar failed:', error)
    return []
  }
}
