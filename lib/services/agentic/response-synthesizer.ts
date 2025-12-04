import { SourceResult } from './types'

/**
 * ResponseSynthesizer - Combines results from multiple sources into a coherent response
 */
export class ResponseSynthesizer {
  
  /**
   * Synthesize a comprehensive response from multiple sources
   * Uses Claude Haiku for intelligent synthesis with citations
   */
  async synthesize(
    originalQuery: string,
    sourceResults: SourceResult[],
    history: { role: string; content: string }[] = []
  ): Promise<{
    content: string
    citations: Array<{ url: string; title: string; source: string }>
  }> {
    // Filter out failed sources
    const successfulSources = sourceResults.filter(r => !r.error && r.data)
    
    if (successfulSources.length === 0) {
      throw new Error('All sources failed to provide data')
    }
    
    // Prepare context from all sources
    const context = this.prepareContext(successfulSources)
    
    // Collect all citations
    const allCitations = this.collectCitations(successfulSources)
    
    // Use Claude to synthesize the response
    const synthesizedContent = await this.synthesizeWithClaude(
      originalQuery,
      context,
      allCitations,
      history
    )
    
    return {
      content: synthesizedContent,
      citations: allCitations
    }
  }

  /**
   * Prepare context from all sources for synthesis
   */
  private prepareContext(sources: SourceResult[]): string {
    const contextParts: string[] = []
    
    for (const source of sources) {
      contextParts.push(`\n--- Source: ${source.source.toUpperCase()} ---`)
      
      if (source.source === 'exa' && Array.isArray(source.data)) {
        // Exa returns array of results
        source.data.slice(0, 5).forEach((item: any, i: number) => {
          contextParts.push(`\n[${i+1}] ${item.title}`)
          if (item.highlights && item.highlights.length > 0) {
            contextParts.push(item.highlights[0])
          } else if (item.text) {
            contextParts.push(item.text.substring(0, 500))
          }
        })
      } else if (source.source === 'perplexity' && typeof source.data === 'string') {
        // Perplexity returns a string answer
        contextParts.push(source.data)
      } else if (source.source === 'wikipedia' && Array.isArray(source.data)) {
        // Wikipedia returns array of article summaries
        source.data.forEach((article: any) => {
          contextParts.push(`\n${article.title}`)
          contextParts.push(article.extract || '')
        })
      }
    }
    
    return contextParts.join('\n')
  }
  
  /**
   * Collect all citations from sources
   */
  private collectCitations(sources: SourceResult[]): Array<{ url: string; title: string; source: string }> {
    const citations: Array<{ url: string; title: string; source: string }> = []
    
    for (const source of sources) {
      if (source.citations && source.citations.length > 0) {
        source.citations.forEach(citation => {
          if (citation.url) {
            citations.push({
              url: citation.url,
              title: citation.title || 'Untitled',
              source: source.source
            })
          }
        })
      }
    }
    
    return citations
  }


  /**
   * Use Claude Haiku to synthesize the final response
   */
  private async synthesizeWithClaude(
    originalQuery: string,
    context: string,
    citations: Array<{ url: string; title: string; source: string }>,
    history: { role: string; content: string }[] = []
  ): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured')
    }
    
    // Format recent history (last 5 messages) for context
    const recentHistory = history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')
    const historyContext = recentHistory ? `\nRecent conversation:\n${recentHistory}\n` : ''
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout for synthesis

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://rynk.io',
        'X-Title': 'Rynk'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [{
          role: 'system',
          content: `You are an expert research synthesizer. Your task is to:

1. Analyze information from multiple sources (Exa, Perplexity, Wikipedia)
2. Cross-reference facts for accuracy
3. Create a comprehensive, well-structured answer
4. Use inline citations using [1], [2], etc. notation
5. Be accurate and only cite verified information
6. If sources disagree, mention the different perspectives

IMPORTANT CITATION RULES:
- Use [1], [2], [3] etc. to cite sources inline
- Place citations immediately after the relevant information
- Each number corresponds to a source in the provided list
- Only use citations that exist in the provided list

Write in a clear, engaging style. Be thorough but concise.`
        }, {
          role: 'user',
          content: `${historyContext}Original Question: "${originalQuery}"

Information from multiple sources:
${context}

Available Citations (use these numbers in your response):
${citations.map((c, i) => `[${i+1}] ${c.title} (${c.source})`).join('\n')}

Please provide a comprehensive answer using inline citations.`
        }],
        temperature: 0.3,
        max_tokens: 2000
      })
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Claude synthesis error: ${response.status}`)
    }
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    if (!content) {
      throw new Error('No content in synthesis response')
    }
    
    return content
  }
}
