'use server'

/**
 * Wiki Surface Server Actions
 * 
 * Parallel server actions for wiki surface generation.
 * Each action is independent and can be called in parallel from the client.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { auth } from '@/lib/auth'
import { cloudDb } from '@/lib/services/cloud-db'
import type { SurfaceState, WikiMetadata } from '@/lib/services/domain-types'

// =============================================================================
// TYPES
// =============================================================================

export interface WikiSkeletonState extends SurfaceState {
  surfaceType: 'wiki'
  metadata: WikiMetadata
  isSkeleton: true
}

export interface WebContext {
  summary: string
  citations: Array<{
    url: string
    title: string
    snippet?: string
    image?: string
  }>
  keyFacts: string[]
  lastUpdated: string
}

export interface WikiSectionResult {
  status: 'success' | 'error'
  content: string
  citations?: Array<{ url: string; title: string; snippet?: string }>
  images?: Array<{ url: string; title: string; sourceUrl?: string }>
  error?: string
}

// =============================================================================
// SKELETON GENERATION
// =============================================================================

/**
 * Generate wiki skeleton with upfront web search
 * Returns both skeleton and web context for section generation
 */
export async function generateWikiSkeleton(
  query: string
): Promise<{ skeleton: WikiSkeletonState; webContext: WebContext }> {
  // Auth check
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const { env } = getCloudflareContext()
  
  // Step 1: Fetch web context (Exa + Perplexity in parallel)
  const webContext = await fetchWebContext(query, env)
  console.log(`[WikiAction] Web context fetched: ${webContext.citations.length} citations, ${webContext.keyFacts.length} facts`)
  
  // Step 2: Generate skeleton with web context
  const skeleton = await generateSkeletonWithContext(query, webContext, env)
  console.log(`[WikiAction] Skeleton generated: ${skeleton.metadata.sections.length} sections`)
  
  return { skeleton, webContext }
}

/**
 * Fetch web context from Exa and Perplexity in parallel
 */
async function fetchWebContext(query: string, env: any): Promise<WebContext> {
  const results: any[] = []
  const fetchPromises: Promise<void>[] = []

  // Use process.env for API keys (not Cloudflare bindings)
  const exaApiKey = process.env.EXA_API_KEY || env.EXA_API_KEY
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY || env.PERPLEXITY_API_KEY

  // Exa search
  if (exaApiKey) {
    fetchPromises.push((async () => {
      try {
        const response = await fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'x-api-key': exaApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            type: 'auto',
            num_results: 6,
            contents: { text: true, highlights: true },
            use_autoprompt: true
          })
        })

        if (response.ok) {
          const data: any = await response.json()
          results.push({
            source: 'exa',
            citations: data.results?.map((r: any) => ({
              url: r.url,
              title: r.title,
              snippet: r.highlights?.[0] || r.text?.substring(0, 300),
              image: r.image
            })) || []
          })
        }
      } catch (e) {
        console.error('[WikiAction] Exa fetch failed:', e)
      }
    })())
  }

  // Perplexity search
  if (perplexityApiKey) {
    fetchPromises.push((async () => {
      try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [{ role: 'user', content: query }],
            temperature: 0.5,
            max_tokens: 1500,
            return_citations: true
          })
        })

        if (response.ok) {
          const data: any = await response.json()
          results.push({
            source: 'perplexity',
            content: data.choices?.[0]?.message?.content || '',
            citations: (data.citations || []).map((url: string, i: number) => ({
              url,
              title: `Source ${i + 1}`
            }))
          })
        }
      } catch (e) {
        console.error('[WikiAction] Perplexity fetch failed:', e)
      }
    })())
  }

  await Promise.all(fetchPromises)

  // Synthesize results
  const allCitations = results.flatMap(r => r.citations || [])
  const keyFacts = results.flatMap(r => {
    if (r.content) return [r.content]
    if (r.citations?.length > 0) {
      return r.citations
        .filter((c: any) => c.snippet)
        .map((c: any) => `${c.title}: ${c.snippet}`)
    }
    return []
  })

  return {
    summary: keyFacts.join('\n\n'),
    citations: allCitations.slice(0, 10),
    keyFacts,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Generate wiki skeleton structure with web context
 */
async function generateSkeletonWithContext(
  query: string,
  webContext: WebContext,
  env: any
): Promise<WikiSkeletonState> {
  // Use process.env for API keys (consistent with other services)
  const apiKey = process.env.GROQ_API_KEY || env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('No API key available for skeleton generation')
  }

  // Build research context for prompt
  let researchContext = ''
  if (webContext.summary || webContext.keyFacts.length) {
    const content = webContext.summary || webContext.keyFacts.slice(0, 5).join('\n')
    researchContext = `\n\nWEB RESEARCH SUMMARY (use this to inform section topics and key facts):\n${content.substring(0, 2500)}\n\nCreate sections that align with topics covered in the research above.`
  }

  const prompt = `Create a wiki article outline for: "${query}"${researchContext}

Return ONLY valid JSON with this structure:
{
"title": "Proper encyclopedic title",
"subtitle": "Brief description",
"summary": "1-2 sentence overview",
"infobox": {
  "facts": [
    { "label": "Key Attribute 1", "value": "Specific value" },
    { "label": "Key Attribute 2", "value": "Specific value" },
    { "label": "Key Attribute 3", "value": "Specific value" },
    { "label": "Key Attribute 4", "value": "Specific value" },
    { "label": "Key Attribute 5", "value": "Specific value" }
  ]
},
"sections": [{ "id": "section1", "heading": "Section Title" }],
"relatedTopics": ["Related 1", "Related 2", "Related 3"],
"categories": ["Category 1", "Category 2"]
}

Requirements: 6-8 main sections with Wikipedia-style headings. Include 5-8 key facts in the infobox based on the research provided.`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a content structure expert. Generate ONLY the requested structure as JSON. Be concise.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1200,
      temperature: 0.3
    })
  })

  if (!response.ok) {
    throw new Error(`Skeleton generation failed: ${response.status}`)
  }

  const data: any = await response.json()
  const content = data.choices[0].message.content

  // Parse JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in skeleton response')
  }

  const parsed = JSON.parse(jsonMatch[0])

  // Build skeleton surface state
  const metadata: WikiMetadata = {
    type: 'wiki',
    title: parsed.title || query,
    summary: parsed.summary || '',
    infobox: {
      facts: parsed.infobox?.facts || []
    },
    sections: (parsed.sections || []).map((s: any, i: number) => ({
      id: s.id || `section${i + 1}`,
      heading: s.heading || `Section ${i + 1}`,
      content: '',  // Will be filled by section generation
      status: 'pending' as const
    })),
    relatedTopics: parsed.relatedTopics || [],
    references: [],  // Will be populated from citations
    categories: parsed.categories || ['General'],
    lastUpdated: new Date().toISOString()
  }

  return {
    surfaceType: 'wiki',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isSkeleton: true
  }
}

// =============================================================================
// SECTION GENERATION
// =============================================================================

/**
 * Generate a single wiki section with sources from web context
 */
export async function generateWikiSection(
  sectionId: string,
  sectionHeading: string,
  skeletonTitle: string,
  allSections: Array<{ id: string; heading: string }>,
  query: string,
  webContext: WebContext
): Promise<WikiSectionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { status: 'error', content: '', error: 'Unauthorized' }
  }

  try {
    const { env } = getCloudflareContext()
    // Use process.env for API keys (consistent with other services)
    const apiKey = process.env.GROQ_API_KEY || env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY
    
    if (!apiKey) {
      return { status: 'error', content: '', error: 'No API key available' }
    }

    // Find relevant citations for this section based on heading
    const relevantCitations = findRelevantCitations(sectionHeading, webContext.citations)
    const relevantFacts = findRelevantFacts(sectionHeading, webContext.keyFacts)

    // Build section-specific research context
    let researchContext = ''
    if (relevantFacts.length > 0) {
      researchContext = `\n\nRELEVANT RESEARCH FOR THIS SECTION:\n${relevantFacts.slice(0, 3).join('\n\n')}`
    }
    if (relevantCitations.length > 0) {
      researchContext += `\n\nAVAILABLE SOURCES:\n${relevantCitations.slice(0, 4).map(c => `- ${c.title}: ${c.snippet || c.url}`).join('\n')}`
    }

    // Build structure context
    const structureContext = allSections.map(s => s.heading).join(', ')

    const prompt = `Write the "${sectionHeading}" section for a Wikipedia-style article about "${skeletonTitle}".

ARTICLE STRUCTURE: ${structureContext}
${researchContext}

REQUIREMENTS:
- Write 2-4 paragraphs of encyclopedic content (150-300 words)
- Use markdown formatting: **bold** for key terms, bullet lists for enumerations
- Maintain neutral, factual tone (no "you" or promotional language)
- Include specific facts and examples where relevant
- Do NOT include the section heading in your response

Return ONLY the section content in markdown format.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { 
            role: 'system', 
            content: 'You are a Wikipedia editor writing authoritative, well-researched encyclopedia content. Write clear, factual prose.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.4
      })
    })

    if (!response.ok) {
      return { status: 'error', content: '', error: `API error: ${response.status}` }
    }

    const data: any = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Extract images from relevant citations
    const images = relevantCitations
      .filter(c => c.image)
      .slice(0, 2)
      .map(c => ({ url: c.image!, title: c.title, sourceUrl: c.url }))

    return {
      status: 'success',
      content: content.trim(),
      citations: relevantCitations.slice(0, 4),
      images
    }
  } catch (error) {
    console.error(`[WikiAction] Section ${sectionId} failed:`, error)
    return { 
      status: 'error', 
      content: '', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Find citations relevant to a section heading
 */
function findRelevantCitations(
  heading: string, 
  citations: WebContext['citations']
): WebContext['citations'] {
  const headingLower = heading.toLowerCase()
  const headingWords = headingLower.split(/\s+/).filter(w => w.length > 3)
  
  return citations.filter(c => {
    const titleLower = c.title.toLowerCase()
    const snippetLower = (c.snippet || '').toLowerCase()
    
    // Check if any significant heading word appears in title or snippet
    return headingWords.some(word => 
      titleLower.includes(word) || snippetLower.includes(word)
    )
  })
}

/**
 * Find facts relevant to a section heading
 */
function findRelevantFacts(heading: string, facts: string[]): string[] {
  const headingLower = heading.toLowerCase()
  const headingWords = headingLower.split(/\s+/).filter(w => w.length > 3)
  
  return facts.filter(fact => {
    const factLower = fact.toLowerCase()
    return headingWords.some(word => factLower.includes(word))
  })
}

// =============================================================================
// SAVE AND CREDIT
// =============================================================================

/**
 * Save completed wiki surface and deduct credit
 */
export async function saveWikiSurface(
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
  const surfaceId = `wiki-${Date.now()}`
  
  // Enrich state
  const enrichedState = {
    ...surfaceState,
    id: surfaceId,
    savedAt: Date.now(),
    isSkeleton: false
  }

  // Get existing states
  const existingStates = conversation.surfaceStates || {}
  const existingWiki = existingStates.wiki

  let updatedArray: any[]
  if (Array.isArray(existingWiki)) {
    updatedArray = [...existingWiki, enrichedState].slice(-10)
  } else if (existingWiki && typeof existingWiki === 'object') {
    updatedArray = [existingWiki, enrichedState]
  } else {
    updatedArray = [enrichedState]
  }

  // Update conversation
  await cloudDb.updateConversation(conversationId, {
    surfaceStates: {
      ...existingStates,
      wiki: updatedArray
    }
  })

  // Deduct credit
  await cloudDb.updateCredits(userId, -1)
  console.log(`[WikiAction] Saved wiki ${surfaceId}, deducted 1 credit from ${userId}`)

  return { success: true, surfaceId }
}

/**
 * Retry a failed section
 */
export async function retryWikiSection(
  sectionId: string,
  sectionHeading: string,
  skeletonTitle: string,
  allSections: Array<{ id: string; heading: string }>,
  query: string,
  webContext: WebContext
): Promise<WikiSectionResult> {
  // Just re-call generateWikiSection with same params
  return generateWikiSection(
    sectionId,
    sectionHeading,
    skeletonTitle,
    allSections,
    query,
    webContext
  )
}
