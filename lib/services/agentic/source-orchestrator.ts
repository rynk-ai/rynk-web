import { SourceResult, SourcePlan } from './types'
import { financialOrchestrator } from './financial-orchestrator'

/**
 * SourceOrchestrator - Manages parallel fetching from multiple information sources
 */
export class SourceOrchestrator {
  
  /**
   * Fetch from Exa AI - Semantic web search
   */
  async fetchFromExa(query: string): Promise<SourceResult> {
    try {
      // Note: We need to add EXA_API_KEY to environment
      const apiKey = process.env.EXA_API_KEY
      if (!apiKey) {
        throw new Error('EXA_API_KEY not configured')
      }

      const response = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          type: 'auto', // Let Exa choose the best search type
          num_results: 10,
          contents: {
            text: true,
            highlights: true
          },
          use_autoprompt: true // Let Exa optimize the query
        })
      })

      if (!response.ok) {
        throw new Error(`Exa API error: ${response.status}`)
      }

      const data :any= await response.json()
      
      return {
        source: 'exa',
        data: data.results,
        citations: data.results?.map((r: any) => ({
          url: r.url,
          title: r.title,
          snippet: r.highlights?.[0] || r.text?.substring(0, 200)
        })) || []
      }
    } catch (error) {
      console.error('[Exa] Error:', error)
      return {
        source: 'exa',
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Fetch from Perplexity - AI search with citations
   */
  async fetchFromPerplexity(query: string): Promise<SourceResult> {
    try {
      const apiKey = process.env.PERPLEXITY_API_KEY
      if (!apiKey) {
        throw new Error('PERPLEXITY_API_KEY not configured')
      }

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{
            role: 'user',
            content: query
          }],
          temperature: 0.5,
          max_tokens: 1000,
          return_citations: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Perplexity] API Error Body:', errorData)
        throw new Error(`Perplexity API error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const data :any = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      const citations = data.citations || []
      
      return {
        source: 'perplexity',
        data: content,
        citations: citations.map((url: string, i: number) => ({
          url,
          title: `Source ${i + 1}`,
          snippet: undefined
        }))
      }
    } catch (error) {
      console.error('[Perplexity] Error:', error)
      return {
        source: 'perplexity',
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Fetch from Wikipedia - Encyclopedic knowledge
   */
  async fetchFromWikipedia(titles: string[]): Promise<SourceResult> {
    try {
      if (!titles || titles.length === 0) {
        return {
          source: 'wikipedia',
          data: [],
          citations: []
        }
      }

      const results = await Promise.all(
        titles.slice(0, 3).map(async (title) => { // Limit to 3 articles
          try {
            const response = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
            )
            
            if (!response.ok) {
              throw new Error(`Wikipedia API error for "${title}": ${response.status}`)
            }
            
            return await response.json()
          } catch (error) {
            console.error(`[Wikipedia] Error fetching "${title}":`, error)
            return null
          }
        })
      )
      
      const validResults = results.filter(r => r !== null)
      
      return {
        source: 'wikipedia',
        data: validResults,
        citations: validResults.map((r: any) => ({
          url: r.content_urls?.desktop?.page || '',
          title: r.title,
          snippet: r.extract
        }))
      }
    } catch (error) {
      console.error('[Wikipedia] Error:', error)
      return {
        source: 'wikipedia',
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Fetch from Financial APIs - Stock and crypto data
   */
  async fetchFromFinancial(
    type: 'stock' | 'crypto',
    symbols: string[]
  ): Promise<SourceResult> {
    try {
      console.log('[SourceOrchestrator] Fetching financial data:', { type, symbols })
      const results = await financialOrchestrator.fetchMarketData(symbols, type)
      return {
        source: 'financial',
        data: results,
        citations: []
      }
    } catch (error) {
      console.error('[Financial] Error:', error)
      return {
        source: 'financial',
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Execute the source plan - fetch from all sources in parallel
   */
  async executeSourcePlan(plan: SourcePlan): Promise<SourceResult[]> {
    const promises: Promise<SourceResult>[] = []
    
    console.log('[SourceOrchestrator] Executing plan:', {
      sources: plan.sources,
      reasoning: plan.reasoning
    })
    
    // Launch all source fetches in parallel
    if (plan.sources.includes('exa') && plan.searchQueries.exa) {
      promises.push(this.fetchFromExa(plan.searchQueries.exa))
    }
    
    if (plan.sources.includes('perplexity') && plan.searchQueries.perplexity) {
      promises.push(this.fetchFromPerplexity(plan.searchQueries.perplexity))
    }
    
    if (plan.sources.includes('wikipedia') && plan.searchQueries.wikipedia) {
      promises.push(this.fetchFromWikipedia(plan.searchQueries.wikipedia))
    }

    // Financial data source
    if (plan.sources.includes('financial') && plan.searchQueries.financial) {
      promises.push(
        this.fetchFromFinancial(
          plan.searchQueries.financial.type,
          plan.searchQueries.financial.symbols
        )
      )
    }
    
    // Grok disabled for now
    
    // Wait for all sources to respond (or fail)
    const results = await Promise.all(promises)
    
    // Log results
    const successful = results.filter(r => !r.error).length
    const failed = results.filter(r => r.error).length
    console.log(`[SourceOrchestrator] Completed: ${successful} successful, ${failed} failed`)
    
    return results
  }
}

