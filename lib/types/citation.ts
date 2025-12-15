// Citation types for structured AI responses

export interface Citation {
  id: number
  url: string
  title: string
  snippet: string
  source: 'exa' | 'perplexity' | 'wikipedia' | 'grok'
  favicon?: string
  author?: string
  publishedDate?: string
  relevanceScore?: number
  image?: string        // Primary image URL
  images?: string[]     // Additional images
}

export interface SearchResultsWithCitations {
  query: string
  sources: Citation[]
  strategy: string[]
  totalResults: number
  synthesizedResponse?: string
}

export type ResponseType = 
  | 'quick_answer'       // "What's the capital of France?"
  | 'comparison'         // "Compare X and Y"
  | 'explanation'        // "How does X work?"
  | 'current_events'     // "Latest news about..."
  | 'deep_research'      // "Analyze the impact of..."
  | 'list_items'         // "Top 10 best..."
  | 'step_by_step'       // "How to..."
  | 'definition'         // "What is X?"
  | 'conversational'     // General chat

export interface StructuredResponseMetadata {
  statusPills?: Array<{
    status: 'analyzing' | 'searching' | 'synthesizing' | 'complete'
    message: string
    timestamp: number
  }>
  searchResults?: SearchResultsWithCitations
  citations?: Citation[]
  responseType?: ResponseType
  modelUsed?: string
}

/**
 * Get favicon URL for a domain using Google's favicon service
 */
export function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return ''
  }
}

/**
 * Extract domain name from URL for display
 */
export function getDomainName(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain
  } catch {
    return 'Source'
  }
}

/**
 * Format citations from search results into structured format
 */
export function formatCitationsFromSearchResults(
  searchResults: any
): Citation[] {
  if (!searchResults?.sources) return []
  
  return searchResults.sources.map((source: any, index: number) => ({
    id: index + 1,
    url: source.url,
    title: source.title || 'Untitled',
    snippet: source.snippet || source.text?.slice(0, 200) || '',
    source: source.type || 'exa',
    favicon: getFaviconUrl(source.url),
    author: source.author,
    publishedDate: source.publishedDate,
    relevanceScore: source.score,
    image: source.image,           // Primary image from source
    images: source.images || []    // Additional images
  }))
}
