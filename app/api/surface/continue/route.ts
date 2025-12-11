/**
 * Surface Continue API
 * 
 * Generates the next chunk of content within a surface (chapter content, step details).
 * POST /api/surface/continue
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'
import type { SurfaceType, SurfaceState, LearningMetadata, GuideMetadata } from '@/lib/services/domain-types'

interface ContinueRequest {
  surfaceType: SurfaceType
  action: 'generate_chapter' | 'generate_step' | 'expand' | 'simplify'
  targetIndex: number       // Chapter or step index
  surfaceState: SurfaceState // Current surface state
  originalQuery: string     // Original user question for context
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as ContinueRequest
    const { surfaceType, action, targetIndex, surfaceState, originalQuery } = body

    if (!surfaceType || action === undefined || targetIndex === undefined || !surfaceState) {
      return NextResponse.json(
        { error: 'surfaceType, action, targetIndex, and surfaceState are required' },
        { status: 400 }
      )
    }

    const aiProvider = getAIProvider(false)
    let content: string
    let updatedState: SurfaceState

    if (surfaceType === 'learning') {
      const result = await generateChapterContent(
        aiProvider,
        targetIndex,
        surfaceState,
        originalQuery,
        action
      )
      content = result.content
      updatedState = result.updatedState
    } else if (surfaceType === 'guide') {
      const result = await generateStepContent(
        aiProvider,
        targetIndex,
        surfaceState,
        originalQuery,
        action
      )
      content = result.content
      updatedState = result.updatedState
    } else {
      return NextResponse.json(
        { error: `Unsupported surface type: ${surfaceType}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      content,
      updatedState,
    })

  } catch (error) {
    console.error('❌ [api/surface/continue] Error:', error)
    return NextResponse.json(
      { error: 'Failed to continue surface', details: String(error) },
      { status: 500 }
    )
  }
}

async function generateChapterContent(
  aiProvider: any,
  chapterIndex: number,
  state: SurfaceState,
  originalQuery: string,
  action: string
): Promise<{ content: string; updatedState: SurfaceState }> {
  const metadata = state.metadata as LearningMetadata
  const chapter = metadata.chapters[chapterIndex]
  
  if (!chapter) {
    return { content: 'Chapter not found', updatedState: state }
  }

  // Build context from previous chapters
  const previousChapters = metadata.chapters
    .slice(0, chapterIndex)
    .map((ch, i) => `Chapter ${i + 1}: ${ch.title}`)
    .join('\n')

  const prompt = action === 'simplify' 
    ? `Simplify the following chapter content for easier understanding:\n\n${state.learning?.chaptersContent[chapterIndex] || ''}\n\nRewrite in simpler terms:`
    : action === 'expand'
    ? `Expand on the following chapter content with more detail:\n\n${state.learning?.chaptersContent[chapterIndex] || ''}\n\nAdd more examples and explanation:`
    : `You are writing Chapter ${chapterIndex + 1} of a course.

Course Topic: ${metadata.title}
Original Question: ${originalQuery}
Chapter: ${chapter.title}
Description: ${chapter.description}
Depth Level: ${metadata.depth}

${previousChapters ? `Previous chapters covered:\n${previousChapters}\n` : ''}

Write comprehensive, educational content for this chapter. Include:
- Clear explanations of key concepts
- Examples where helpful
- Mermaid diagrams if they would aid understanding (use \`\`\`mermaid code blocks)
- Code examples if relevant (with proper syntax highlighting)

Keep the content focused and well-structured. Use markdown formatting.
Target length: 400-800 words.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are an expert educator writing course content. Be clear, thorough, and engaging.' },
      { role: 'user', content: prompt }
    ]
  })

  let content = ''
  for await (const chunk of response) {
    content += chunk
  }

  // Update state
  const learning = state.learning || {
    currentChapter: 0,
    completedChapters: [],
    chaptersContent: {},
    notes: [],
  }

  const updatedState: SurfaceState = {
    ...state,
    updatedAt: Date.now(),
    learning: {
      ...learning,
      currentChapter: chapterIndex,
      chaptersContent: {
        ...learning.chaptersContent,
        [chapterIndex]: content,
      },
    },
  }

  return { content, updatedState }
}

async function generateStepContent(
  aiProvider: any,
  stepIndex: number,
  state: SurfaceState,
  originalQuery: string,
  action: string
): Promise<{ content: string; updatedState: SurfaceState }> {
  const metadata = state.metadata as GuideMetadata
  const step = metadata.steps[stepIndex]
  
  if (!step) {
    return { content: 'Step not found', updatedState: state }
  }

  // Build context from previous steps
  const previousSteps = metadata.steps
    .slice(0, stepIndex)
    .map((s) => `Step ${s.index + 1}: ${s.title}`)
    .join('\n')

  const prompt = action === 'simplify'
    ? `Simplify the following step instructions for easier understanding:\n\n${state.guide?.stepsContent[stepIndex] || ''}\n\nRewrite in simpler terms:`
    : action === 'expand'
    ? `Expand on the following step with more detail:\n\n${state.guide?.stepsContent[stepIndex] || ''}\n\nAdd troubleshooting tips and alternative approaches:`
    : `You are writing Step ${stepIndex + 1} of a practical guide.

Guide: ${metadata.title}
Original Question: ${originalQuery}
Step: ${step.title}
Difficulty: ${metadata.difficulty}

${previousSteps ? `Previously completed steps:\n${previousSteps}\n` : ''}

Write clear, actionable instructions for this step. Include:
- Exact commands to run (if applicable)
- Expected output or results
- Common errors and how to fix them
- Screenshots or visual descriptions where helpful

Be specific and practical. Use code blocks for commands.
Target length: 200-500 words.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a technical writer creating step-by-step guides. Be precise and practical.' },
      { role: 'user', content: prompt }
    ]
  })

  let content = ''
  for await (const chunk of response) {
    content += chunk
  }

  // Update state
  const guide = state.guide || {
    currentStep: 0,
    completedSteps: [],
    skippedSteps: [],
    stepsContent: {},
    questionsAsked: [],
  }

  const updatedState: SurfaceState = {
    ...state,
    updatedAt: Date.now(),
    guide: {
      ...guide,
      currentStep: stepIndex,
      stepsContent: {
        ...guide.stepsContent,
        [stepIndex]: content,
      },
    },
  }

  return { content, updatedState }
}
