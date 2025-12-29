/**
 * Mobile Surface Generate API
 * 
 * Generates the initial structure for a surface (chapters for learning, steps for guide, questions for quiz).
 * POST /api/mobile/surface/generate
 * 
 * MIRRORS /api/surface/generate but uses Mobile Token Auth
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getAIProvider } from '@/lib/services/ai-factory'
import { cloudDb } from '@/lib/services/cloud-db'
import type { SurfaceType, SurfaceState, LearningMetadata, GuideMetadata, QuizMetadata, ComparisonMetadata, FlashcardMetadata, TimelineMetadata, WikiMetadata } from '@/lib/services/domain-types'
import { analyzeSurfaceQuery, SurfaceAnalysis } from '@/lib/services/surfaces/surface-intent-analyzer'
import { SourceOrchestrator } from '@/lib/services/agentic/source-orchestrator'
import type { SourceResult } from '@/lib/services/agentic/types'

interface GenerateRequest {
  query: string           // Original user question
  surfaceType: SurfaceType
  messageId: string       // Message to attach surface to
  conversationId?: string // Optional - provides conversation context for personalization
}

interface ConversationContext {
  summary: string         // Synthesized context from conversation
  keyTopics: string[]     // Main topics discussed
  userPreferences: string // Any stated preferences
  referencedContent: string // Context from referenced convos/folders
}


interface WebContext {
  summary: string           // Synthesized key information
  citations: Array<{
    url: string
    title: string
    snippet?: string
  }>
  keyFacts: string[]
  lastUpdated: string
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7);
  const { env } = getCloudflareContext();
  const db = env.DB;
  
  const session = await db.prepare(
    'SELECT * FROM mobile_sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first();
  
  if (!session) return null;
  
  const user = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(session.user_id).first();
  
  return user;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check (Mobile Token)
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Credit check
    const credits = await cloudDb.getUserCredits(user.id as string)
    if (credits <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits', message: 'Please subscribe to continue using surfaces.' },
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

    // Skip generation for chat (it's the default) - no credit deduction
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

    // Finance surface doesn't need LLM generation - it fetches live API data client-side
    if (surfaceType === 'finance') {
      console.log(`🎯 [mobile/surface/generate] Finance surface - generating comprehensive analysis`)
      
      // Deduct credit for finance surface
      await cloudDb.updateCredits(user.id as string, -1)
      
      try {
        const { generateFinanceSurface } = await import('@/lib/services/finance/generator')
        const surfaceState = await generateFinanceSurface(query, body.conversationId)
        
        return NextResponse.json({
          success: true,
          surfaceState,
        })
      } catch (financeError) {
        console.error('[mobile/surface/generate] Finance generation failed:', financeError)
        // Fallback to basic state
        return NextResponse.json({
          success: true,
          surfaceState: {
            surfaceType: 'finance',
            metadata: { 
              type: 'finance',
              query,
              generatedAt: Date.now(),
              asset: { symbol: 'MARKET', name: 'Market Overview', type: 'index' },
              liveData: { price: 0, change24h: 0, changePercent24h: 0, high24h: 0, low24h: 0, volume: 0, marketCap: 0, lastUpdated: new Date().toISOString() },
              summary: { headline: 'Analysis unavailable', analysis: 'Please try again.', sentiment: 'neutral' },
              fundamentals: { available: false, verdict: 'fairly-valued', metrics: [], analysis: '' },
              technicals: { trend: 'sideways', support: [], resistance: [], indicators: [], patterns: [], analysis: '' },
              cycles: { phase: 'accumulation', sentiment: 50, sentimentLabel: 'Neutral', macroContext: '' },
              research: { thesis: { bull: [], bear: [] }, risks: [], catalysts: [], comparables: [] },
              news: { headlines: [], summary: '' },
              isGeneric: true,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        })
      }
    }

    // Research surface - uses DO for progressive generation (3 credits)
    // Special handling to deduct 3 credits instead of 1
    if (surfaceType === 'research') {
      console.log(`🔬 [mobile/surface/generate] Research surface - routing to DO for progressive generation: "${query.substring(0, 50)}..."`)
      
      try {
        const { getCloudflareContext } = await import('@opennextjs/cloudflare')
        const { env } = getCloudflareContext()
        
        if (env.TASK_PROCESSOR) {
          // Deduct 3 credits for research (more resource-intensive)
          await cloudDb.updateCredits(user.id as string, -3)
          
          const doId = env.TASK_PROCESSOR.idFromName('global')
          const stub = env.TASK_PROCESSOR.get(doId)
          
          const response = await stub.fetch('http://do/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'surface_generate',
              params: {
                query,
                surfaceType,
                messageId,
                conversationId: body.conversationId
              },
              userId: user.id
            })
          })
          
          const jobData = await response.json() as { jobId: string }
          console.log(`🔬 [research] Async job queued: ${jobData.jobId}`)
          
          return NextResponse.json({
            success: true,
            async: true,
            jobId: jobData.jobId
          })
        }
      } catch (doError) {
        console.error('[research] DO routing failed, will use sync fallback:', doError)
        // Fall through to sync route below
      }
    }

    // Check if async processing via Durable Objects is enabled
    // Set to true to use DO for all surface generation, false for sync fallback
    const ASYNC_ENABLED = true // Full sync route prompts ported to DO
    
    if (ASYNC_ENABLED) {
      try {
        // Try to use Durable Object for async processing
        const { getCloudflareContext } = await import('@opennextjs/cloudflare')
        const { env } = getCloudflareContext()
        
        if (env.TASK_PROCESSOR) {
          console.log(`🚀 [mobile/surface/generate] Queuing async job for ${surfaceType}: "${query.substring(0, 50)}..."`)
          
          // Deduct credit immediately
          await cloudDb.updateCredits(user.id as string, -1)
          
          // Get the Durable Object stub
          const doId = env.TASK_PROCESSOR.idFromName('global')
          const stub = env.TASK_PROCESSOR.get(doId)
          
          // Queue the job
          const response = await stub.fetch('http://do/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'surface_generate',
              params: {
                query,
                surfaceType,
                messageId,
                conversationId: body.conversationId
              },
              userId: user.id
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json() as { error?: string }
            throw new Error(errorData.error || 'Failed to queue job')
          }
          
          const { jobId } = await response.json() as { jobId: string }
          
          console.log(`✅ [mobile/surface/generate] Job queued: ${jobId}`)
          
          // Return async response with job ID for polling
          return NextResponse.json({
            success: true,
            async: true,
            jobId,
            pollUrl: `/api/jobs/${jobId}`,
            message: 'Surface generation started. Poll the jobId for completion.'
          })
        }
      } catch (doError) {
        console.warn('⚠️ [mobile/surface/generate] Durable Object not available, falling back to sync:', doError)
        // Fall through to sync processing
      }
    }

    // === SYNC FALLBACK ===
    // Used when DO is not available or ASYNC_ENABLED is false
    console.log(`🎯 [mobile/surface/generate] Starting SYNC ${surfaceType} generation for: "${query.substring(0, 50)}..."`)
    
    // Deduct credit for surface generation
    await cloudDb.updateCredits(user.id as string, -1)

    // Step 1: Analyze the query for better understanding
    const analysis = await analyzeSurfaceQuery(query, surfaceType)
    console.log(`📊 [mobile/surface/generate] Analysis:`, {
      topic: analysis.topic,
      subtopics: analysis.subtopics.length,
      needsWebSearch: analysis.needsWebSearch,
      depth: analysis.depth
    })

    // Step 2: Build conversation context (if conversationId provided)
    let conversationContext: ConversationContext | undefined
    const { conversationId } = body
    if (conversationId) {
      try {
        console.log(`📚 [mobile/surface/generate] Building conversation context from: ${conversationId}`)
        conversationContext = await buildSurfaceContext(conversationId)
        console.log(`✅ [mobile/surface/generate] Context built:`, {
          keyTopics: conversationContext.keyTopics.length,
          hasPreferences: !!conversationContext.userPreferences,
          hasReferencedContent: !!conversationContext.referencedContent
        })
      } catch (contextError) {
        console.warn('⚠️ [mobile/surface/generate] Failed to build context, continuing without:', contextError)
        // Continue without context - graceful degradation
      }
    }

    // Step 3: Fetch web data for wiki/guide/comparison surfaces if beneficial
    let webContext: WebContext | undefined
    if (analysis.needsWebSearch && ['wiki', 'guide', 'comparison'].includes(surfaceType)) {
      try {
        console.log(`🔍 [mobile/surface/generate] Fetching web data...`)
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
        console.log(`✅ [mobile/surface/generate] Web data fetched: ${webContext.citations.length} citations`)
      } catch (webError) {
        console.warn('⚠️ [mobile/surface/generate] Web search failed, continuing without:', webError)
        // Continue without web data - graceful degradation
      }
    }

    const aiProvider = getAIProvider(false)
    let surfaceState: SurfaceState

    if (surfaceType === 'learning') {
      surfaceState = await generateLearningStructure(aiProvider, query, analysis, conversationContext)
    } else if (surfaceType === 'guide') {
      surfaceState = await generateGuideStructure(aiProvider, query, analysis, webContext, conversationContext)
    } else if (surfaceType === 'quiz') {
      surfaceState = await generateQuizStructure(aiProvider, query, analysis, conversationContext)
    } else if (surfaceType === 'comparison') {
      surfaceState = await generateComparisonStructure(aiProvider, query, analysis, conversationContext)
    } else if (surfaceType === 'flashcard') {
      surfaceState = await generateFlashcardStructure(aiProvider, query, analysis, conversationContext)
    } else if (surfaceType === 'timeline') {
      surfaceState = await generateTimelineStructure(aiProvider, query, analysis, conversationContext)
    } else if (surfaceType === 'wiki') {
      surfaceState = await generateWikiStructure(aiProvider, query, analysis, webContext, conversationContext)

    } else {
      return NextResponse.json(
        { error: `Unsupported surface type: ${surfaceType}` },
        { status: 400 }
      )
    }

    // Store available images from web context for hero display and inline embedding
    if (webContext && webContext.citations.length > 0) {
      const availableImages = webContext.citations
        .filter((c: any) => c.image)
        .slice(0, 6)  // Limit to 6 images
        .map((c: any) => ({
          url: c.image,
          title: c.title,
          sourceUrl: c.url
        }))
      
      if (availableImages.length > 0) {
        surfaceState.availableImages = availableImages
      }
    }

    return NextResponse.json({
      success: true,
      surfaceState,
    })

  } catch (error) {
    console.error('❌ [api/mobile/surface/generate] Error:', error)
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
    
    // Collect citations
    if (result.citations) {
      citations.push(...result.citations.slice(0, 4).map(c => ({
        url: c.url,
        title: c.title,
        snippet: c.snippet
      })))
    }
    
    // Extract key content from Perplexity (it provides synthesized answers)
    if (result.source === 'perplexity' && result.data) {
      keyFacts.push(String(result.data).substring(0, 2000))
    }
    
    // Extract highlights from Exa - use full text content for comprehensive context
    if (result.source === 'exa' && Array.isArray(result.data)) {
      for (const item of result.data.slice(0, 3)) {
        // Prioritize full text content over highlights
        if (item.text) {
          keyFacts.push(item.text.substring(0, 1500))
        } else if (item.highlights?.length > 0) {
          keyFacts.push(item.highlights.slice(0, 3).join('\n'))
        }
      }
    }
  }
  
  return {
    summary: keyFacts.join('\n\n'),
    citations: citations.slice(0, 8), // Limit to 8 citations
    keyFacts,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Build context from an existing conversation to personalize surface generation.
 * Extracts key topics, user preferences, and referenced content.
 */
async function buildSurfaceContext(conversationId: string): Promise<ConversationContext> {
  // Fetch recent messages from the conversation
  const { messages } = await cloudDb.getMessages(conversationId, 20)
  
  if (!messages || messages.length === 0) {
    return {
      summary: '',
      keyTopics: [],
      userPreferences: '',
      referencedContent: ''
    }
  }
  
  // Extract user queries and assistant responses
  const userQueries: string[] = []
  const assistantPoints: string[] = []
  let referencedConversations: any[] = []
  let referencedFolders: any[] = []
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      userQueries.push(msg.content.slice(0, 300))
      // Get referenced content from user messages
      if (msg.referencedConversations?.length) {
        referencedConversations = msg.referencedConversations
      }
      if (msg.referencedFolders?.length) {
        referencedFolders = msg.referencedFolders
      }
    } else if (msg.role === 'assistant') {
      // Extract key points from assistant responses (first 200 chars as summary)
      assistantPoints.push(msg.content.slice(0, 200))
    }
  }
  
  // Build referenced content context
  let referencedContent = ''
  
  // Fetch context from referenced conversations
  if (referencedConversations.length > 0) {
    for (const ref of referencedConversations.slice(0, 3)) {
      try {
        const { messages: refMsgs } = await cloudDb.getMessages(ref.id, 5)
        if (refMsgs?.length > 0) {
          referencedContent += `\n--- From conversation "${ref.title}" ---\n`
          for (const m of refMsgs.slice(0, 3)) {
            if (m.role === 'user' || m.role === 'assistant') {
              referencedContent += `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.slice(0, 150)}\n`
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch referenced conversation ${ref.id}:`, e)
      }
    }
  }
  
  // Fetch context from referenced folders
  if (referencedFolders.length > 0) {
    for (const folderRef of referencedFolders.slice(0, 2)) {
      try {
        const folder = await cloudDb.getFolder(folderRef.id)
        if (folder && folder.conversationIds && folder.conversationIds.length > 0) {
          referencedContent += `\n--- From folder "${folder.name}" ---\n`
          // Get messages from first 2 conversations in folder
          for (const convId of folder.conversationIds.slice(0, 2)) {
            const { messages: folderMsgs } = await cloudDb.getMessages(convId, 3)
            for (const m of folderMsgs?.slice(0, 2) || []) {
              if (m.role === 'user' || m.role === 'assistant') {
                referencedContent += `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.slice(0, 100)}\n`
              }
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch folder ${folderRef.id}:`, e)
      }
    }
  }
  
  // Extract user preferences (look for patterns like "I prefer", "I want", "I like")
  const preferencePatterns = /\b(i prefer|i want|i like|i need|focus on|emphasize|don't include|skip|avoid)\b[^.!?]*/gi
  const preferences: string[] = []
  for (const query of userQueries) {
    const matches = query.match(preferencePatterns)
    if (matches) {
      preferences.push(...matches)
    }
  }
  
  // Build summary from conversation
  const summary = [
    userQueries.length > 0 ? `User discussed: ${userQueries.slice(0, 5).join(' | ')}` : '',
    assistantPoints.length > 0 ? `Key points covered: ${assistantPoints.slice(0, 3).join(' | ')}` : ''
  ].filter(Boolean).join('\n')
  
  // Extract key topics from user queries
  const keyTopics = extractKeyTopics(userQueries)
  
  return {
    summary,
    keyTopics,
    userPreferences: preferences.join('. '),
    referencedContent
  }
}

/**
 * Extract key topics from user queries using simple heuristics
 */
function extractKeyTopics(queries: string[]): string[] {
  const topics = new Set<string>()
  
  // Common topic indicators
  const topicPatterns = [
    /(?:about|regarding|on|learn|understand|explain)\s+([a-zA-Z0-9\s]{3,30})/gi,
    /(?:how to|what is|what are)\s+([a-zA-Z0-9\s]{3,30})/gi
  ]
  
  for (const query of queries) {
    for (const pattern of topicPatterns) {
      const matches = [...query.matchAll(pattern)]
      for (const match of matches) {
        if (match[1]) {
          topics.add(match[1].trim().toLowerCase())
        }
      }
    }
  }
  
  return Array.from(topics).slice(0, 5)
}

/**
 * Format conversation context for injection into AI prompts
 */
function formatContextForPrompt(context: ConversationContext | undefined): string {
  if (!context || (!context.summary && !context.userPreferences && !context.referencedContent)) {
    return ''
  }
  
  let formatted = '\n\nCONVERSATION CONTEXT (use this to personalize the content):\n'
  
  if (context.summary) {
    formatted += `\nConversation Background:\n${context.summary}\n`
  }
  
  if (context.keyTopics.length > 0) {
    formatted += `\nKey Topics Discussed: ${context.keyTopics.join(', ')}\n`
  }
  
  if (context.userPreferences) {
    formatted += `\nUser Preferences: ${context.userPreferences}\n`
  }
  
  if (context.referencedContent) {
    formatted += `\nReferenced Context:\n${context.referencedContent.slice(0, 1500)}\n`
  }
  
  formatted += '\nUse this context to make the content more relevant and tailored to the user\'s needs.\n'
  
  return formatted
}

async function generateLearningStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  conversationContext?: ConversationContext
): Promise<SurfaceState> {
  // Format context for injection
  const contextSection = formatContextForPrompt(conversationContext)
  
  const prompt = `You are a world-renowned professor creating a university-level course curriculum.

SUBJECT: "${query}"
${contextSection}
Create an EXHAUSTIVE, COMPREHENSIVE course that would satisfy a serious student wanting to master this topic. Think: What would a $2000 online course or a university semester cover?

Generate the course structure as JSON:
{
  "title": "Professional, compelling course title",
  "subtitle": "Clarifying subtitle that sets expectations",
  "description": "2-3 sentences: What mastery looks like after completion. Be specific about skills gained.",
  "depth": "basic|intermediate|advanced|expert",
  "estimatedTime": <total minutes - be generous, real learning takes time>,
  "prerequisites": ["Specific prior knowledge required - be honest about requirements"],
  "targetAudience": "Detailed description of ideal learner and their goals",
  "learningOutcomes": [
    "Specific, measurable outcome 1 (use action verbs: build, analyze, create, evaluate)",
    "Specific, measurable outcome 2",
    "Specific, measurable outcome 3",
    "Specific, measurable outcome 4",
    "Specific, measurable outcome 5"
  ],
  "courseHighlights": [
    "What makes this course valuable/unique"
  ],
  "chapters": [
    {
      "id": "ch1",
      "title": "Chapter title - be specific and descriptive",
      "description": "2-3 sentences explaining what this chapter covers and why it's essential",
      "estimatedTime": <minutes>,
      "chapterType": "foundation|concept|practical|deep-dive|synthesis|assessment",
      "objectives": [
        "By the end of this chapter, you will be able to...",
        "Second specific objective"
      ],
      "topics": [
        "Key topic 1 covered in this chapter",
        "Key topic 2",
        "Key topic 3"
      ],
      "keyTakeaways": [
        "Most important insight 1",
        "Most important insight 2"
      ],
      "practiceElements": "Brief description of exercises, examples, or hands-on work in this chapter"
    }
  ]
}

CRITICAL REQUIREMENTS:

1. CHAPTER COUNT: Create 8-12 chapters minimum. This is a COMPREHENSIVE course, not a quick overview.

2. CHAPTER STRUCTURE - Include these types:
   - 1-2 FOUNDATION chapters (context, motivation, fundamentals)
   - 3-4 CONCEPT chapters (core theoretical knowledge)
   - 2-3 PRACTICAL chapters (hands-on application, real examples)
   - 1-2 DEEP-DIVE chapters (advanced topics, edge cases)
   - 1 SYNTHESIS chapter (bringing it all together)

3. CONTENT DEPTH:
   - Each chapter should feel like a full lesson, not a bullet point
   - Topics should be specific (not "basics" but "The three fundamental principles of X")
   - Include real-world context and practical applications
   - Reference specific techniques, tools, or methodologies

4. LEARNING DESIGN:
   - Progressive complexity: each chapter builds on the previous
   - Include practice elements: exercises, examples, thought experiments
   - Balance theory and application

5. TIME ESTIMATES:
   - Foundation chapters: 15-25 minutes
   - Concept chapters: 20-40 minutes  
   - Practical chapters: 30-45 minutes
   - Deep-dive: 25-40 minutes
   - Synthesis: 15-25 minutes
   - Total should feel substantial (2-5 hours for a real course)

Return ONLY valid JSON, no markdown or explanation.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a master educator who has taught at top universities and created bestselling courses. Your curricula are known for their depth, clarity, and transformative impact. You never create superficial content - every course you design would be worth paying thousands for. You think like an expert who remembers what it was like to be a beginner.' },
      { role: 'user', content: prompt }
    ]
  })


  let content = ''
  for await (const chunk of response) {
    content += chunk
  }

  // Parse the JSON response
  let structure: any
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      structure = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found in response')
    }
  } catch (e) {
    console.error('Failed to parse learning structure:', e)
    // Fallback structure
    structure = {
      title: `Mastering ${query.slice(0, 40)}`,
      description: 'A comprehensive learning experience',
      depth: 'intermediate',
      estimatedTime: 45,
      prerequisites: [],
      targetAudience: 'Curious learners',
      learningOutcomes: ['Understand core concepts', 'Apply knowledge practically'],
      chapters: [
        { id: 'ch1', title: 'Introduction & Context', description: 'Setting the foundation', estimatedTime: 8, objectives: ['Understand the importance'], keyTakeaways: ['Key concept'] },
        { id: 'ch2', title: 'Core Concepts', description: 'Essential building blocks', estimatedTime: 12, objectives: ['Master fundamentals'], keyTakeaways: ['Key concept'] },
        { id: 'ch3', title: 'Practical Application', description: 'Putting knowledge to work', estimatedTime: 15, objectives: ['Apply concepts'], keyTakeaways: ['Key concept'] },
        { id: 'ch4', title: 'Advanced Techniques', description: 'Going deeper', estimatedTime: 10, objectives: ['Level up skills'], keyTakeaways: ['Key concept'] },
        { id: 'ch5', title: 'Summary & Next Steps', description: 'Consolidation and growth paths', estimatedTime: 5, objectives: ['Synthesize learning'], keyTakeaways: ['Key concept'] },
      ]
    }
  }

  const metadata: LearningMetadata = {
    type: 'learning',
    title: structure.title || 'Course',
    description: structure.description || '',
    depth: structure.depth || 'intermediate',
    estimatedTime: structure.estimatedTime || 45,
    prerequisites: structure.prerequisites || [],
    chapters: (structure.chapters || []).map((ch: any, i: number) => ({
      id: ch.id || `ch${i + 1}`,
      title: ch.title || `Chapter ${i + 1}`,
      description: ch.description || '',
      estimatedTime: ch.estimatedTime || 8,
      status: 'available' as const,
    })),
  }

  return {
    surfaceType: 'learning',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    learning: {
      currentChapter: 0,
      completedChapters: [],
      chaptersContent: {},
      notes: [],
    },
  }
}

async function generateGuideStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  webContext?: WebContext,
  conversationContext?: ConversationContext
): Promise<SurfaceState> {
  // Format conversation context for injection
  const contextSection = formatContextForPrompt(conversationContext)
  
  // Build context from web search if available
  let webResearchContext = ''
  if (webContext && webContext.keyFacts.length > 0) {
    webResearchContext = `

CURRENT RESEARCH DATA (use this for accuracy):
${webContext.summary.substring(0, 3000)}

AVAILABLE SOURCES (include these as references):
${webContext.citations.map((c, i) => `${i + 1}. ${c.title} - ${c.url}`).join('\n')}
`
  }

  // Use analysis for better topic understanding
  const topicContext = analysis ? `
TOPIC ANALYSIS:
- Main topic: ${analysis.topic}
- Subtopics to cover: ${analysis.subtopics.join(', ')}
- Target audience: ${analysis.audience}
- Depth level: ${analysis.depth}
` : ''

  const prompt = `You are creating a sequential checklist guide for a specific task.

TASK: "${query}"
${topicContext}
${webResearchContext}
${contextSection}

Create a checklist that breaks this task into clear, sequential checkpoints. Each checkpoint is a meaningful milestone with concrete substeps.

Generate the checklist as JSON:
{
  "title": "Clear, action-oriented title",
  "description": "1-2 sentences explaining what this guide accomplishes",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedTime": <total minutes>,
  "checkpoints": [
    {
      "id": "cp1",
      "title": "Action verb checkpoint title (e.g., 'Set up your environment')",
      "description": "1-2 sentences explaining what this checkpoint accomplishes",
      "substeps": [
        "Concrete action 1",
        "Concrete action 2",
        "Concrete action 3"
      ],
      "estimatedTime": <minutes>
    }
  ]
}

REQUIREMENTS:
1. Create as many checkpoints as genuinely needed - do NOT pad or compress artificially
2. Each checkpoint should be a meaningful milestone, not artificially split
3. Substeps should be concrete, actionable items (3-6 per checkpoint)
4. Use strong action verbs: "Install", "Configure", "Create", "Verify", "Test"
5. Order checkpoints sequentially - each builds on the previous
6. Include verification checkpoints where appropriate

Return ONLY valid JSON.`

  const systemPrompt = 'You are a clear, practical guide writer. You break complex tasks into achievable checkpoints. Each checkpoint is a concrete milestone with actionable substeps. You never add filler - every checkpoint serves a purpose.'

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
  })

  let content = ''
  for await (const chunk of response) {
    content += chunk
  }

  // Parse the JSON response
  let structure: any
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      structure = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found in response')
    }
  } catch (e) {
    console.error('Failed to parse guide structure:', e)
    // Fallback
    structure = {
      title: `Guide to ${query}`,
      description: 'Step-by-step instructions',
      difficulty: 'intermediate',
      estimatedTime: 30,
      checkpoints: [
        { id: 'cp1', title: 'Getting Started', description: 'Preparation', substeps: ['Prepare environment'], estimatedTime: 10 },
        { id: 'cp2', title: 'Execution', description: 'Doing the task', substeps: ['Perform step 1', 'Perform step 2'], estimatedTime: 20 }
      ]
    }
  }

  const metadata: GuideMetadata = {
    type: 'guide',
    title: structure.title || 'Guide',
    description: structure.description || '',
    difficulty: structure.difficulty || 'intermediate',
    estimatedTime: structure.estimatedTime || 30,
    checkpoints: (structure.checkpoints || []).map((cp: any, i: number) => ({
      id: cp.id || `cp${i + 1}`,
      title: cp.title || `Step ${i + 1}`,
      description: cp.description || '',
      substeps: (cp.substeps || []).map((s: string, j: number) => ({
        id: `s${i}_${j}`,
        text: s,
        completed: false
      })),
      estimatedTime: cp.estimatedTime || 5,
      completed: false
    })),
  }

  return {
    surfaceType: 'guide',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    guide: {
      currentCheckpoint: 0,
      completedCheckpoints: [],
      checkpointContent: {}
    },
  }
}

async function generateQuizStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  conversationContext?: ConversationContext
): Promise<SurfaceState> {
  const contextSection = formatContextForPrompt(conversationContext)
  
  const prompt = `You are a quiz master creating a knowledge assessment.

TOPIC: "${query}"
${contextSection}

Create a challenging, educational quiz to test understanding of this topic.

Generate as JSON:
{
  "title": "Engaging quiz title",
  "description": "Brief description",
  "difficulty": "easy|medium|hard",
  "questions": [
    {
      "id": "q1",
      "question": "Clear, unambiguous question?",
      "options": [
        "Incorrect option 1",
        "Correct option",
        "Incorrect option 2",
        "Incorrect option 3"
      ],
      "correctAnswer": 1, // Index of correct answer (0-3)
      "explanation": "Why this is the correct answer and others are wrong."
    }
  ]
}

REQUIREMENTS:
1. Create 5-10 questions
2. Ensure only ONE correct answer per question
3. Explanation should be educational (teach, don't just correct)
4. Varied difficulty levels

Return ONLY valid JSON.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are an educational assessment expert.' },
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
    console.error('Failed to parse quiz:', e)
    structure = {
      title: 'Quiz',
      description: 'Test your knowledge',
      difficulty: 'medium',
      questions: [
        { id: 'q1', question: 'What is 2+2?', options: ['3', '4', '5', '6'], correctAnswer: 1, explanation: 'Basic math.' }
      ]
    }
  }

  const metadata: QuizMetadata = {
    type: 'quiz',
    topic: structure.title || query,
    description: structure.description || '',
    difficulty: structure.difficulty || 'medium',
    questionCount: (structure.questions || []).length,
    format: 'multiple-choice',
    questions: (structure.questions || []).map((q: any, i: number) => ({
      id: q.id || `q${i + 1}`,
      question: q.question,
      options: q.options || [],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || ''
    })),
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
    },
  }
}

async function generateComparisonStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  conversationContext?: ConversationContext
): Promise<SurfaceState> {
  const contextSection = formatContextForPrompt(conversationContext)

  const prompt = `create comparison for "${query}"
  JSON format:
  {
    "title": "X vs Y",
    "items": ["Item A", "Item B"],
    "criteria": ["Price", "Features", "Usability"],
    "data": {
      "Item A": { "Price": "$10", "Features": "Good", "Usability": "Easy" },
      "Item B": { "Price": "$20", "Features": "Better", "Usability": "Medium" }
    },
    "verdict": "Item A is better for beginners..."
  }
  ${contextSection}
  `

  const response = await aiProvider.sendMessage({
    messages: [{ role: 'user', content: prompt }]
  })

  let content = ''
  for await (const chunk of response) { content += chunk }
  
  let structure: any
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) structure = JSON.parse(jsonMatch[0])
    else structure = { title: 'Comparison', items: [], criteria: [], data: {}, verdict: '' }
  } catch {
    structure = { title: 'Comparison', items: [], criteria: [], data: {}, verdict: '' }
  }

  const metadata: ComparisonMetadata = {
    type: 'comparison',
    title: structure.title,
    description: 'Comparison analysis',
    items: (structure.items || []).map((item: any) => ({
      id: item.toUpperCase().replace(/\s+/g, '_'),
      name: item,
      description: structure.data?.[item]?.description || '',
      pros: [],
      cons: []
    })),
    criteria: (structure.criteria || []).map((crit: any) => ({
      id: crit.toLowerCase().replace(/\s+/g, '_'),
      name: crit,
      weight: 1
    })),
    verdict: {
      winnerId: '',
      bottomLine: structure.verdict || '',
      confidence: 'medium'
    }
  }

  return {
    surfaceType: 'comparison',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

async function generateFlashcardStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  conversationContext?: ConversationContext
): Promise<SurfaceState> {
  const contextSection = formatContextForPrompt(conversationContext)

  const prompt = `Create flashcards for "${query}".
  JSON:
  {
    "title": "Deck Title",
    "cards": [
      { "front": "Question/Term", "back": "Answer/Definition" }
    ]
  }
  ${contextSection}
  `
  
  const response = await aiProvider.sendMessage({
    messages: [{ role: 'user', content: prompt }]
  })

  let content = ''
  for await (const chunk of response) { content += chunk }

  let structure: any
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) structure = JSON.parse(jsonMatch[0])
    else structure = { title: 'Flashcards', cards: [] }
  } catch {
    structure = { title: 'Flashcards', cards: [] }
  }

  const metadata: FlashcardMetadata = {
    type: 'flashcard',
    topic: structure.title || query,
    description: 'Flashcard deck',
    cardCount: (structure.cards || []).length,
    cards: (structure.cards || []).map((c: any, i: number) => ({
      id: `fc${i}`,
      front: c.front,
      back: c.back,
      difficulty: 'medium'
    }))
  }

  return {
    surfaceType: 'flashcard',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    flashcard: {
      currentCard: 0,
      knownCards: [],
      unknownCards: [],
      completed: false
    }
  }
}

async function generateTimelineStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  conversationContext?: ConversationContext
): Promise<SurfaceState> {
  const contextSection = formatContextForPrompt(conversationContext)

  const prompt = `Create a timeline for "${query}".
  JSON:
  {
    "title": "Timeline Title",
    "events": [
      { "date": "YYYY or range", "title": "Event", "description": "Details" }
    ]
  }
  ${contextSection}
  `

  const response = await aiProvider.sendMessage({
    messages: [{ role: 'user', content: prompt }]
  })

  let content = ''
  for await (const chunk of response) { content += chunk }

  let structure: any
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) structure = JSON.parse(jsonMatch[0])
    else structure = { title: 'Timeline', events: [] }
  } catch {
    structure = { title: 'Timeline', events: [] }
  }

  const metadata: TimelineMetadata = {
    type: 'timeline',
    title: structure.title,
    description: 'Timeline of events',
    events: (structure.events || []).map((e: any, i: number) => ({
      id: `tl${i}`,
      date: e.date,
      title: e.title,
      description: e.description,
      importance: 'moderate'
    }))
  }

  return {
    surfaceType: 'timeline',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

async function generateWikiStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  webContext?: WebContext,
  conversationContext?: ConversationContext
): Promise<SurfaceState> {
  // Format conversation context
  const contextSection = formatContextForPrompt(conversationContext)
  
  // Format web context
  let webResearchContext = ''
  if (webContext && webContext.keyFacts.length > 0) {
    webResearchContext = `
CURRENT RESEARCH DATA:
${webContext.summary.substring(0, 3000)}

SOURCES:
${webContext.citations.map((c, i) => `${i + 1}. ${c.title}`).join('\n')}
`
  }

  const prompt = `Create a Wiki-style article for "${query}".
  
${webResearchContext}
${contextSection}

  JSON format:
  {
    "title": "Article Title",
    "summary": "Brief lead paragraph (2-3 sentences)",
    "sections": [
      { "title": "Section Header", "content": "Detailed markdown content for this section." }
    ],
    "infobox": [
      { "label": "Key", "value": "Value" }
    ],
    "relatedTopics": [
      { "title": "Related Topic 1", "type": "wiki" }
    ]
  }
  
  REQUIREMENTS:
  1. Write in objective, encyclopedic tone
  2. Use markdown for section content
  3. Include 4-6 substantial sections
  4. Create a relevant infobox with 3-5 facts
  `

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are an encyclopedia editor.' },
      { role: 'user', content: prompt }
    ]
  })

  let content = ''
  for await (const chunk of response) { content += chunk }

  let structure: any
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) structure = JSON.parse(jsonMatch[0])
    else structure = { title: query, summary: '', sections: [], infobox: [], relatedTopics: [] }
  } catch {
    structure = { title: query, summary: 'Could not generate wiki.', sections: [], infobox: [], relatedTopics: [] }
  }

  const metadata: WikiMetadata = {
    type: 'wiki',
    title: structure.title,
    summary: structure.summary,
    sections: (structure.sections || []).map((s: any, i: number) => ({
      id: `sec${i}`,
      title: s.title,
      content: s.content
    })),
    infobox: {
      facts: structure.infobox || [],
      image: webContext && webContext.citations.find(c => (c as any).image) ? (webContext.citations.find(c => (c as any).image) as any).image : undefined
    },
    relatedTopics: structure.relatedTopics || [],
    references: [],
    categories: []
  }

  return {
    surfaceType: 'wiki',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}
