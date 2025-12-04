/**
 * Perplexity API - Real-time conversational search with citations
 * Best for: Live user queries, current events, cited responses
 */

export interface PerplexitySearchOptions {
  query: string
  model?: 'llama-3.1-sonar-small-128k-online' | 'llama-3.1-sonar-large-128k-online' | 'llama-3.1-sonar-huge-128k-online'
  maxTokens?: number
  temperature?: number
  returnCitations?: boolean
  searchDomainFilter?: string[]
  searchRecencyFilter?: 'day' | 'week' | 'month' | 'year'
}

export interface PerplexityCitation {
  url: string
  title?: string
  snippet?: string
}

export interface PerplexitySearchResponse {
  content: string
  citations: PerplexityCitation[]
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Search and generate response using Perplexity's online models
 */
export async function searchWithPerplexity(options: PerplexitySearchOptions): Promise<PerplexitySearchResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  
  if (!apiKey) {
    console.warn('[perplexity-search] No API key found, returning fallback response')
    return {
      content: 'Perplexity API key not configured.',
      citations: [],
      model: 'none'
    }
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'sonar',
        messages: [
          {
            role: 'user',
            content: options.query
          }
        ],
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature ?? 0.2,
        return_citations: options.returnCitations ?? true,
        search_domain_filter: options.searchDomainFilter,
        search_recency_filter: options.searchRecencyFilter
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[perplexity-search] API error:', error)
      throw new Error(`Perplexity API error: ${response.status}`)
    }

    const data :any= await response.json()
    
    // Extract content and citations
    const content = data.choices?.[0]?.message?.content || ''
    const citations = data.citations || []
    
    return {
      content,
      citations: citations.map((url: string, index: number) => ({
        url,
        title: `Source ${index + 1}`,
        snippet: ''
      })),
      model: data.model || options.model || 'unknown',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    }
  } catch (error) {
    console.error('[perplexity-search] Search failed:', error)
    return {
      content: 'Failed to fetch results from Perplexity.',
      citations: [],
      model: 'error'
    }
  }
}

/**
 * Stream search results from Perplexity (for real-time display)
 */
export async function* streamSearchWithPerplexity(options: PerplexitySearchOptions): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  
  if (!apiKey) {
    yield 'Perplexity API key not configured.'
    return
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: options.query
          }
        ],
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature ?? 0.2,
        stream: true,
        return_citations: options.returnCitations ?? true
      })
    })

    if (!response.ok || !response.body) {
      throw new Error(`Perplexity streaming error: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim())

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              yield content
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    console.error('[perplexity-search] Streaming failed:', error)
    yield 'Failed to stream results from Perplexity.'
  }
}
