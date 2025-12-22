/**
 * Assessment Generation API
 * 
 * POST /api/learning/assessment - Generate assessment for a chapter
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'

interface AssessmentRequest {
  courseId: string
  chapterId: string
  chapterTitle: string
  sectionTitles: string[]
  assessmentType: 'quiz' | 'short_answer' | 'coding' | 'mixed'
}

export interface QuizQuestion {
  id: string
  type: 'multiple_choice'
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface ShortAnswerQuestion {
  id: string
  type: 'short_answer'
  question: string
  sampleAnswer: string
  keyPoints: string[]
}

export interface CodingChallenge {
  id: string
  type: 'coding'
  title: string
  description: string
  starterCode: string
  expectedOutput?: string
  testCases?: { input: string; expected: string }[]
  hints: string[]
}

export type AssessmentQuestion = QuizQuestion | ShortAnswerQuestion | CodingChallenge

export interface Assessment {
  id: string
  chapterId: string
  type: 'quiz' | 'short_answer' | 'coding' | 'mixed'
  questions: AssessmentQuestion[]
  passingScore: number
  xpReward: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as AssessmentRequest
    const {
      chapterId,
      chapterTitle,
      sectionTitles,
      assessmentType = 'quiz'
    } = body

    if (!chapterId || !chapterTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: chapterId, chapterTitle' },
        { status: 400 }
      )
    }

    const aiProvider = getAIProvider(false)
    
    const systemPrompt = `You are an expert educator creating assessments.
Generate questions that test understanding, not just memorization.
Return ONLY valid JSON, no markdown or explanation.`

    let userPrompt = ''
    
    if (assessmentType === 'quiz' || assessmentType === 'mixed') {
      userPrompt = `Create a quiz for this chapter:

CHAPTER: ${chapterTitle}
SECTIONS COVERED: ${sectionTitles.join(', ')}

Generate exactly 5 multiple choice questions. Return JSON:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Return ONLY the JSON, no other text.`
    } else if (assessmentType === 'short_answer') {
      userPrompt = `Create short answer questions for this chapter:

CHAPTER: ${chapterTitle}
SECTIONS COVERED: ${sectionTitles.join(', ')}

Generate exactly 3 short answer questions. Return JSON:
{
  "questions": [
    {
      "id": "q1",
      "type": "short_answer",
      "question": "Question text here?",
      "sampleAnswer": "A good answer would include...",
      "keyPoints": ["point1", "point2", "point3"]
    }
  ]
}

Return ONLY the JSON, no other text.`
    } else if (assessmentType === 'coding') {
      userPrompt = `Create a coding challenge for this chapter:

CHAPTER: ${chapterTitle}
SECTIONS COVERED: ${sectionTitles.join(', ')}

Generate 1 coding challenge. Return JSON:
{
  "questions": [
    {
      "id": "c1",
      "type": "coding",
      "title": "Challenge title",
      "description": "What to implement, requirements",
      "starterCode": "// Starter code template\\n",
      "hints": ["hint1", "hint2"]
    }
  ]
}

Return ONLY the JSON, no other text.`
    }

    const response = await aiProvider.sendMessage({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })

    // Collect response
    let content = ''
    for await (const chunk of response) {
      content += chunk
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Assessment] Failed to parse JSON:', content)
      return NextResponse.json(
        { error: 'Failed to generate assessment' },
        { status: 500 }
      )
    }

    const parsed = JSON.parse(jsonMatch[0]) as { questions: AssessmentQuestion[] }

    const assessment: Assessment = {
      id: `assess-${chapterId}-${Date.now()}`,
      chapterId,
      type: assessmentType,
      questions: parsed.questions,
      passingScore: 60,
      xpReward: 100
    }

    return NextResponse.json({ assessment })

  } catch (error) {
    console.error('[/api/learning/assessment] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate assessment', details: String(error) },
      { status: 500 }
    )
  }
}
