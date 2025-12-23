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
      const result = await generateCheckpointContent(
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

  // Build available images context
  const availableImages = state.availableImages || []
  const imageContext = availableImages.length > 0
    ? `\nAVAILABLE IMAGES (embed 1-2 relevant ones inline):
${availableImages.slice(0, 4).map((img, i) => `[Image ${i + 1}] "${img.title}": ${img.url}`).join('\n')}

IMAGE INSTRUCTIONS:
- Embed 1-2 images where they enhance understanding
- Use markdown format: ![Brief description](image_url)
- Place after introducing a concept the image illustrates
- Do NOT use all images - only the most relevant\n`
    : ''

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

${previousChapters ? `CHAPTERS ALREADY COVERED:\n${previousChapters}\n\nIMPORTANT: Build on this foundation. Reference previous concepts when relevant. Don't repeat what was covered.\n` : 'This is the opening chapter. Establish strong context and motivation. Make the learner excited to continue.\n'}${imageContext}

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

async function generateCheckpointContent(
  aiProvider: any,
  checkpointIndex: number,
  state: SurfaceState,
  originalQuery: string,
  action: string
): Promise<{ content: string; updatedState: SurfaceState }> {
  const metadata = state.metadata as GuideMetadata
  const checkpoint = metadata.checkpoints[checkpointIndex]
  
  if (!checkpoint) {
    return { content: 'Checkpoint not found', updatedState: state }
  }

  // Sequential lock check - only allow current or completed checkpoints
  const currentCheckpoint = state.guide?.currentCheckpoint ?? 0
  const completedCheckpoints = state.guide?.completedCheckpoints ?? []
  
  if (checkpointIndex > currentCheckpoint && !completedCheckpoints.includes(checkpointIndex)) {
    return { content: 'This checkpoint is locked. Complete previous checkpoints first.', updatedState: state }
  }

  // Build context from previous checkpoints
  const previousCheckpoints = metadata.checkpoints
    .slice(0, checkpointIndex)
    .map((cp, i) => `Checkpoint ${i + 1}: ${cp.title}`)
    .join('\n')

  // Build substeps context
  const substepsContext = checkpoint.substeps.length > 0
    ? `\nSUBSTEPS TO COVER:\n${checkpoint.substeps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
    : ''

  const prompt = action === 'simplify'
    ? `Simplify these instructions. Use clearer language, add visual cues, and break down complex actions:\n\n${state.guide?.checkpointContent[checkpointIndex] || ''}\n\nMake it foolproof for complete beginners.`
    : action === 'expand'
    ? `Expand these instructions with more detail:\n\n${state.guide?.checkpointContent[checkpointIndex] || ''}\n\nAdd:\n- Troubleshooting for common problems\n- Alternative approaches\n- Edge cases to watch for\n- Pro tips from experience`
    : `You are expanding a checkpoint in a practical checklist guide.

GUIDE: ${metadata.title}
GOAL: ${originalQuery}
CHECKPOINT: ${checkpoint.title}
DESCRIPTION: ${checkpoint.description}
${substepsContext}
${previousCheckpoints ? `COMPLETED CHECKPOINTS:\n${previousCheckpoints}\n\nAssume these are done.\n` : 'This is the first checkpoint.\n'}

Write detailed "Learn more" content for this checkpoint.

INCLUDE:
1. **Overview** - Why this checkpoint matters (1-2 sentences)
2. **Detailed Instructions** - Expand each substep with specifics
3. **Verification** - How to know you did it correctly
4. **Common Issues** - 2-3 potential problems and quick fixes

STYLE:
- Be specific: exact commands, button names, file paths
- Use code blocks for commands
- Use ⚠️ for warnings, ✅ for verification, 💡 for tips
- Friendly, supportive tone

TARGET LENGTH: 300-500 words.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a clear, practical guide writer who helps users complete tasks successfully.' },
      { role: 'user', content: prompt }
    ]
  })

  let content = ''
  for await (const chunk of response) {
    content += chunk
  }

  // Update state
  const guide = state.guide || {
    currentCheckpoint: 0,
    completedCheckpoints: [],
    checkpointContent: {},
  }

  const updatedState: SurfaceState = {
    ...state,
    updatedAt: Date.now(),
    guide: {
      ...guide,
      checkpointContent: {
        ...guide.checkpointContent,
        [checkpointIndex]: content,
      },
    },
  }

  return { content, updatedState }
}

