/**
 * Surface Generate API
 * 
 * Generates the initial structure for a surface (chapters for learning, steps for guide, questions for quiz).
 * POST /api/surface/generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'
import type { SurfaceType, SurfaceState, LearningMetadata, GuideMetadata, QuizMetadata, ComparisonMetadata, FlashcardMetadata, TimelineMetadata } from '@/lib/services/domain-types'

interface GenerateRequest {
  query: string           // Original user question
  surfaceType: SurfaceType
  messageId: string       // Message to attach surface to
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as GenerateRequest
    const { query, surfaceType, messageId } = body

    if (!query || !surfaceType || !messageId) {
      return NextResponse.json(
        { error: 'query, surfaceType, and messageId are required' },
        { status: 400 }
      )
    }

    // Skip generation for chat (it's the default)
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

    const aiProvider = getAIProvider(false)
    let surfaceState: SurfaceState

    if (surfaceType === 'learning') {
      surfaceState = await generateLearningStructure(aiProvider, query)
    } else if (surfaceType === 'guide') {
      surfaceState = await generateGuideStructure(aiProvider, query)
    } else if (surfaceType === 'quiz') {
      surfaceState = await generateQuizStructure(aiProvider, query)
    } else if (surfaceType === 'comparison') {
      surfaceState = await generateComparisonStructure(aiProvider, query)
    } else if (surfaceType === 'flashcard') {
      surfaceState = await generateFlashcardStructure(aiProvider, query)
    } else if (surfaceType === 'timeline') {
      surfaceState = await generateTimelineStructure(aiProvider, query)
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

async function generateLearningStructure(
  aiProvider: any,
  query: string
): Promise<SurfaceState> {
  const prompt = `You are creating a structured course outline for the following topic.

User's question: "${query}"

Generate a course structure as JSON with the following format:
{
  "title": "Course title (short, descriptive)",
  "description": "One sentence description",
  "depth": "basic|intermediate|advanced|expert",
  "estimatedTime": <total minutes>,
  "prerequisites": ["optional prerequisites"],
  "chapters": [
    {
      "id": "ch1",
      "title": "Chapter title",
      "description": "Brief chapter description",
      "estimatedTime": <minutes>
    }
  ]
}

Create 4-8 logical chapters that cover the topic progressively.
Return ONLY valid JSON, no markdown or explanation.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a course structure generator. Output only valid JSON.' },
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
      title: query.slice(0, 50),
      description: 'A structured learning experience',
      depth: 'intermediate',
      estimatedTime: 30,
      prerequisites: [],
      chapters: [
        { id: 'ch1', title: 'Introduction', description: 'Getting started', estimatedTime: 5 },
        { id: 'ch2', title: 'Core Concepts', description: 'Key principles', estimatedTime: 10 },
        { id: 'ch3', title: 'Practical Application', description: 'Hands-on practice', estimatedTime: 10 },
        { id: 'ch4', title: 'Summary', description: 'Wrap up and next steps', estimatedTime: 5 },
      ]
    }
  }

  const metadata: LearningMetadata = {
    type: 'learning',
    title: structure.title || 'Course',
    description: structure.description || '',
    depth: structure.depth || 'intermediate',
    estimatedTime: structure.estimatedTime || 30,
    prerequisites: structure.prerequisites || [],
    chapters: (structure.chapters || []).map((ch: any, i: number) => ({
      id: ch.id || `ch${i + 1}`,
      title: ch.title || `Chapter ${i + 1}`,
      description: ch.description || '',
      estimatedTime: ch.estimatedTime || 5,
      status: i === 0 ? 'available' : 'available' as const, // All chapters available
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
  query: string
): Promise<SurfaceState> {
  const prompt = `You are creating a step-by-step guide for the following task.

User's question: "${query}"

Generate a guide structure as JSON with the following format:
{
  "title": "Guide title (short, action-oriented)",
  "description": "One sentence description of what this guide accomplishes",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedTime": <total minutes>,
  "steps": [
    {
      "index": 0,
      "title": "Step title (action verb)",
      "estimatedTime": <minutes>
    }
  ]
}

Create 4-10 clear, actionable steps.
Return ONLY valid JSON, no markdown or explanation.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a guide structure generator. Output only valid JSON.' },
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
      title: `Guide: ${query.slice(0, 40)}`,
      description: 'Step-by-step instructions',
      difficulty: 'intermediate',
      estimatedTime: 15,
      steps: [
        { index: 0, title: 'Prepare', estimatedTime: 2 },
        { index: 1, title: 'Execute main task', estimatedTime: 5 },
        { index: 2, title: 'Verify results', estimatedTime: 3 },
        { index: 3, title: 'Finish up', estimatedTime: 2 },
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
  query: string
): Promise<SurfaceState> {
  const prompt = `You are creating an interactive quiz for the following topic.

User's question: "${query}"

Generate a quiz as JSON with the following format:
{
  "topic": "Quiz topic (short, descriptive)",
  "description": "One sentence describing what this quiz tests",
  "difficulty": "easy|medium|hard",
  "format": "multiple-choice",
  "questions": [
    {
      "id": "q1",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}

Create 5-10 engaging multiple-choice questions that test understanding.
- Make questions progressively harder
- Include plausible distractors
- Keep explanations concise but educational
Return ONLY valid JSON, no markdown or explanation.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a quiz generator. Output only valid JSON.' },
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
      topic: query.slice(0, 50),
      description: 'Test your knowledge',
      difficulty: 'medium',
      format: 'multiple-choice',
      questions: [
        {
          id: 'q1',
          question: `What is a key concept related to "${query.slice(0, 30)}"?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'This is the correct answer based on the topic.'
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
  query: string
): Promise<SurfaceState> {
  const prompt = `You are creating a comparison analysis for the following topic.

User's question: "${query}"

Generate a comparison as JSON with the following format:
{
  "title": "Comparison title",
  "description": "What is being compared",
  "items": [
    {
      "id": "item1",
      "name": "Option/Item name",
      "description": "Brief description",
      "pros": ["Advantage 1", "Advantage 2"],
      "cons": ["Disadvantage 1"],
      "attributes": { "Price": "$99", "Rating": 4.5 }
    }
  ],
  "criteria": [
    { "name": "Criteria name", "weight": 0.8, "description": "Why this matters" }
  ],
  "recommendation": {
    "itemId": "item1",
    "reason": "Why this is recommended"
  }
}

Compare 2-4 items with 3-5 comparison criteria.
Return ONLY valid JSON, no markdown or explanation.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a comparison analysis generator. Output only valid JSON.' },
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
  query: string
): Promise<SurfaceState> {
  const prompt = `You are creating study flashcards for the following topic.

User's question: "${query}"

Generate flashcards as JSON with the following format:
{
  "topic": "Topic title",
  "description": "What these flashcards cover",
  "cards": [
    {
      "id": "card1",
      "front": "Question or term",
      "back": "Answer or definition",
      "hints": ["Optional hint"],
      "difficulty": "easy|medium|hard"
    }
  ]
}

Create 8-15 flashcards that progressively cover the topic.
Mix difficulty levels. Make fronts concise, backs informative.
Return ONLY valid JSON, no markdown or explanation.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a flashcard generator. Output only valid JSON.' },
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
  query: string
): Promise<SurfaceState> {
  const prompt = `You are creating a timeline for the following topic.

User's question: "${query}"

Generate a timeline as JSON with the following format:
{
  "title": "Timeline title",
  "description": "What this timeline covers",
  "startDate": "Start date/period (optional)",
  "endDate": "End date/period (optional)",
  "events": [
    {
      "id": "event1",
      "date": "Date or period (e.g., '1969', 'March 2020', 'Early Renaissance')",
      "title": "Event title",
      "description": "What happened and why it matters",
      "category": "Optional category",
      "importance": "minor|moderate|major"
    }
  ]
}

Create 6-12 chronological events. Mark 2-3 as 'major' importance.
Return ONLY valid JSON, no markdown or explanation.`

  const response = await aiProvider.sendMessage({
    messages: [
      { role: 'system', content: 'You are a timeline generator. Output only valid JSON.' },
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
