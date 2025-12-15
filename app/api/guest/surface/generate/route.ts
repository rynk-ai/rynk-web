/**
 * Guest Surface Generate API
 * 
 * Guest-accessible endpoint for wiki and quiz surface generation.
 * Uses guest authentication and credit system.
 * 
 * POST /api/guest/surface/generate
 * 
 * Allowed surface types: wiki, quiz only
 * Other surface types return 403 with upgrade prompt
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/services/ai-factory'
import type { SurfaceType, SurfaceState, QuizMetadata, WikiMetadata } from '@/lib/services/domain-types'
import { analyzeSurfaceQuery, SurfaceAnalysis } from '@/lib/services/surfaces/surface-intent-analyzer'
import { SourceOrchestrator } from '@/lib/services/agentic/source-orchestrator'
import type { SourceResult } from '@/lib/services/agentic/types'
import {
  getOrCreateGuestSession,
  getGuestIdFromRequest,
  checkGuestCredits,
  decrementGuestCredits,
} from '@/lib/guest'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Only these surface types are allowed for guests
const GUEST_ALLOWED_SURFACES: SurfaceType[] = ['wiki', 'quiz']

interface GenerateRequest {
  query: string
  surfaceType: SurfaceType
  messageId: string
  conversationId?: string
}

interface WebContext {
  summary: string
  citations: Array<{
    url: string
    title: string
    snippet?: string
  }>
  keyFacts: string[]
  lastUpdated: string
}

export async function POST(request: NextRequest) {
  try {
    // Guest auth check
    const guestId = getGuestIdFromRequest(request)
    if (!guestId) {
      return NextResponse.json(
        { error: 'Guest ID required', message: 'Please start a guest session first.' },
        { status: 401 }
      )
    }

    const { env } = getCloudflareContext()
    
    // Get or create guest session
    const guestSession = await getOrCreateGuestSession(env.DB, request)
    if (!guestSession) {
      return NextResponse.json(
        { error: 'Failed to create guest session' },
        { status: 500 }
      )
    }

    // Check guest credits
    const { hasCredits, remaining } = await checkGuestCredits(env.DB, guestId)
    if (!hasCredits) {
      return NextResponse.json(
        { 
          error: 'No credits remaining', 
          message: 'Sign up for a free account to continue using surfaces.',
          creditsRemaining: 0
        },
        { status: 402 }
      )
    }

    const body = await request.json() as GenerateRequest
    const { query, surfaceType, messageId } = body

    if (!query || !surfaceType || !messageId) {
      return NextResponse.json(
        { error: 'query, surfaceType, and messageId are required' },
        { status: 400 }
      )
    }

    // Skip generation for chat (default) - no credit deduction
    if (surfaceType === 'chat') {
      return NextResponse.json({
        success: true,
        surfaceState: {
          surfaceType: 'chat',
          metadata: { type: 'chat' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      })
    }

    // Restrict to allowed surface types
    if (!GUEST_ALLOWED_SURFACES.includes(surfaceType)) {
      return NextResponse.json(
        { 
          error: 'Surface type not available for guests',
          message: `Sign in to access ${surfaceType} surfaces. Guests can use Wiki and Quiz surfaces.`,
          allowedTypes: GUEST_ALLOWED_SURFACES
        },
        { status: 403 }
      )
    }

    console.log(`🎯 [guest/surface/generate] Starting ${surfaceType} generation for guest: ${guestId.substring(0, 15)}...`)

    // Deduct credit
    const creditDeducted = await decrementGuestCredits(env.DB, guestId)
    if (!creditDeducted) {
      return NextResponse.json(
        { error: 'Failed to deduct credits', message: 'Please try again.' },
        { status: 500 }
      )
    }

    // Analyze query
    const analysis = await analyzeSurfaceQuery(query, surfaceType)
    console.log(`📊 [guest/surface/generate] Analysis:`, {
      topic: analysis.topic,
      subtopics: analysis.subtopics.length,
      needsWebSearch: analysis.needsWebSearch
    })

    // Fetch web data for wiki surfaces
    let webContext: WebContext | undefined
    if (analysis.needsWebSearch && surfaceType === 'wiki') {
      try {
        console.log(`🔍 [guest/surface/generate] Fetching web data...`)
        const orchestrator = new SourceOrchestrator()
        const results = await orchestrator.executeSourcePlan({
          sources: ['exa', 'perplexity'],
          reasoning: `Enriching ${surfaceType} surface with current information`,
          searchQueries: {
            exa: analysis.suggestedQueries[0] || query,
            perplexity: analysis.suggestedQueries[0] || query
          },
          expectedType: 'deep_research'
        })
        webContext = synthesizeWebResults(results)
        console.log(`✅ [guest/surface/generate] Web data fetched: ${webContext.citations.length} citations`)
      } catch (webError) {
        console.warn('⚠️ [guest/surface/generate] Web search failed, continuing without:', webError)
      }
    }

    const aiProvider = getAIProvider(false)
    let surfaceState: SurfaceState

    if (surfaceType === 'wiki') {
      surfaceState = await generateWikiStructure(aiProvider, query, analysis, webContext)
    } else if (surfaceType === 'quiz') {
      surfaceState = await generateQuizStructure(aiProvider, query, analysis)
    } else {
      // This shouldn't happen due to earlier check, but be safe
      return NextResponse.json(
        { error: `Unsupported surface type: ${surfaceType}` },
        { status: 400 }
      )
    }

    // Add available images if present
    if (webContext && webContext.citations.length > 0) {
      const availableImages = webContext.citations
        .filter((c: any) => c.image)
        .slice(0, 6)
        .map((c: any) => ({
          url: c.image,
          title: c.title,
          sourceUrl: c.url
        }))
      
      if (availableImages.length > 0) {
        surfaceState.availableImages = availableImages
      }
    }

    console.log(`✅ [guest/surface/generate] Success for ${surfaceType}`)

    return NextResponse.json({
      success: true,
      surfaceState,
      creditsRemaining: remaining - 1
    })

  } catch (error) {
    console.error('❌ [api/guest/surface/generate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate surface', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Synthesize web search results into a usable context
 */
function synthesizeWebResults(results: SourceResult[]): WebContext {
  const citations: WebContext['citations'] = []
  const keyFacts: string[] = []
  
  for (const result of results) {
    if (result.error) continue
    
    if (result.citations) {
      citations.push(...result.citations.slice(0, 4).map(c => ({
        url: c.url,
        title: c.title,
        snippet: c.snippet
      })))
    }
    
    if (result.source === 'perplexity' && result.data) {
      keyFacts.push(String(result.data).substring(0, 2000))
    }
    
    if (result.source === 'exa' && Array.isArray(result.data)) {
      for (const item of result.data.slice(0, 3)) {
        if (item.highlights?.[0]) {
          keyFacts.push(item.highlights[0])
        } else if (item.text) {
          keyFacts.push(item.text.substring(0, 500))
        }
      }
    }
  }
  
  return {
    summary: keyFacts.join('\n\n'),
    citations: citations.slice(0, 8),
    keyFacts,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Generate Wiki structure
 */
async function generateWikiStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  webContext?: WebContext
): Promise<SurfaceState> {
  let webResearchContext = ''
  if (webContext && webContext.keyFacts.length > 0) {
    webResearchContext = `

CURRENT RESEARCH DATA (use for accuracy):
${webContext.summary.substring(0, 3000)}

SOURCES:
${webContext.citations.map((c, i) => `${i + 1}. ${c.title} - ${c.url}`).join('\n')}
`
  }

  const topicContext = analysis ? `
TOPIC ANALYSIS:
- Main topic: ${analysis.topic}
- Subtopics: ${analysis.subtopics.join(', ')}
- Depth: ${analysis.depth}
` : ''

  const prompt = `You are a master encyclopedia editor creating a comprehensive wiki article.

TOPIC: "${query}"
${topicContext}
${webResearchContext}

Create a Wikipedia-style article as JSON:
{
  "title": "Clear, encyclopedic title",
  "summary": "1-2 sentence overview",
  "infobox": {
    "facts": [
      { "label": "Key Fact 1", "value": "Value" },
      { "label": "Key Fact 2", "value": "Value" }
    ]
  },
  "sections": [
    {
      "id": "sec1",
      "heading": "Section Title",
      "content": "Detailed markdown content (2-4 paragraphs)"
    }
  ],
  "relatedTopics": ["Topic 1", "Topic 2"],
  "references": [
    { "id": "ref1", "title": "Source Title", "url": "https://..." }
  ],
  "categories": ["Category 1", "Category 2"]
}

Requirements:
- 4-6 comprehensive sections
- Each section: 2-4 paragraphs of detailed content
- Include 4-6 infobox facts
- Reference real sources if available
- Use markdown formatting in content

Return ONLY valid JSON.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a world-class encyclopedia editor. Create comprehensive, accurate, well-structured wiki articles.' },
      { role: 'user', content: prompt }
    ]
  })

  let content = ''
  for await (const chunk of response) {
    content += chunk
  }

  let structure: any
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      structure = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found')
    }
  } catch (e) {
    console.error('Failed to parse wiki structure:', e)
    structure = {
      title: query,
      summary: 'Information about ' + query,
      infobox: { facts: [] },
      sections: [
        { id: 'sec1', heading: 'Overview', content: 'Content about ' + query }
      ],
      relatedTopics: [],
      references: [],
      categories: []
    }
  }

  const metadata: WikiMetadata = {
    type: 'wiki',
    title: structure.title || query,
    summary: structure.summary || '',
    infobox: structure.infobox || { facts: [] },
    sections: (structure.sections || []).map((s: any, i: number) => ({
      id: s.id || `sec${i + 1}`,
      heading: s.heading || `Section ${i + 1}`,
      content: s.content || '',
      subsections: s.subsections || []
    })),
    relatedTopics: structure.relatedTopics || [],
    references: (structure.references || []).map((r: any, i: number) => ({
      id: r.id || `ref${i + 1}`,
      title: r.title || 'Source',
      url: r.url
    })),
    categories: structure.categories || [],
    lastUpdated: new Date().toISOString()
  }

  return {
    surfaceType: 'wiki',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

/**
 * Generate Quiz structure
 */
async function generateQuizStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis
): Promise<SurfaceState> {
  const prompt = `You are an expert educator creating an engaging quiz.

TOPIC: "${query}"

Create a quiz as JSON:
{
  "topic": "Quiz topic",
  "description": "Brief description of what this quiz covers",
  "questionCount": 8,
  "difficulty": "easy|medium|hard",
  "format": "mixed",
  "questions": [
    {
      "id": "q1",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Requirements:
- Create 8-10 questions
- Mix of difficulty levels
- Clear explanations for learning
- Options should be plausible but with one clearly correct answer
- correctAnswer is the 0-indexed position of the correct option

Return ONLY valid JSON.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are an expert educator who creates engaging, educational quizzes. Questions should test understanding, not just recall.' },
      { role: 'user', content: prompt }
    ]
  })

  let content = ''
  for await (const chunk of response) {
    content += chunk
  }

  let structure: any
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      structure = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found')
    }
  } catch (e) {
    console.error('Failed to parse quiz structure:', e)
    structure = {
      topic: query,
      description: 'Test your knowledge',
      questionCount: 5,
      difficulty: 'medium',
      format: 'multiple-choice',
      questions: [
        {
          id: 'q1',
          question: `What is a key concept in ${query}?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'This is the correct answer.'
        }
      ]
    }
  }

  const metadata: QuizMetadata = {
    type: 'quiz',
    topic: structure.topic || query,
    description: structure.description || '',
    questionCount: structure.questions?.length || structure.questionCount || 5,
    difficulty: structure.difficulty || 'medium',
    format: structure.format || 'multiple-choice',
    questions: (structure.questions || []).map((q: any, i: number) => ({
      id: q.id || `q${i + 1}`,
      question: q.question || `Question ${i + 1}`,
      options: q.options || [],
      correctAnswer: q.correctAnswer ?? 0,
      explanation: q.explanation || ''
    }))
  }

  return {
    surfaceType: 'quiz',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    quiz: {
      currentQuestion: 0,
      answers: {},
      correctCount: 0,
      incorrectCount: 0,
      completed: false,
      startedAt: Date.now()
    }
  }
}
