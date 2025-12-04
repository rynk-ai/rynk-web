/**
 * Wikipedia API - Structured knowledge base
 * Best for: Basic facts, biographies, historical data (free, no API key required)
 */

export interface WikipediaSearchOptions {
  query: string
  limit?: number
  language?: string
}

export interface WikipediaPage {
  pageid: number
  title: string
  extract: string
  url: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
}

export interface WikipediaSearchResponse {
  results: WikipediaPage[]
}

/**
 * Search Wikipedia for articles
 */
export async function searchWikipedia(options: WikipediaSearchOptions): Promise<WikipediaSearchResponse> {
  const { query, limit = 5, language = 'en' } = options

  try {
    // First, search for relevant pages
    const searchUrl = new URL(`https://${language}.wikipedia.org/w/api.php`)
    searchUrl.searchParams.set('action', 'query')
    searchUrl.searchParams.set('list', 'search')
    searchUrl.searchParams.set('srsearch', query)
    searchUrl.searchParams.set('srlimit', limit.toString())
    searchUrl.searchParams.set('format', 'json')
    searchUrl.searchParams.set('origin', '*')

    const searchResponse = await fetch(searchUrl.toString())
    if (!searchResponse.ok) {
      throw new Error(`Wikipedia search error: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    const searchResults = searchData.query?.search || []

    if (searchResults.length === 0) {
      return { results: [] }
    }

    // Get page IDs
    const pageIds = searchResults.map((result: any) => result.pageid).join('|')

    // Fetch full content for these pages
    const contentUrl = new URL(`https://${language}.wikipedia.org/w/api.php`)
    contentUrl.searchParams.set('action', 'query')
    contentUrl.searchParams.set('pageids', pageIds)
    contentUrl.searchParams.set('prop', 'extracts|pageimages|info')
    contentUrl.searchParams.set('exintro', 'true')
    contentUrl.searchParams.set('explaintext', 'true')
    contentUrl.searchParams.set('exsentences', '3')
    contentUrl.searchParams.set('piprop', 'thumbnail')
    contentUrl.searchParams.set('pithumbsize', '300')
    contentUrl.searchParams.set('inprop', 'url')
    contentUrl.searchParams.set('format', 'json')
    contentUrl.searchParams.set('origin', '*')

    const contentResponse = await fetch(contentUrl.toString())
    if (!contentResponse.ok) {
      throw new Error(`Wikipedia content error: ${contentResponse.status}`)
    }

    const contentData = await contentResponse.json()
    const pages = contentData.query?.pages || {}

    // Transform into standardized format
    const results: WikipediaPage[] = Object.values(pages).map((page: any) => ({
      pageid: page.pageid,
      title: page.title,
      extract: page.extract || '',
      url: page.fullurl || `https://${language}.wikipedia.org/?curid=${page.pageid}`,
      thumbnail: page.thumbnail ? {
        source: page.thumbnail.source,
        width: page.thumbnail.width,
        height: page.thumbnail.height
      } : undefined
    }))

    return { results }
  } catch (error) {
    console.error('[wikipedia-search] Search failed:', error)
    return { results: [] }
  }
}

/**
 * Get a specific Wikipedia page by title
 */
export async function getWikipediaPage(title: string, language: string = 'en'): Promise<WikipediaPage | null> {
  try {
    const url = new URL(`https://${language}.wikipedia.org/w/api.php`)
    url.searchParams.set('action', 'query')
    url.searchParams.set('titles', title)
    url.searchParams.set('prop', 'extracts|pageimages|info')
    url.searchParams.set('exintro', 'true')
    url.searchParams.set('explaintext', 'true')
    url.searchParams.set('piprop', 'thumbnail')
    url.searchParams.set('pithumbsize', '300')
    url.searchParams.set('inprop', 'url')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Wikipedia page error: ${response.status}`)
    }

    const data = await response.json()
    const pages = data.query?.pages || {}
    const page = Object.values(pages)[0] as any

    if (!page || page.missing) {
      return null
    }

    return {
      pageid: page.pageid,
      title: page.title,
      extract: page.extract || '',
      url: page.fullurl || `https://${language}.wikipedia.org/?curid=${page.pageid}`,
      thumbnail: page.thumbnail ? {
        source: page.thumbnail.source,
        width: page.thumbnail.width,
        height: page.thumbnail.height
      } : undefined
    }
  } catch (error) {
    console.error('[wikipedia-search] Get page failed:', error)
    return null
  }
}
