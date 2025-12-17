/**
 * Research Orchestrator
 * 
 * Orchestrates deep research generation by:
 * 1. Analyzing query to generate research verticals
 * 2. Parallel web search across all verticals
 * 3. Generating document skeleton
 * 4. Parallel section generation
 * 5. Final synthesis
 */

import type { 
  ResearchMetadata, 
  ResearchVertical, 
  ResearchSection,
  ResearchCitation 
} from '@/lib/services/domain-types'
import type { SourceResult } from '@/lib/services/agentic/types'

// Research orchestrator configuration
const CONFIG = {
  maxVerticals: 6,
  maxSourcesPerVertical: 8,
  maxSections: 10,
  parallelSearches: 3,
  parallelSections: 4,
}

/**
 * Analyze a query and generate research verticals
 * Uses Groq for fast LLM analysis
 */
export async function analyzeResearchQuery(
  query: string,
  apiKey: string
): Promise<ResearchVertical[]> {
  const prompt = `Analyze this research query and identify 4-6 distinct research verticals (angles/perspectives) to explore comprehensively.

QUERY: "${query}"

Return JSON:
{
  "title": "Suggested research title",
  "verticals": [
    {
      "id": "v1",
      "name": "Vertical name (e.g., 'Historical Context', 'Current Research', 'Industry Applications')",
      "description": "What this angle explores",
      "searchQueries": ["optimized search query 1", "optimized search query 2"]
    }
  ]
}

IMPORTANT VERTICAL TYPES TO CONSIDER:
- Historical/Background Context
- Current State/Latest Research
- Key Players/Experts/Organizations
- Data & Statistics
- Case Studies/Real Examples
- Challenges & Limitations
- Future Outlook/Predictions
- Opposing Views/Critiques

Return ONLY valid JSON.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-instruct-0905',
        messages: [
          { role: 'system', content: 'You are a research methodology expert. Generate research angles that ensure comprehensive coverage of a topic.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data: any = await response.json()
    const result = JSON.parse(data.choices[0].message.content || '{}')
    
    return (result.verticals || []).slice(0, CONFIG.maxVerticals).map((v: any, i: number) => ({
      id: v.id || `v${i + 1}`,
      name: v.name || `Research Angle ${i + 1}`,
      description: v.description || '',
      searchQueries: v.searchQueries || [query],
      status: 'pending' as const,
      sourcesCount: 0
    }))
    
  } catch (error) {
    console.error('[ResearchOrchestrator] Query analysis failed:', error)
    // Fallback to basic verticals
    return [
      { id: 'v1', name: 'Overview & Background', description: 'General context', searchQueries: [query], status: 'pending', sourcesCount: 0 },
      { id: 'v2', name: 'Current Research', description: 'Latest findings', searchQueries: [`${query} latest research`], status: 'pending', sourcesCount: 0 },
      { id: 'v3', name: 'Applications', description: 'Real-world uses', searchQueries: [`${query} applications examples`], status: 'pending', sourcesCount: 0 },
      { id: 'v4', name: 'Challenges', description: 'Limitations and issues', searchQueries: [`${query} challenges limitations`], status: 'pending', sourcesCount: 0 },
    ]
  }
}

/**
 * Search a single vertical using Exa and Perplexity
 */
export async function searchVertical(
  vertical: ResearchVertical,
  exaApiKey?: string,
  perplexityApiKey?: string
): Promise<{ vertical: ResearchVertical; sources: SourceResult[] }> {
  const sources: SourceResult[] = []
  const searchQuery = vertical.searchQueries[0] || vertical.name

  // Search Exa
  if (exaApiKey) {
    try {
      const response = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'x-api-key': exaApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          type: 'auto',
          num_results: 6,
          contents: {
            text: true,
            highlights: true,
            extras: { imageLinks: 2 }
          },
          use_autoprompt: true
        })
      })

      if (response.ok) {
        const data: any = await response.json()
        sources.push({
          source: 'exa',
          data: data.results,
          citations: data.results?.map((r: any) => ({
            url: r.url,
            title: r.title,
            snippet: r.highlights?.[0] || r.text?.substring(0, 200),
            image: r.image
          })) || []
        })
      }
    } catch (error) {
      console.error(`[ResearchOrchestrator] Exa search failed for ${vertical.name}:`, error)
    }
  }

  // Search Perplexity
  if (perplexityApiKey) {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: searchQuery }],
          temperature: 0.5,
          max_tokens: 800,
          return_citations: true,
          return_images: true
        })
      })

      if (response.ok) {
        const data: any = await response.json()
        const content = data.choices?.[0]?.message?.content || ''
        const citations = data.citations || []
        
        sources.push({
          source: 'perplexity',
          data: content,
          citations: citations.map((url: string, i: number) => ({
            url,
            title: `Source ${i + 1}`,
            snippet: undefined
          }))
        })
      }
    } catch (error) {
      console.error(`[ResearchOrchestrator] Perplexity search failed for ${vertical.name}:`, error)
    }
  }

  // Count total sources
  let sourcesCount = 0
  for (const s of sources) {
    if (s.citations) sourcesCount += s.citations.length
  }

  return {
    vertical: {
      ...vertical,
      status: 'completed' as const,
      sourcesCount
    },
    sources
  }
}

/**
 * Search all verticals in parallel
 */
export async function searchAllVerticals(
  verticals: ResearchVertical[],
  exaApiKey?: string,
  perplexityApiKey?: string,
  onProgress?: (verticalId: string, status: 'searching' | 'completed' | 'error', sourcesCount: number) => void
): Promise<Map<string, SourceResult[]>> {
  const results = new Map<string, SourceResult[]>()
  
  // Process in batches to avoid rate limits
  const batchSize = CONFIG.parallelSearches
  for (let i = 0; i < verticals.length; i += batchSize) {
    const batch = verticals.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (vertical) => {
      onProgress?.(vertical.id, 'searching', 0)
      
      try {
        const { vertical: updatedVertical, sources } = await searchVertical(
          vertical, 
          exaApiKey, 
          perplexityApiKey
        )
        
        results.set(vertical.id, sources)
        onProgress?.(vertical.id, 'completed', updatedVertical.sourcesCount)
        
        return { vertical: updatedVertical, sources }
      } catch (error) {
        console.error(`[ResearchOrchestrator] Failed to search vertical ${vertical.id}:`, error)
        onProgress?.(vertical.id, 'error', 0)
        results.set(vertical.id, [])
        return null
      }
    })
    
    await Promise.all(batchPromises)
  }
  
  return results
}

/**
 * Generate research document skeleton
 */
export async function generateResearchSkeleton(
  query: string,
  verticals: ResearchVertical[],
  sourcesByVertical: Map<string, SourceResult[]>,
  apiKey: string
): Promise<ResearchMetadata> {
  // Build context from all sources
  let sourceContext = ''
  let allCitations: ResearchCitation[] = []
  let citationIndex = 1
  
  for (const [verticalId, sources] of sourcesByVertical) {
    const vertical = verticals.find(v => v.id === verticalId)
    if (!vertical) continue
    
    sourceContext += `\n\n--- ${vertical.name} ---\n`
    
    for (const source of sources) {
      if (source.source === 'perplexity' && typeof source.data === 'string') {
        sourceContext += source.data.substring(0, 1000) + '\n'
      }
      
      if (source.citations) {
        for (const c of source.citations.slice(0, 4)) {
          allCitations.push({
            id: `${citationIndex}`,
            url: c.url,
            title: c.title,
            snippet: c.snippet || '',
            sourceType: detectSourceType(c.url)
          })
          citationIndex++
        }
      }
    }
  }

  const prompt = `Create a comprehensive research document skeleton based on the following query and sources.

RESEARCH QUERY: "${query}"

RESEARCH VERTICALS EXPLORED:
${verticals.map(v => `- ${v.name}: ${v.description} (${v.sourcesCount} sources found)`).join('\n')}

SOURCE SUMMARY:
${sourceContext.substring(0, 4000)}

Generate a JSON structure for the research document:
{
  "title": "Professional research title",
  "abstract": "200-300 word executive summary synthesizing key findings",
  "keyFindings": ["Finding 1 with evidence", "Finding 2", "Finding 3", "Finding 4", "Finding 5"],
  "methodology": "Brief description of how this research was conducted",
  "limitations": ["Limitation 1", "Limitation 2"],
  "sections": [
    {
      "id": "s1",
      "heading": "Section heading",
      "verticalId": "v1",
      "contentOutline": "What this section should cover in detail"
    }
  ]
}

REQUIREMENTS:
- 6-15 comprehensive sections
- Each section maps to a vertical (can have multiple sections per vertical)
- Sections should flow logically (intro → background → main content → analysis → conclusion)
- Abstract should synthesize the most important insights
- Key findings should be specific and evidence-based

Return ONLY valid JSON.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-instruct-0905',
        messages: [
          { role: 'system', content: 'You are a senior research analyst creating comprehensive research documents. Your skeletons are well-structured and comprehensive.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data: any = await response.json()
    const result = JSON.parse(data.choices[0].message.content || '{}')
    
    // Build sections from skeleton
    const sections: ResearchSection[] = (result.sections || []).map((s: any, i: number) => ({
      id: s.id || `s${i + 1}`,
      heading: s.heading || `Section ${i + 1}`,
      verticalId: s.verticalId || verticals[0]?.id || 'v1',
      content: '',  // Will be generated later
      wordCount: 0,
      citations: [],
      status: 'pending' as const
    }))
    
    // Collect hero images from sources
    const heroImages: ResearchMetadata['heroImages'] = []
    for (const sources of sourcesByVertical.values()) {
      for (const source of sources) {
        if (source.citations) {
          for (const c of source.citations) {
            if ((c as any).image && heroImages.length < 4) {
              heroImages.push({
                url: (c as any).image,
                title: c.title,
                sourceUrl: c.url
              })
            }
          }
        }
      }
    }
    
    const totalSources = Array.from(sourcesByVertical.values())
      .reduce((acc, sources) => acc + sources.flatMap(s => s.citations || []).length, 0)

    return {
      type: 'research',
      title: result.title || `Research: ${query}`,
      query,
      abstract: result.abstract || '',
      keyFindings: result.keyFindings || [],
      methodology: result.methodology || 'This research was conducted using multi-source web search and AI-powered synthesis.',
      limitations: result.limitations || [],
      generatedAt: Date.now(),
      verticals,
      sections,
      allCitations,
      heroImages,
      totalSources,
      totalWordCount: 0,
      estimatedReadTime: 0
    }
    
  } catch (error) {
    console.error('[ResearchOrchestrator] Skeleton generation failed:', error)
    
    // Fallback skeleton
    return {
      type: 'research',
      title: `Research: ${query}`,
      query,
      abstract: 'Research document is being generated...',
      keyFindings: [],
      methodology: 'Multi-source web research with AI synthesis',
      limitations: [],
      generatedAt: Date.now(),
      verticals,
      sections: verticals.map((v, i) => ({
        id: `s${i + 1}`,
        heading: v.name,
        verticalId: v.id,
        content: '',
        wordCount: 0,
        citations: [],
        status: 'pending' as const
      })),
      allCitations,
      heroImages: [],
      totalSources: 0,
      totalWordCount: 0,
      estimatedReadTime: 0
    }
  }
}

/**
 * Generate a single section content
 */
export async function generateSectionContent(
  section: ResearchSection,
  sources: SourceResult[],
  metadata: ResearchMetadata,
  groqApiKey: string
): Promise<ResearchSection> {
  // Build source context for this section
  let sourceContext = ''
  const vertical = metadata.verticals.find(v => v.id === section.verticalId)
  
  for (const source of sources) {
    if (source.source === 'perplexity' && typeof source.data === 'string') {
      sourceContext += source.data + '\n\n'
    }
    if (source.source === 'exa' && Array.isArray(source.data)) {
      for (const item of source.data.slice(0, 3)) {
        if (item.highlights?.[0]) {
          sourceContext += item.highlights[0] + '\n'
        } else if (item.text) {
          sourceContext += item.text.substring(0, 400) + '\n'
        }
      }
    }
  }
  
  // Get relevant citations for this section
  const sectionCitations = metadata.allCitations
    .filter(c => {
      // Simple matching - could be improved with semantic matching
      return sourceContext.toLowerCase().includes(c.title.toLowerCase().substring(0, 20))
    })
    .slice(0, 5)
    .map(c => c.id)

  const prompt = `Write a comprehensive section for a research document.

DOCUMENT TITLE: "${metadata.title}"
SECTION HEADING: "${section.heading}"
SECTION CONTEXT: This section is part of the "${vertical?.name || 'main'}" research vertical.

SOURCE MATERIAL:
${sourceContext.substring(0, 3000)}

AVAILABLE CITATIONS (use [1], [2] etc. inline):
${metadata.allCitations.slice(0, 10).map(c => `[${c.id}] ${c.title}`).join('\n')}

REQUIREMENTS:
- Write 300-500 words of comprehensive content
- Use markdown formatting (bold, lists, subheadings if needed)
- Include inline citations [1], [2] where appropriate
- Be objective and evidence-based
- Use professional, academic tone
- Include specific facts, data, and examples from sources

Write the section content directly, no JSON wrapper needed.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-instruct-0905',
        messages: [
          { role: 'system', content: 'You are a senior research writer producing comprehensive, well-cited research content. Your writing is clear, factual, and uses inline citations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data: any = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    // Extract citations used in content
    const usedCitations: string[] = content.match(/\[(\d+)\]/g)?.map((m: string) => m.slice(1, -1)) || []
    
    // Count words
    const wordCount = content.split(/\s+/).filter(Boolean).length

    return {
      ...section,
      content,
      wordCount,
      citations: [...new Set(usedCitations)] as string[],
      status: 'completed' as const
    }
    
  } catch (error) {
    console.error(`[ResearchOrchestrator] Section ${section.id} generation failed:`, error)
    
    return {
      ...section,
      content: `*Content generation failed for this section. Please try regenerating.*`,
      wordCount: 0,
      citations: [],
      status: 'completed' as const
    }
  }
}

/**
 * Generate all sections in parallel
 */
export async function generateAllSections(
  metadata: ResearchMetadata,
  sourcesByVertical: Map<string, SourceResult[]>,
  groqApiKey: string,
  onProgress?: (sectionId: string, status: 'generating' | 'completed') => void
): Promise<ResearchSection[]> {
  const completedSections: ResearchSection[] = []
  
  // Process in batches
  const batchSize = CONFIG.parallelSections
  for (let i = 0; i < metadata.sections.length; i += batchSize) {
    const batch = metadata.sections.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (section) => {
      onProgress?.(section.id, 'generating')
      
      const sources = sourcesByVertical.get(section.verticalId) || []
      const completedSection = await generateSectionContent(
        section,
        sources,
        metadata,
        groqApiKey
      )
      
      onProgress?.(section.id, 'completed')
      return completedSection
    })
    
    const batchResults = await Promise.all(batchPromises)
    completedSections.push(...batchResults)
  }
  
  return completedSections
}

/**
 * Final synthesis pass - update metadata with completed sections
 */
export function synthesizeResearchDocument(
  metadata: ResearchMetadata,
  completedSections: ResearchSection[]
): ResearchMetadata {
  // Calculate totals
  const totalWordCount = completedSections.reduce((acc, s) => acc + s.wordCount, 0)
  const estimatedReadTime = Math.ceil(totalWordCount / 200) // 200 WPM reading speed

  return {
    ...metadata,
    sections: completedSections,
    totalWordCount,
    estimatedReadTime
  }
}

/**
 * Detect source type from URL
 */
function detectSourceType(url: string): ResearchCitation['sourceType'] {
  const lowerUrl = url.toLowerCase()
  
  if (lowerUrl.includes('arxiv.org') || lowerUrl.includes('scholar') || 
      lowerUrl.includes('pubmed') || lowerUrl.includes('doi.org') ||
      lowerUrl.includes('.edu/') || lowerUrl.includes('researchgate')) {
    return 'academic'
  }
  
  if (lowerUrl.includes('gov') || lowerUrl.includes('.org/') ||
      lowerUrl.includes('who.int') || lowerUrl.includes('un.org')) {
    return 'official'
  }
  
  if (lowerUrl.includes('news') || lowerUrl.includes('bbc') ||
      lowerUrl.includes('cnn') || lowerUrl.includes('reuters') ||
      lowerUrl.includes('nytimes') || lowerUrl.includes('theguardian')) {
    return 'news'
  }
  
  return 'web'
}
