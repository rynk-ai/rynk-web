'use server'

/**
 * Research Surface Server Actions
 * 
 * Parallel server actions for deep research generation.
 * Uses SSE streaming for real-time progress updates.
 */

import { auth } from '@/lib/auth'
import { cloudDb } from '@/lib/services/cloud-db'
import type { SurfaceState, ResearchMetadata, ResearchSection, ResearchVertical, ResearchCitation } from '@/lib/services/domain-types'

// =============================================================================
// TYPES
// =============================================================================

export interface ResearchPlan {
  title: string
  query: string
  verticals: ResearchVertical[]
  suggestedSections: Array<{
    id: string
    heading: string
    verticalId: string
    description: string
  }>
  methodology: string
}

export interface VerticalSearchResult {
  verticalId: string
  sources: Array<{
    url: string
    title: string
    snippet: string
    fullText?: string
    image?: string
    sourceType: 'web' | 'academic' | 'news'
    publishedDate?: string
  }>
  synthesis: string
  citations: ResearchCitation[]
}

export interface ResearchSectionResult {
  status: 'success' | 'error'
  content: string
  wordCount: number
  citations: string[]  // [1], [2] refs
  sectionCitations?: Array<{ url: string; title: string; snippet?: string }>
  sectionImages?: Array<{ url: string; sourceUrl: string; sourceTitle: string }>
  error?: string
}

export interface SynthesisResult {
  abstract: string
  keyFindings: string[]
  totalSources: number
  allCitations: ResearchCitation[]
}

// =============================================================================
// PHASE 1: RESEARCH PLANNING
// =============================================================================

/**
 * Generate research plan with LLM-determined structure
 * Returns verticals to search and suggested section structure
 */
export async function generateResearchPlan(query: string): Promise<ResearchPlan> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured')
  }

  const prompt = `Analyze this research query and create a comprehensive research plan.

QUERY: "${query}"

You must determine:
1. A proper research title
2. 4-6 research verticals (angles/perspectives to explore)
3. 10-15 sections that would create a comprehensive research document
4. Brief methodology description

The sections should be SPECIFIC to this query - not generic. Think about what a researcher would actually want to know about this topic.

Return JSON:
{
  "title": "Comprehensive research title",
  "verticals": [
    {
      "id": "v1",
      "name": "Vertical name",
      "description": "What this explores",
      "searchQueries": ["specific search query 1", "specific search query 2"]
    }
  ],
  "suggestedSections": [
    {
      "id": "s1",
      "heading": "Section heading specific to topic",
      "verticalId": "v1",
      "description": "What this section will cover"
    }
  ],
  "methodology": "Brief description of research approach"
}

IMPORTANT: Make sections SPECIFIC to the query, not generic like "Overview" or "Conclusion". 
For example, if query is about "quantum computing", sections might be:
- "Qubit Technologies: Superconducting vs Ion Trap"
- "Current Quantum Supremacy Claims and Critiques"
- "Near-term Applications: Optimization and Simulation"

Return ONLY valid JSON.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are a research methodology expert. Create comprehensive, domain-appropriate research plans.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error(`Research plan generation failed: ${response.status}`)
    }

    const data: any = await response.json()
    const content = data.choices[0].message.content

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Build research plan
    const verticals: ResearchVertical[] = (parsed.verticals || []).map((v: any, i: number) => ({
      id: v.id || `v${i + 1}`,
      name: v.name || `Research Angle ${i + 1}`,
      description: v.description || '',
      searchQueries: v.searchQueries || [query],
      status: 'pending' as const,
      sourcesCount: 0
    }))

    return {
      title: parsed.title || query,
      query,
      verticals,
      suggestedSections: parsed.suggestedSections || [],
      methodology: parsed.methodology || 'Multi-source web and academic research'
    }
  } catch (error) {
    console.error('[ResearchAction] Plan generation failed:', error)
    // Fallback plan
    return {
      title: query,
      query,
      verticals: [
        { id: 'v1', name: 'Overview', description: 'General context', searchQueries: [query], status: 'pending', sourcesCount: 0 },
        { id: 'v2', name: 'Current State', description: 'Latest developments', searchQueries: [`${query} latest 2024`], status: 'pending', sourcesCount: 0 },
        { id: 'v3', name: 'Applications', description: 'Real-world uses', searchQueries: [`${query} applications use cases`], status: 'pending', sourcesCount: 0 },
        { id: 'v4', name: 'Challenges', description: 'Known issues', searchQueries: [`${query} challenges problems`], status: 'pending', sourcesCount: 0 },
      ],
      suggestedSections: [],
      methodology: 'Multi-source web research'
    }
  }
}

// =============================================================================
// PHASE 2: DEEP VERTICAL SEARCH
// =============================================================================

/**
 * Search a single vertical deeply with multiple sources
 */
export async function searchVerticalDeep(
  vertical: ResearchVertical,
  query: string
): Promise<VerticalSearchResult> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const sources: VerticalSearchResult['sources'] = []
  const citations: ResearchCitation[] = []
  let synthesis = ''
  let citationIndex = 1

  const searchQuery = vertical.searchQueries?.[0] || vertical.name

  // Parallel search: Exa + Perplexity + Semantic Scholar
  const searchPromises: Promise<void>[] = []

  // Exa Search
  const exaApiKey = process.env.EXA_API_KEY
  if (exaApiKey) {
    searchPromises.push((async () => {
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
            num_results: 8,
            contents: { text: true, highlights: true },
            use_autoprompt: true
          })
        })

        if (response.ok) {
          const data: any = await response.json()
          for (const result of (data.results || [])) {
            sources.push({
              url: result.url,
              title: result.title,
              snippet: result.highlights?.[0] || result.text?.substring(0, 400),
              fullText: result.text?.substring(0, 2000),
              image: result.image,
              sourceType: 'web'
            })
            citations.push({
              id: String(citationIndex++),
              url: result.url,
              title: result.title,
              snippet: result.highlights?.[0] || result.text?.substring(0, 200) || '',
              sourceType: 'web'
            })
          }
        }
      } catch (e) {
        console.error('[ResearchAction] Exa search failed:', e)
      }
    })())
  }

  // Perplexity Search
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY
  if (perplexityApiKey) {
    searchPromises.push((async () => {
      try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [{ role: 'user', content: `Research: ${searchQuery}` }],
            temperature: 0.5,
            max_tokens: 1500,
            return_citations: true
          })
        })

        if (response.ok) {
          const data: any = await response.json()
          synthesis = data.choices?.[0]?.message?.content || ''
          
          // Extract citations from Perplexity
          if (data.citations) {
            for (const url of data.citations) {
              sources.push({
                url,
                title: `Source from ${new URL(url).hostname}`,
                snippet: '',
                sourceType: 'web'
              })
              citations.push({
                id: String(citationIndex++),
                url,
                title: `Source from ${new URL(url).hostname}`,
                snippet: '',
                sourceType: 'web'
              })
            }
          }
        }
      } catch (e) {
        console.error('[ResearchAction] Perplexity search failed:', e)
      }
    })())
  }

  // Semantic Scholar Search (for academic sources)
  searchPromises.push((async () => {
    try {
      const response = await fetch(
        `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchQuery)}&limit=5&fields=title,abstract,url,year,authors,citationCount`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data: any = await response.json()
        for (const paper of (data.data || [])) {
          if (paper.url) {
            sources.push({
              url: paper.url,
              title: paper.title,
              snippet: paper.abstract?.substring(0, 400) || '',
              sourceType: 'academic',
              publishedDate: paper.year ? String(paper.year) : undefined
            })
            citations.push({
              id: String(citationIndex++),
              url: paper.url,
              title: paper.title,
              author: paper.authors?.[0]?.name,
              date: paper.year ? String(paper.year) : undefined,
              snippet: paper.abstract?.substring(0, 200) || '',
              sourceType: 'academic'
            })
          }
        }
      }
    } catch (e) {
      console.error('[ResearchAction] Semantic Scholar search failed:', e)
    }
  })())

  await Promise.all(searchPromises)

  console.log(`[ResearchAction] Vertical "${vertical.name}": ${sources.length} sources found`)

  return {
    verticalId: vertical.id,
    sources,
    synthesis,
    citations
  }
}

// =============================================================================
// PHASE 3: SYNTHESIS
// =============================================================================

/**
 * Synthesize all findings into abstract and key insights
 */
export async function synthesizeFindings(
  verticalResults: VerticalSearchResult[],
  plan: ResearchPlan
): Promise<SynthesisResult> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured')
  }

  // Collect all citations with unique IDs
  const allCitations: ResearchCitation[] = []
  let citationIndex = 1
  
  for (const result of verticalResults) {
    for (const citation of result.citations) {
      allCitations.push({
        ...citation,
        id: String(citationIndex++)
      })
    }
  }

  // Build context from all sources
  const sourceContext = verticalResults.map(result => {
    const vertical = plan.verticals.find(v => v.id === result.verticalId)
    return `### ${vertical?.name || 'Research Angle'}\n${result.synthesis || result.sources.slice(0, 3).map(s => `- ${s.title}: ${s.snippet}`).join('\n')}`
  }).join('\n\n')

  const prompt = `Based on the following research findings, create:
1. A comprehensive abstract (200-300 words) synthesizing all key information
2. 5-7 key findings as bullet points

RESEARCH TITLE: "${plan.title}"

SOURCE FINDINGS:
${sourceContext.substring(0, 6000)}

Return JSON:
{
  "abstract": "200-300 word synthesis of all findings...",
  "keyFindings": [
    "Key finding 1 with specific details",
    "Key finding 2 with specific details",
    "Key finding 3 with specific details",
    "Key finding 4 with specific details",
    "Key finding 5 with specific details"
  ]
}

IMPORTANT: Base findings on the actual source content. Be specific, not generic.
Return ONLY valid JSON.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are a research analyst. Synthesize findings accurately and specifically.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      throw new Error(`Synthesis failed: ${response.status}`)
    }

    const data: any = await response.json()
    const content = data.choices[0].message.content
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON in synthesis response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      abstract: parsed.abstract || 'Research synthesis in progress...',
      keyFindings: parsed.keyFindings || [],
      totalSources: allCitations.length,
      allCitations
    }
  } catch (error) {
    console.error('[ResearchAction] Synthesis failed:', error)
    return {
      abstract: 'Research synthesis could not be completed.',
      keyFindings: [],
      totalSources: allCitations.length,
      allCitations
    }
  }
}

// =============================================================================
// PHASE 4: SECTION GENERATION
// =============================================================================

/**
 * Generate a single research section with inline citations
 */
export async function generateResearchSection(
  section: { id: string; heading: string; verticalId: string; description?: string },
  sources: VerticalSearchResult['sources'],
  plan: ResearchPlan,
  allSections: Array<{ id: string; heading: string }>
): Promise<ResearchSectionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { status: 'error', content: '', wordCount: 0, citations: [], error: 'Unauthorized' }
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return { status: 'error', content: '', wordCount: 0, citations: [], error: 'No API key' }
  }

  try {
    // Build source context for this section
    const relevantSources = sources.slice(0, 6)
    const sourceContext = relevantSources.map((s, i) => 
      `[${i + 1}] ${s.title}: ${s.snippet || s.fullText?.substring(0, 300) || ''}`
    ).join('\n\n')

    const structureContext = allSections.map(s => s.heading).join(', ')

    const prompt = `Write the "${section.heading}" section for a research document about "${plan.title}".

DOCUMENT STRUCTURE: ${structureContext}

SECTION DESCRIPTION: ${section.description || 'Cover this topic comprehensively'}

AVAILABLE SOURCES:
${sourceContext}

REQUIREMENTS:
1. Write 400-600 words of well-researched content
2. Use inline citations like [1], [2], [3] referencing the sources above
3. Be specific and evidence-based - cite sources for claims
4. Use markdown formatting: **bold** for key terms, bullet lists where appropriate
5. Maintain academic/professional tone
6. Do NOT include the section heading in your response

Return ONLY the section content in markdown format with inline citations.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are a research writer producing well-cited, professional content. Always include inline citations [1], [2], etc.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      return { status: 'error', content: '', wordCount: 0, citations: [], error: `API error: ${response.status}` }
    }

    const data: any = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const wordCount = content.split(/\s+/).filter(Boolean).length

    // Extract citation references from content
    const citationRefs = content.match(/\[\d+\]/g) || []
    const uniqueCitations = [...new Set(citationRefs)]

    // Build section citations from used sources
    const sectionCitations = relevantSources.slice(0, 6).map(s => ({
      url: s.url,
      title: s.title,
      snippet: s.snippet?.substring(0, 150)
    }))

    // Extract images
    const sectionImages = relevantSources
      .filter(s => s.image)
      .slice(0, 2)
      .map(s => ({
        url: s.image!,
        sourceUrl: s.url,
        sourceTitle: s.title
      }))

    return {
      status: 'success',
      content: content.trim(),
      wordCount,
      citations: uniqueCitations as string[],
      sectionCitations,
      sectionImages
    }
  } catch (error) {
    console.error(`[ResearchAction] Section ${section.id} failed:`, error)
    return {
      status: 'error',
      content: '',
      wordCount: 0,
      citations: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// =============================================================================
// PHASE 5: SAVE
// =============================================================================

/**
 * Save completed research surface and deduct credit
 */
export async function saveResearchSurface(
  conversationId: string,
  surfaceState: SurfaceState
): Promise<{ success: boolean; surfaceId: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Get existing conversation
  const conversation = await cloudDb.getConversation(conversationId)
  if (!conversation) {
    throw new Error('Conversation not found')
  }
  if (conversation.userId !== userId) {
    throw new Error('Unauthorized')
  }

  // Generate surface ID
  const surfaceId = `research-${Date.now()}`
  
  // Enrich state
  const enrichedState = {
    ...surfaceState,
    id: surfaceId,
    savedAt: Date.now()
  }

  // Get existing states
  const existingStates = conversation.surfaceStates || {}
  const existingResearch = existingStates.research

  let updatedArray: any[]
  if (Array.isArray(existingResearch)) {
    updatedArray = [...existingResearch, enrichedState].slice(-10)
  } else if (existingResearch && typeof existingResearch === 'object') {
    updatedArray = [existingResearch, enrichedState]
  } else {
    updatedArray = [enrichedState]
  }

  // Update conversation
  await cloudDb.updateConversation(conversationId, {
    surfaceStates: {
      ...existingStates,
      research: updatedArray
    }
  })

  // Deduct credit (research costs more - 2 credits)
  await cloudDb.updateCredits(userId, -2)
  console.log(`[ResearchAction] Saved research ${surfaceId}, deducted 2 credits from ${userId}`)

  return { success: true, surfaceId }
}

/**
 * Retry a failed section
 */
export async function retryResearchSection(
  section: { id: string; heading: string; verticalId: string; description?: string },
  sources: VerticalSearchResult['sources'],
  plan: ResearchPlan,
  allSections: Array<{ id: string; heading: string }>
): Promise<ResearchSectionResult> {
  return generateResearchSection(section, sources, plan, allSections)
}
