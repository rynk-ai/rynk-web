/**
 * Surface Generate API
 * 
 * Generates the initial structure for a surface (chapters for learning, steps for guide, questions for quiz).
 * POST /api/surface/generate
 * 
 * Enhanced with:
 * - Intent analysis for better query understanding
 * - Web search integration for Wiki and Guide surfaces
 * - Conversation context integration for personalized surfaces
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
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

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Credit check
    const credits = await cloudDb.getUserCredits(session.user.id)
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
      console.log(`🎯 [surface/generate] Finance surface - generating comprehensive analysis`)
      
      // Deduct credit for finance surface
      await cloudDb.updateCredits(session.user.id, -1)
      
      try {
        const { generateFinanceSurface } = await import('@/lib/services/finance/generator')
        const surfaceState = await generateFinanceSurface(query, body.conversationId)
        
        return NextResponse.json({
          success: true,
          surfaceState,
        })
      } catch (financeError) {
        console.error('[surface/generate] Finance generation failed:', financeError)
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

    // Check if async processing via Durable Objects is enabled
    // Set to true to use DO for all surface generation, false for sync fallback
    const ASYNC_ENABLED = true // Full sync route prompts ported to DO
    
    if (ASYNC_ENABLED) {
      try {
        // Try to use Durable Object for async processing
        const { getCloudflareContext } = await import('@opennextjs/cloudflare')
        const { env } = getCloudflareContext()
        
        if (env.TASK_PROCESSOR) {
          console.log(`🚀 [surface/generate] Queuing async job for ${surfaceType}: "${query.substring(0, 50)}..."`)
          
          // Deduct credit immediately
          await cloudDb.updateCredits(session.user.id, -1)
          
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
              userId: session.user.id
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json() as { error?: string }
            throw new Error(errorData.error || 'Failed to queue job')
          }
          
          const { jobId } = await response.json() as { jobId: string }
          
          console.log(`✅ [surface/generate] Job queued: ${jobId}`)
          
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
        console.warn('⚠️ [surface/generate] Durable Object not available, falling back to sync:', doError)
        // Fall through to sync processing
      }
    }

    // === SYNC FALLBACK ===
    // Used when DO is not available or ASYNC_ENABLED is false
    console.log(`🎯 [surface/generate] Starting SYNC ${surfaceType} generation for: "${query.substring(0, 50)}..."`)
    
    // Deduct credit for surface generation
    await cloudDb.updateCredits(session.user.id, -1)

    // Step 1: Analyze the query for better understanding
    const analysis = await analyzeSurfaceQuery(query, surfaceType)
    console.log(`📊 [surface/generate] Analysis:`, {
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
        console.log(`📚 [surface/generate] Building conversation context from: ${conversationId}`)
        conversationContext = await buildSurfaceContext(conversationId)
        console.log(`✅ [surface/generate] Context built:`, {
          keyTopics: conversationContext.keyTopics.length,
          hasPreferences: !!conversationContext.userPreferences,
          hasReferencedContent: !!conversationContext.referencedContent
        })
      } catch (contextError) {
        console.warn('⚠️ [surface/generate] Failed to build context, continuing without:', contextError)
        // Continue without context - graceful degradation
      }
    }

    // Step 3: Fetch web data for wiki/guide surfaces if beneficial
    let webContext: WebContext | undefined
    if (analysis.needsWebSearch && (surfaceType === 'wiki' || surfaceType === 'guide')) {
      try {
        console.log(`🔍 [surface/generate] Fetching web data...`)
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
        console.log(`✅ [surface/generate] Web data fetched: ${webContext.citations.length} citations`)
      } catch (webError) {
        console.warn('⚠️ [surface/generate] Web search failed, continuing without:', webError)
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

    return NextResponse.json({
      success: true,
      surfaceState,
    })

  } catch (error) {
    console.error('❌ [api/surface/generate] Error:', error)
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
    
    // Extract highlights from Exa
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

  const prompt = `You are a senior technical documentation expert creating the definitive guide for this task.

TASK: "${query}"
${topicContext}
${webResearchContext}
${contextSection}
Create a COMPREHENSIVE, FOOLPROOF guide that someone with zero prior experience can follow to achieve success. Think: What would a professional documentation writer at a top tech company create?

Generate a guide structure as JSON:
{
  "title": "Professional, clear title (e.g., 'Complete Guide to...', 'How to... From Start to Finish')",
  "subtitle": "Clarifying subtitle with scope",
  "description": "2-3 sentences explaining what this guide covers and what success looks like",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedTime": <total minutes - be realistic, include potential troubleshooting time>,
  "prerequisites": [
    "Specific hardware/software requirement 1",
    "Prior knowledge requirement",
    "Account/access requirement"
  ],
  "toolsRequired": [
    "Specific tool 1",
    "Specific tool 2"
  ],
  "outcomes": [
    "Specific outcome 1 - what will be working/completed",
    "Specific outcome 2",
    "Specific outcome 3"
  ],
  "safetyWarnings": ["Any data loss risks or irreversible actions to be aware of"],
  "steps": [
    {
      "index": 0,
      "title": "Clear, specific step title (start with strong action verb)",
      "description": "1-2 sentences explaining what this step accomplishes",
      "estimatedTime": <minutes>,
      "category": "preparation|setup|configuration|action|verification|cleanup|optional",
      "substeps": [
        "Specific substep 1",
        "Specific substep 2"
      ],
      "criticalNotes": ["Important warnings or tips for this step"],
      "successCriteria": "How to know this step was completed correctly"
    }
  ],
  "troubleshooting": [
    {
      "problem": "Common problem description",
      "solution": "How to fix it"
    }
  ],
  "nextSteps": ["What to do after completing this guide"]
}

CRITICAL REQUIREMENTS:

1. STEP COUNT: Create 10-15 steps. This is a COMPLETE guide, not a quick overview.

2. STEP STRUCTURE - Include these types:
   - 1-2 PREPARATION steps (prerequisites check, environment setup)
   - 2-3 SETUP steps (installations, configurations)
   - 5-8 ACTION steps (the main work, broken into manageable chunks)
   - 2-3 VERIFICATION steps (confirm things are working)
   - 1 CLEANUP/FINALIZATION step

3. SUBSTEPS: Each main step should have 2-5 specific substeps that break down the action.

4. SAFETY: Always include warnings for:
   - Data loss risks
   - Breaking changes
   - Irreversible actions
   - Admin/sudo requirements

5. VERIFICATION: After major milestones, include a verification step to confirm progress.

6. TIME ESTIMATES:
   - Preparation: 5-10 minutes
   - Setup: 10-20 minutes per step
   - Action: 5-15 minutes per step
   - Verification: 2-5 minutes
${webContext ? '\n7. USE THE RESEARCH DATA: Incorporate the current information provided above for accuracy.' : ''}
Return ONLY valid JSON, no markdown or explanation.`

  const systemPrompt = webContext 
    ? 'You are a world-class technical documentation writer with access to current research data. Use the provided web search results to ensure your guide is accurate and up-to-date. Your guides are famous for being so clear that anyone can follow them successfully on the first try. You anticipate every possible confusion and address it proactively. You never skip steps or assume prior knowledge.'
    : 'You are a world-class technical documentation writer who has created guides for companies like Google, Apple, and Stripe. Your guides are famous for being so clear that anyone can follow them successfully on the first try. You anticipate every possible confusion and address it proactively. You never skip steps or assume prior knowledge.'

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
    // Fallback structure
    structure = {
      title: `How to ${query.slice(0, 40)}`,
      description: 'Step-by-step instructions to complete this task',
      difficulty: 'intermediate',
      estimatedTime: 20,
      prerequisites: [],
      outcomes: ['Task completed successfully'],
      steps: [
        { index: 0, title: 'Gather prerequisites', estimatedTime: 3, category: 'setup' },
        { index: 1, title: 'Set up your environment', estimatedTime: 5, category: 'setup' },
        { index: 2, title: 'Perform the main task', estimatedTime: 7, category: 'action' },
        { index: 3, title: 'Verify your work', estimatedTime: 3, category: 'verification' },
        { index: 4, title: 'Final cleanup and next steps', estimatedTime: 2, category: 'action' },
      ]
    }
  }

  const metadata: GuideMetadata = {
    type: 'guide',
    title: structure.title || 'Guide',
    description: structure.description || '',
    difficulty: structure.difficulty || 'intermediate',
    estimatedTime: structure.estimatedTime || 15,
    steps: (structure.steps || []).map((step: any, i: number) => ({
      index: i,
      title: step.title || `Step ${i + 1}`,
      estimatedTime: step.estimatedTime || 3,
      status: 'pending' as const,
    })),
  }

  return {
    surfaceType: 'guide',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    guide: {
      currentStep: 0,
      completedSteps: [],
      skippedSteps: [],
      stepsContent: {},
      questionsAsked: [],
    },
  }
}

async function generateQuizStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  conversationContext?: ConversationContext
): Promise<SurfaceState> {
  // Format conversation context for injection
  const contextSection = formatContextForPrompt(conversationContext)

  const prompt = `You are an expert assessment designer creating a comprehensive knowledge test.

TOPIC: "${query}"
${contextSection}
Create a RIGOROUS, COMPREHENSIVE quiz that thoroughly assesses understanding. This should feel like a professional certification exam or university final - not a trivial quiz.

Generate a quiz as JSON:
{
  "topic": "Professional, clear quiz title",
  "description": "What this quiz assesses and what a passing score indicates",
  "difficulty": "easy|medium|hard",
  "format": "multiple-choice",
  "totalPoints": <total points>,
  "passingScore": <minimum to pass - typically 70%>,
  "timeLimit": <suggested minutes>,
  "sections": [
    {
      "name": "Section name (e.g., 'Fundamentals', 'Applied Knowledge')",
      "description": "What this section tests"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "section": "Which section this belongs to",
      "question": "Clear, specific question. For scenario questions, provide detailed context.",
      "questionType": "knowledge|comprehension|application|analysis|evaluation",
      "scenario": "Optional: A real-world scenario or code snippet that sets up the question",
      "options": [
        "Option A - specific, plausible choice",
        "Option B - another plausible choice",
        "Option C - a third option",
        "Option D - fourth option"
      ],
      "correctAnswer": 0,
      "explanation": "THOROUGH explanation: Why this is correct, what principle it demonstrates, and how to think about similar problems",
      "whyOthersWrong": [
        "Why A is wrong (if not correct)",
        "Why B is wrong (if not correct)",
        "Why C is wrong (if not correct)",
        "Why D is wrong (if not correct)"
      ],
      "points": 1,
      "hint": "Helpful hint that guides thinking without giving away the answer",
      "difficulty": "easy|medium|hard",
      "conceptTested": "The specific concept this question tests"
    }
  ]
}

CRITICAL REQUIREMENTS:

1. QUESTION COUNT: Create 15-20 questions minimum. This is a THOROUGH assessment.

2. QUESTION DISTRIBUTION (follow Bloom's Taxonomy):
   - 3-4 Knowledge questions (recall, define, list)
   - 4-5 Comprehension questions (explain, describe, interpret)
   - 4-5 Application questions (apply, demonstrate, use)
   - 3-4 Analysis questions (compare, contrast, analyze)
   - 2-3 Evaluation questions (judge, evaluate, recommend)

3. DIFFICULTY PROGRESSION:
   - First 4-5 questions: Easy (build confidence)
   - Middle 8-10 questions: Medium (core assessment)
   - Final 4-5 questions: Hard (separate masters from learners)

4. QUESTION QUALITY:
   - Use SCENARIOS: "A developer is building..." not just "What is..."
   - Include CODE SNIPPETS for technical topics (use markdown code blocks in the scenario)
   - ALL distractors must be PLAUSIBLE (no joke answers)
   - Each wrong answer should represent a COMMON MISCONCEPTION
   - Explanations should TEACH - if someone gets it wrong, they should learn why

5. AVOID:
   - "All of the above" / "None of the above"
   - Trick questions or gotchas
   - Vague or ambiguous wording
   - Questions that test memorization of trivia

Return ONLY valid JSON, no markdown or explanation.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a world-class assessment designer who has created certification exams for major organizations. Your quizzes are famous for being fair yet rigorous - they truly measure understanding, not just memorization. Every question you write has educational value, and your explanations are so good that even failing the quiz teaches something valuable.' },
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
    console.error('Failed to parse quiz structure:', e)
    // Fallback structure
    structure = {
      topic: `Quiz: ${query.slice(0, 40)}`,
      description: 'Test your understanding of key concepts',
      difficulty: 'medium',
      format: 'multiple-choice',
      questions: [
        {
          id: 'q1',
          question: `Which of the following best describes a core principle of "${query.slice(0, 30)}"?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'This concept is fundamental to understanding the topic.',
          questionType: 'comprehension'
        }
      ]
    }
  }

  const metadata: QuizMetadata = {
    type: 'quiz',
    topic: structure.topic || 'Quiz',
    description: structure.description || '',
    questionCount: (structure.questions || []).length,
    difficulty: structure.difficulty || 'medium',
    format: structure.format || 'multiple-choice',
    questions: (structure.questions || []).map((q: any, i: number) => ({
      id: q.id || `q${i + 1}`,
      question: q.question || `Question ${i + 1}`,
      options: q.options || ['A', 'B', 'C', 'D'],
      correctAnswer: q.correctAnswer ?? 0,
      explanation: q.explanation || 'See lesson for more details.',
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
      startedAt: Date.now(),
    },
  }
}

async function generateComparisonStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  conversationContext?: ConversationContext
): Promise<SurfaceState> {
  // Format conversation context for injection
  const contextSection = formatContextForPrompt(conversationContext)

  const prompt = `You are a senior research analyst creating a definitive comparison report.

TOPIC: "${query}"
${contextSection}
Create an EXHAUSTIVE, OBJECTIVE comparison that would help someone make a confident, well-informed decision. This should feel like a professional analyst's report.

Generate a comparison as JSON:
{
  "title": "Professional comparison title (e.g., 'X vs Y: Complete 2024 Comparison')",
  "subtitle": "What decision this helps with",
  "description": "2-3 sentences explaining the scope and methodology of this comparison",
  "lastUpdated": "When this comparison would be most accurate",
  "targetAudience": "Who this comparison is for",
  "items": [
    {
      "id": "item1",
      "name": "Full, accurate name",
      "tagline": "What it's known for in one line",
      "description": "3-4 sentences comprehensive description",
      "idealFor": ["Specific use case 1", "Specific use case 2", "Specific use case 3"],
      "notIdealFor": ["When NOT to choose this"],
      "pros": [
        "Specific, data-backed advantage 1",
        "Specific advantage 2",
        "Specific advantage 3",
        "Specific advantage 4",
        "Specific advantage 5"
      ],
      "cons": [
        "Specific, honest disadvantage 1",
        "Specific disadvantage 2",
        "Specific disadvantage 3"
      ],
      "uniqueFeatures": ["What sets this apart from alternatives"],
      "pricing": "Pricing structure or cost range",
      "attributes": {
        "Specific Metric 1": "Quantified value",
        "Specific Metric 2": "Quantified value",
        "Specific Feature": true/false
      }
    }
  ],
  "criteria": [
    {
      "name": "Criteria name",
      "weight": 0.0-1.0,
      "description": "Why this matters for the decision",
      "howMeasured": "How we evaluate this criterion"
    }
  ],
  "detailedComparison": [
    {
      "criterion": "Criterion name",
      "analysis": "2-3 sentences comparing all items on this criterion",
      "winner": "item_id or 'tie'"
    }
  ],
  "recommendation": {
    "overallWinner": "item_id for most users",
    "reason": "3-4 sentences explaining why",
    "caveats": "Important limitations of this recommendation"
  },
  "scenarioGuide": [
    {
      "scenario": "If you are a [specific user type/need]...",
      "recommendation": "item_id",
      "reason": "Why this is best for this scenario"
    }
  ],
  "bottomLine": "1-2 sentence definitive summary for someone who just wants the answer"
}

CRITICAL REQUIREMENTS:

1. ITEM DEPTH: Each item should have 5+ pros and 3+ cons. Be SPECIFIC and HONEST.

2. CRITERIA: Include 8-10 comparison criteria covering:
   - Core functionality/features
   - Performance/speed/quality
   - Ease of use/learning curve
   - Pricing/value
   - Support/community
   - Scalability/future-proofing
   - Integration/compatibility
   - Specific domain requirements

3. OBJECTIVITY:
   - Present facts, not opinions
   - Acknowledge trade-offs honestly
   - Note where each option genuinely excels
   - Don't artificially favor any option

4. ACTIONABILITY:
   - Provide clear scenarios for different user needs
   - Make the "winner" conditional on use case
   - Include a bottom-line summary

5. DATA:
   - Include specific metrics where possible
   - Use real pricing (or realistic estimates)
   - Reference specific features, not vague claims

Return ONLY valid JSON, no markdown or explanation.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a senior industry analyst known for creating the definitive comparisons in your field. Your analysis is so thorough and fair that both vendors and buyers trust it. You never oversimplify, never show bias, and always provide actionable recommendations with clear reasoning. Your comparisons help people make decisions they won\'t regret.' },
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
      throw new Error('No JSON found in response')
    }
  } catch (e) {
    console.error('Failed to parse comparison structure:', e)
    structure = {
      title: `Comparison: ${query.slice(0, 40)}`,
      description: 'Side-by-side analysis',
      items: [
        { id: 'item1', name: 'Option A', description: 'First option', pros: ['Pro 1'], cons: ['Con 1'], attributes: {} },
        { id: 'item2', name: 'Option B', description: 'Second option', pros: ['Pro 1'], cons: ['Con 1'], attributes: {} }
      ],
      criteria: [{ name: 'Overall', weight: 1, description: 'General assessment' }]
    }
  }

  const metadata: ComparisonMetadata = {
    type: 'comparison',
    title: structure.title || 'Comparison',
    description: structure.description || '',
    items: structure.items || [],
    criteria: structure.criteria || [],
    recommendation: structure.recommendation,
  }

  return {
    surfaceType: 'comparison',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

async function generateFlashcardStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  conversationContext?: ConversationContext
): Promise<SurfaceState> {
  // Format conversation context for injection
  const contextSection = formatContextForPrompt(conversationContext)

  const prompt = `You are a cognitive scientist and expert educator creating a comprehensive flashcard deck.

TOPIC: "${query}"
${contextSection}
Create a THOROUGH flashcard deck that would help someone truly master this topic. This should feel like a professional study set - comprehensive enough for exam preparation.

Generate flashcards as JSON:
{
  "topic": "Professional, clear deck title",
  "description": "What mastering this deck enables you to do",
  "studyStrategy": "Recommended approach for studying these cards (e.g., daily sessions, topic grouping)",
  "estimatedMasteryTime": "<hours to master the full deck>",
  "studyTips": [
    "Tip 1 for effective learning",
    "Tip 2 for retention"
  ],
  "categories": [
    {
      "name": "Category name",
      "description": "What this category covers",
      "cardCount": <number of cards in this category>
    }
  ],
  "cards": [
    {
      "id": "card1",
      "front": "Specific question or term - not vague or overly broad",
      "back": "Clear, comprehensive answer with:\n- Key definition or explanation\n- Why it matters\n- Example if applicable",
      "category": "Category name",
      "cardType": "definition|concept|application|comparison|process|example",
      "hints": ["Memory hook 1", "Partial answer hint"],
      "difficulty": "beginner|intermediate|advanced",
      "mnemonic": "Memory device or association (if applicable)",
      "relatedCards": ["IDs of conceptually related cards"],
      "whyImportant": "Why knowing this matters"
    }
  ]
}

CRITICAL REQUIREMENTS:

1. CARD COUNT: Create 25-35 cards minimum. This is a COMPREHENSIVE study deck.

2. CATEGORY COVERAGE: Divide cards into 4-6 logical categories that progress from foundational to advanced.

3. CARD TYPE DISTRIBUTION:
   - 6-8 Definition cards (What is X?)
   - 6-8 Concept cards (Explain why/how X works)
   - 4-6 Application cards (When/how would you use X?)
   - 4-6 Comparison cards (X vs Y, differences between...)
   - 3-4 Process cards (Steps to do X)
   - 2-3 Example cards (Give an example of X)

4. ANSWER QUALITY:
   - Backs should be COMPREHENSIVE but SCANNABLE
   - Use bullet points for multi-part answers
   - Include the "why it matters" context
   - For technical topics, include code snippets or formulas
   - Maximum 100 words per back

5. LEARNING SCIENCE:
   - Include mnemonics for difficult concepts
   - Link related cards together
   - Progress from simple → complex within each category
   - Front should prompt ACTIVE RECALL (not recognition)

6. AVOID:
   - Yes/No questions
   - Overly vague fronts like "Explain X"
   - Backs that are just single words
   - Duplicate concepts

Return ONLY valid JSON, no markdown or explanation.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a learning scientist who has studied memory and retention for decades. Your flashcard decks are famous for being so well-designed that students retain 90%+ after one week. You apply cognitive psychology principles like elaborative interrogation, dual coding, and interleaving. Each card you create optimizes for long-term retention, not just short-term recognition.' },
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
      throw new Error('No JSON found in response')
    }
  } catch (e) {
    console.error('Failed to parse flashcard structure:', e)
    structure = {
      topic: query.slice(0, 50),
      description: 'Study cards',
      cards: [
        { id: 'card1', front: 'What is the main concept?', back: 'The core idea...', difficulty: 'easy' }
      ]
    }
  }

  const metadata: FlashcardMetadata = {
    type: 'flashcard',
    topic: structure.topic || 'Flashcards',
    description: structure.description || '',
    cardCount: (structure.cards || []).length,
    cards: (structure.cards || []).map((c: any, i: number) => ({
      id: c.id || `card${i + 1}`,
      front: c.front || 'Question',
      back: c.back || 'Answer',
      hints: c.hints || [],
      difficulty: c.difficulty || 'medium',
    })),
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
      completed: false,
    },
  }
}

async function generateTimelineStructure(
  aiProvider: any,
  query: string,
  analysis?: SurfaceAnalysis,
  conversationContext?: ConversationContext
): Promise<SurfaceState> {
  // Format conversation context for injection
  const contextSection = formatContextForPrompt(conversationContext)

  const prompt = `You are a historian creating an educational timeline.

TOPIC: "${query}"
${contextSection}
Create a timeline that tells a story, not just lists dates. Show how events connect and lead to each other.

Generate a timeline as JSON:
{
  "title": "Descriptive timeline title",
  "description": "What story this timeline tells",
  "era": "Historical period or context",
  "startDate": "When it begins",
  "endDate": "When it ends (or 'Present')",
  "themes": ["Key themes that run through this timeline"],
  "events": [
    {
      "id": "event1",
      "date": "Specific date or period",
      "title": "Event title",
      "description": "What happened (2-3 sentences)",
      "significance": "Why this event matters in the larger story",
      "category": "Category (e.g., 'Political', 'Scientific', 'Cultural')",
      "importance": "minor|moderate|major",
      "keyFigures": ["Important people involved"],
      "consequences": ["What this led to"]
    }
  ],
  "summary": {
    "keyTakeaway": "Main lesson or insight from this timeline",
    "currentRelevance": "How this connects to today (if applicable)"
  }
}

REQUIREMENTS:
- Create 8-15 chronological events
- Mark 3-4 as 'major' importance (turning points)
- Show cause-effect: how events connect to each other
- Include diverse categories (political, cultural, technological, etc.)
- Explain significance, not just what happened
- Focus on key figures and their impact
- Make the timeline tell a coherent story

Return ONLY valid JSON, no markdown or explanation.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a master historian who makes history come alive. You show how events connect, explain why things matter, and help readers see the bigger picture. Your timelines tell compelling stories that illuminate the present.' },
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
      throw new Error('No JSON found in response')
    }
  } catch (e) {
    console.error('Failed to parse timeline structure:', e)
    structure = {
      title: `Timeline: ${query.slice(0, 40)}`,
      description: 'Chronological events',
      events: [
        { id: 'event1', date: 'Beginning', title: 'Start', description: 'Initial event', importance: 'major' }
      ]
    }
  }

  const metadata: TimelineMetadata = {
    type: 'timeline',
    title: structure.title || 'Timeline',
    description: structure.description || '',
    startDate: structure.startDate,
    endDate: structure.endDate,
    events: (structure.events || []).map((e: any, i: number) => ({
      id: e.id || `event${i + 1}`,
      date: e.date || 'Unknown',
      title: e.title || `Event ${i + 1}`,
      description: e.description || '',
      category: e.category,
      importance: e.importance || 'moderate',
    })),
  }

  return {
    surfaceType: 'timeline',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

async function generateWikiStructure(
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
  let realReferences = ''
  let availableImages = ''
  if (webContext && webContext.keyFacts.length > 0) {
    webResearchContext = `

CURRENT RESEARCH DATA (use this information to enhance accuracy):
${webContext.summary.substring(0, 3000)}
`
    // Build real references from web citations
    realReferences = webContext.citations.length > 0 
      ? `
USE THESE REAL SOURCES for the references section:
${webContext.citations.map((c, i) => `- "${c.title}" - ${c.url}`).join('\n')}
` : ''

    // Available images from web search for section content
    const imagesFromCitations = webContext.citations
      .filter((c: any) => c.image)
      .slice(0, 6)  // Limit to 6 images
    if (imagesFromCitations.length > 0) {
      availableImages = `
AVAILABLE IMAGES (embed relevant ones in section content using markdown):
${imagesFromCitations.map((c: any) => `- "${c.title}": ${c.image}`).join('\n')}

IMAGE INSTRUCTIONS:
- Only embed images that are DIRECTLY relevant to the section content
- Use markdown format: ![Brief description](image_url)
- Place images after the first paragraph of relevant sections
- Maximum 2-3 images across the entire article
- Do NOT embed images in every section - only where truly helpful
`
    }
  }

  // Use analysis for better topic understanding
  const topicContext = analysis ? `
TOPIC ANALYSIS:
- Main topic: ${analysis.topic}
- Subtopics to cover: ${analysis.subtopics.join(', ')}
- Target depth: ${analysis.depth}
` : ''

  const prompt = `You are a Wikipedia editor creating a comprehensive, encyclopedic article.

TOPIC: "${query}"
${topicContext}
${webResearchContext}
${realReferences}
${availableImages}
${contextSection}
Create an AUTHORITATIVE, WELL-STRUCTURED knowledge article that would serve as the definitive reference on this topic. This should read like a high-quality Wikipedia article - neutral, comprehensive, and well-organized.

Generate the article as JSON:
{
  "title": "Proper encyclopedic title (e.g., 'Quantum Computing' not 'What is Quantum Computing')",
  "summary": "1-2 sentence overview that captures the essence (like Wikipedia's opening paragraph)",
  "infobox": {
    "facts": [
      { "label": "Key Attribute 1", "value": "Specific value" },
      { "label": "Key Attribute 2", "value": "Specific value" },
      { "label": "Key Attribute 3", "value": "Specific value" },
      { "label": "Key Attribute 4", "value": "Specific value" },
      { "label": "Key Attribute 5", "value": "Specific value" }
    ]
  },
  "sections": [
    {
      "id": "section1",
      "heading": "Overview",
      "content": "Comprehensive opening section with background context (3-4 paragraphs in markdown)",
      "subsections": [
        {
          "id": "sub1-1",
          "heading": "Key Concepts",
          "content": "Detailed exploration of fundamental concepts"
        }
      ]
    },
    {
      "id": "section2",
      "heading": "History",
      "content": "Historical development and key milestones"
    },
    {
      "id": "section3",
      "heading": "Core Principles",
      "content": "Main ideas, mechanisms, or components explained in detail"
    },
    {
      "id": "section4",
      "heading": "Applications",
      "content": "Real-world uses and practical examples"
    },
    {
      "id": "section5",
      "heading": "Challenges & Limitations",
      "content": "Current limitations, criticisms, or debates"
    },
    {
      "id": "section6",
      "heading": "Future Outlook",
      "content": "Emerging trends and what's next"
    }
  ],
  "relatedTopics": [
    "Related topic 1",
    "Related topic 2",
    "Related topic 3",
    "Related topic 4",
    "Related topic 5"
  ],
  "references": [
    { "id": "ref1", "title": "Authoritative source 1", "url": "https://..." },
    { "id": "ref2", "title": "Authoritative source 2", "url": "https://..." },
    { "id": "ref3", "title": "Authoritative source 3", "url": "https://..." }
  ],
  "categories": [
    "Primary category",
    "Secondary category"
  ]
}

CRITICAL REQUIREMENTS:

1. SECTION COUNT: Create 6-8 substantial sections. Each section should be 2-4 paragraphs of quality content.

2. CONTENT DEPTH:
   - Each section should contain 150-300 words of actual content
   - Use markdown formatting: **bold** for key terms, bullet lists for enumerations
   - Include specific facts, figures, and examples
   - Maintain encyclopedic neutral tone (avoid promotional language)

3. STRUCTURE:
   - Start with Overview/Introduction (no "Introduction" heading - just start with context)
   - Include History/Background section
   - Core technical/conceptual content in the middle
   - End with future outlook or conclusion

4. INFOBOX:
   - Include 5-8 key facts that someone would want at a glance
   - Use specific values (numbers, dates, categories)
   - Think: What would be in a Wikipedia infobox?

5. RELATED TOPICS:
   - Include 5-8 genuinely related topics that readers might want to explore
   - Should be specific enough to be useful (not "Science" but "Machine Learning")

6. REFERENCES:
   - List 3-5 authoritative sources with real URLs
   - ${webContext ? 'Use the PROVIDED REAL SOURCES above for accurate references' : 'Include credible sources (books, papers, organizations)'}

7. TONE:
   - Neutral, encyclopedic voice
   - Avoid "you" - use passive voice or third person
   - No promotional or sensational language
   - Acknowledge multiple perspectives where relevant

Return ONLY valid JSON, no markdown or explanation.`

  const systemPrompt = webContext 
    ? 'You are a senior Wikipedia editor with access to current research data. Use the provided web search results to ensure your article contains accurate, up-to-date information with real citations. Your writing is neutral, factual, and organized for easy comprehension. You include specific facts from the research provided and cite the real sources given to you.'
    : 'You are a senior Wikipedia editor with expertise across multiple domains. You write comprehensive, well-researched articles that serve as authoritative references. Your writing is neutral, factual, and organized for easy comprehension. You include specific facts and cite authoritative sources. Your articles are used by students, researchers, and professionals as trusted references.'

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

  let structure: any
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      structure = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No JSON found in response')
    }
  } catch (e) {
    console.error('Failed to parse wiki structure:', e)
    structure = {
      title: query,
      summary: `Overview of ${query}`,
      infobox: { facts: [] },
      sections: [
        { id: 'overview', heading: 'Overview', content: 'Information about this topic.' }
      ],
      relatedTopics: [],
      references: [],
      categories: ['General']
    }
  }

  const metadata: WikiMetadata = {
    type: 'wiki',
    title: structure.title || query,
    summary: structure.summary || '',
    infobox: {
      image: structure.infobox?.image,
      facts: structure.infobox?.facts || [],
    },
    sections: (structure.sections || []).map((s: any, i: number) => ({
      id: s.id || `section${i + 1}`,
      heading: s.heading || `Section ${i + 1}`,
      content: s.content || '',
      subsections: s.subsections?.map((sub: any, j: number) => ({
        id: sub.id || `sub${i + 1}-${j + 1}`,
        heading: sub.heading || `Subsection ${j + 1}`,
        content: sub.content || '',
      })),
    })),
    relatedTopics: structure.relatedTopics || [],
    references: (structure.references || []).map((r: any, i: number) => ({
      id: r.id || `ref${i + 1}`,
      title: r.title || `Reference ${i + 1}`,
      url: r.url,
    })),
    categories: structure.categories || ['General'],
    lastUpdated: new Date().toISOString(),
  }

  return {
    surfaceType: 'wiki',
    metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}
