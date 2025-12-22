/**
 * Section Content Generation API
 * 
 * POST /api/learning/section - Generate content for a specific section
 * Now includes inline quick checks for immediate practice
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'
import { searchAcademicSources } from '@/lib/services/academic-sources'

interface SectionRequest {
  courseId: string
  unitId: string
  chapterId: string
  sectionId: string
  courseTitle: string
  unitTitle?: string
  chapterTitle: string
  sectionTitle: string
  sectionDescription?: string
  chapterObjectives?: string[]
}

export interface QuickCheck {
  id: string
  type: 'multiple_choice' | 'fill_blank' | 'true_false'
  question: string
  options?: string[]
  correctAnswer: string | number
  explanation: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as SectionRequest
    const { 
      courseTitle,
      unitTitle = '',
      chapterTitle,
      sectionTitle,
      sectionDescription = '',
      chapterObjectives = [],
      sectionId
    } = body

    // Validate we have required context
    if (!sectionTitle || !chapterTitle || !courseTitle || !sectionId) {
      return NextResponse.json(
        { error: 'Missing required section context (courseTitle, chapterTitle, sectionTitle, sectionId)' },
        { status: 400 }
      )
    }

    // Fetch academic sources for this section (with fallback for rate limits)
    let sourcesContext = ''
    try {
      const academicResults = await searchAcademicSources(
        `${sectionTitle} ${chapterTitle}`,
        { maxResults: 3, timeout: 5000 }
      )

      if (academicResults.citations.length > 0) {
        sourcesContext = `\n\nRELEVANT ACADEMIC SOURCES (cite these inline as [1], [2], etc.):\n${academicResults.citations
            .slice(0, 3)
            .map((c, i) => `[${i + 1}] "${c.title}" by ${c.authors?.join(', ') || 'Unknown'} (${c.year || 'n.d.'}) - ${c.url}`)
            .join('\n')}`
      }
    } catch (error) {
      console.log('[section] Academic sources fetch failed, continuing without:', error)
    }

    // Generate section content
    const aiProvider = getAIProvider(false)
    
    // Run content and quick checks generation in parallel
    const [contentResult, quickChecksResult] = await Promise.all([
      generateSectionContent(aiProvider, { courseTitle, unitTitle, chapterTitle, sectionTitle, sectionDescription, chapterObjectives, sourcesContext }),
      generateQuickChecks(aiProvider, { courseTitle, chapterTitle, sectionTitle })
    ])

    // Save generated content to DB to prevent regeneration
    try {
      // Lazy load cloudDb to avoid circular dependencies if any
      const { cloudDb } = await import('@/lib/services/cloud-db')
      
      // Get current course state
      const courseData = await cloudDb.getCourse(body.courseId)
      
      if (courseData && courseData.progress) {
        const updatedProgress = {
          ...courseData.progress,
          sectionContent: {
            ...(courseData.progress.sectionContent || {}),
            [sectionId]: contentResult
          },
          sectionQuickChecks: {
            ...(courseData.progress.sectionQuickChecks || {}),
            [sectionId]: quickChecksResult
          }
        }
        
        await cloudDb.updateCourseProgress(body.courseId, updatedProgress)
      }
    } catch (dbError) {
      console.error('[/api/learning/section] Failed to save content to DB:', dbError)
      // Continue returning content even if save fails
    }

    return NextResponse.json({ 
      content: contentResult,
      quickChecks: quickChecksResult
    })

  } catch (error) {
    console.error('[/api/learning/section] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate section content', details: String(error) },
      { status: 500 }
    )
  }
}

interface ContentParams {
  courseTitle: string
  unitTitle: string
  chapterTitle: string
  sectionTitle: string
  sectionDescription: string
  chapterObjectives: string[]
  sourcesContext: string
}

async function generateSectionContent(
  aiProvider: ReturnType<typeof getAIProvider>,
  params: ContentParams
): Promise<string> {
  const systemPrompt = `You are a master educator creating comprehensive educational content for an online course.

Your writing style:
- Clear, accessible explanations without oversimplification
- Rich with concrete examples and real-world applications
- Well-structured with proper headings and formatting
- Includes practical exercises or thought experiments when relevant
- Uses markdown for readability (headers, bold, lists, code blocks, tables)`

  const objectivesText = params.chapterObjectives.length > 0 
    ? `\n\nCHAPTER LEARNING OBJECTIVES:\n${params.chapterObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}`
    : ''

  const userPrompt = `Write comprehensive educational content for this section:

# COURSE: ${params.courseTitle}
## Unit: ${params.unitTitle}
### Chapter: ${params.chapterTitle}
#### Section: ${params.sectionTitle}

${params.sectionDescription ? `SECTION OVERVIEW: ${params.sectionDescription}` : ''}
${objectivesText}
${params.sourcesContext}

REQUIREMENTS:
1. Start directly with the content (no need to repeat the section title)
2. Cover the topic thoroughly - this is a key section the learner is studying
3. Use 2-3 concrete examples or case studies
4. Include visual aids where helpful (tables, diagrams described in text, code examples if relevant)
5. If sources are provided, cite them inline as [1], [2] etc.
6. End with a "Key Takeaways" section summarizing 3-5 main points
7. Target length: 800-1200 words

Write the section content now:`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  })

  let content = ''
  for await (const chunk of response) {
    content += chunk
  }

  return content
}

interface QuickCheckParams {
  courseTitle: string
  chapterTitle: string
  sectionTitle: string
}

async function generateQuickChecks(
  aiProvider: ReturnType<typeof getAIProvider>,
  params: QuickCheckParams
): Promise<QuickCheck[]> {
  const systemPrompt = `You create quick knowledge checks to help learners verify understanding immediately after reading.

Create 2-3 questions that test comprehension of key concepts. Mix question types for variety.`

  const userPrompt = `Create 2-3 quick check questions for this section:

Course: ${params.courseTitle}
Chapter: ${params.chapterTitle}
Section: ${params.sectionTitle}

Return ONLY valid JSON array:
[
  {
    "id": "qc-1",
    "type": "multiple_choice",
    "question": "Which of the following best describes...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct"
  },
  {
    "id": "qc-2", 
    "type": "true_false",
    "question": "Statement to evaluate as true or false",
    "options": ["True", "False"],
    "correctAnswer": 0,
    "explanation": "Explanation of the correct answer"
  },
  {
    "id": "qc-3",
    "type": "fill_blank",
    "question": "Complete: The main purpose of ___ is to...",
    "correctAnswer": "expected answer",
    "explanation": "Explanation of why this answer completes the statement"
  }
]

Questions should test understanding, not just memorization. Include 2-3 questions with mixed types.`

  try {
    const response = await aiProvider.sendMessage({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })

    let content = ''
    for await (const chunk of response) {
      content += chunk
    }

    // Parse JSON array
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return getDefaultQuickChecks(params.sectionTitle)
    }

    const parsed = JSON.parse(jsonMatch[0]) as QuickCheck[]
    
    // Validate and normalize
    return parsed.slice(0, 3).map((qc, i) => ({
      id: qc.id || `qc-${i + 1}`,
      type: ['multiple_choice', 'fill_blank', 'true_false'].includes(qc.type) ? qc.type : 'multiple_choice',
      question: qc.question || 'Question placeholder',
      options: qc.options,
      correctAnswer: qc.correctAnswer ?? 0,
      explanation: qc.explanation || 'Review the section content for the answer.'
    }))
  } catch {
    return getDefaultQuickChecks(params.sectionTitle)
  }
}

function getDefaultQuickChecks(sectionTitle: string): QuickCheck[] {
  return [
    {
      id: 'qc-1',
      type: 'true_false',
      question: `This section covers the fundamentals of ${sectionTitle}.`,
      options: ['True', 'False'],
      correctAnswer: 0,
      explanation: 'This section introduces key concepts related to this topic.'
    }
  ]
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            