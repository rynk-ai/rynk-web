/**
 * Surface Continue API
 * 
 * Generates the next chunk of content within a surface (chapter content, step details).
 * POST /api/surface/continue
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'
import { cloudDb } from '@/lib/services/cloud-db'
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

    // Credit check
    const credits = await cloudDb.getUserCredits(session.user.id)
    if (credits <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits', message: 'Please subscribe to continue using surfaces.' },
        { status: 402 }
      )
    }

    const body = await request.json() as ContinueRequest
    const { surfaceType, action, targetIndex, surfaceState, originalQuery } = body

    if (!surfaceType || action === undefined || targetIndex === undefined || !surfaceState) {
      return NextResponse.json(
        { error: 'surfaceType, action, targetIndex, and surfaceState are required' },
        { status: 400 }
      )
    }

    // Deduct credit for surface content generation
    await cloudDb.updateCredits(session.user.id, -1)

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
    ? `Simplify this chapter content for easier understanding. Use simpler vocabulary, shorter sentences, and more analogies:\n\n${state.learning?.chaptersContent[chapterIndex] || ''}\n\nRewrite to be accessible for beginners while keeping all the valuable information.`
    : action === 'expand'
    ? `Expand this chapter content with significantly more depth:\n\n${state.learning?.chaptersContent[chapterIndex] || ''}\n\nAdd:\n- More detailed explanations of each concept\n- Additional examples and edge cases\n- Common mistakes and misconceptions\n- Advanced considerations\n- Practice exercises with solutions`
    : `You are writing Chapter ${chapterIndex + 1} of a premium educational course. This is NOT a summary or overview - this is the ACTUAL LESSON CONTENT that students will read to learn.

COURSE: ${metadata.title}
ORIGINAL QUERY: ${originalQuery}
CHAPTER: ${chapter.title}
CHAPTER DESCRIPTION: ${chapter.description}
COURSE DEPTH: ${metadata.depth}

${previousChapters ? `CHAPTERS ALREADY COVERED:\n${previousChapters}\n\nIMPORTANT: Build on this foundation. Reference previous concepts when relevant. Don't repeat what was covered.\n` : 'This is the opening chapter. Establish strong context and motivation. Make the learner excited to continue.\n'}

Write COMPREHENSIVE, IN-DEPTH educational content that would be worthy of a paid course.

REQUIRED STRUCTURE (follow this precisely):

## Introduction
- 3-4 sentences establishing WHY this chapter matters
- What the learner will be able to do after completing it
- Brief preview of what's coming

## [Main Concept Section 1]
### [Subsection if needed]
- Thorough explanation of the first major concept
- Include the "what", "why", and "how"
- Use a concrete, specific example
- Include an analogy for complex ideas

## [Main Concept Section 2]  
### [Subsection if needed]
- Thorough explanation of the second major concept
- Another concrete example, different from the first
- Show how this connects to the previous concept

## [Main Concept Section 3]
(Continue for all major concepts in this chapter)

## Practical Application
- A real-world scenario or case study
- Step-by-step walkthrough of applying the concepts
- Include code examples with comments if technical, OR
- Include a \`\`\`mermaid diagram if it helps visualize the concept

## Common Mistakes & Misconceptions
- 2-3 mistakes learners typically make
- Why these mistakes happen
- How to avoid them

## Summary & Key Takeaways
- Bullet points of the 5-7 most important things to remember
- Connect back to the chapter objectives

## Practice Exercise
- A meaningful exercise or thought experiment
- Clear instructions
- What success looks like

---

CONTENT REQUIREMENTS:
- Write like a skilled teacher, not a textbook
- Use **bold** for key terms when first introduced
- Use specific, concrete examples (not vague "for example...")
- Include actual data, numbers, or code when relevant
- Explain the "why" behind every concept
- Use short paragraphs (3-4 sentences max)
- Include headers and subheaders for scannability
- Make it feel like a conversation with a knowledgeable mentor

TONE: Warm, encouraging, expert but accessible. Like learning from a brilliant friend who genuinely wants you to succeed.

TARGET LENGTH: 1500-2500 words. This should feel like a substantial lesson, not a skim-read summary.

Write the complete chapter content now:`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a master educator known for creating transformative learning experiences. Your content is so good that students say "this finally made it click for me." You combine deep expertise with the ability to explain complex ideas simply. You never rush through concepts - you take the time to truly teach. Every lesson you write would justify a paid course.' },
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
    ? `Simplify these instructions. Use clearer language, add visual cues, and break down complex actions:\n\n${state.guide?.stepsContent[stepIndex] || ''}\n\nMake it foolproof for complete beginners.`
    : action === 'expand'
    ? `Expand these instructions with more detail:\n\n${state.guide?.stepsContent[stepIndex] || ''}\n\nAdd:\n- Troubleshooting for common problems\n- Alternative approaches\n- Edge cases to watch for\n- Pro tips from experience`
    : `You are writing Step ${stepIndex + 1} of a practical guide.

GUIDE: ${metadata.title}
GOAL: ${originalQuery}
STEP: ${step.title}
DIFFICULTY: ${metadata.difficulty}

${previousSteps ? `COMPLETED STEPS:\n${previousSteps}\n\nAssume these are done. Reference them if needed.\n` : 'This is the first step. Set the context clearly.\n'}

Write clear, actionable instructions that ANYONE can follow.

REQUIRED SECTIONS:
1. **What You'll Do** (1 sentence summary)
2. **Instructions** (numbered steps with exact details)
3. **Verification** (how to know you did it right)
4. **Troubleshooting** (2-3 common issues and fixes)

CONTENT REQUIREMENTS:
- Be SPECIFIC: "Click the blue 'Save' button" not "save your work"
- Use code blocks (\`\`\`) for commands with expected output
- Include [optional] markers for non-essential substeps
- Add ⚠️ warnings for risky or irreversible actions
- Use ✅ for verification checkpoints
- Add "💡 Tip:" for helpful shortcuts

TONE: Friendly, confident, supportive. Like a senior colleague helping out.
TARGET LENGTH: 300-600 words.

Write the step content now:`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a patient, experienced mentor who writes guides that work the first time. You anticipate problems, provide clear verification steps, and never leave users guessing. Your instructions are tested and reliable.' },
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
