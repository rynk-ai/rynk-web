/**
 * Prompt Analyzer API
 * 
 * POST /api/learning/analyze-prompt
 * 
 * Analyzes a learning topic to determine the optimal approach:
 * - Reading-focused (theory, history, philosophy)
 * - Hands-on focused (programming, design, creative)
 * - Hybrid (mix of both)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'

export interface PromptAnalysis {
  domain: 'programming' | 'theory' | 'creative' | 'professional' | 'science' | 'language'
  recommendedApproach: 'reading' | 'hands-on' | 'hybrid'
  modalityMix: {
    reading: number  // percentage
    practice: number // percentage
  }
  suggestedDuration: string
  requiresProjects: boolean
  practiceTypes: ('coding' | 'writing' | 'quiz' | 'exercise' | 'discussion')[]
  reasoning: string
}

interface AnalyzeRequest {
  prompt: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as AnalyzeRequest
    const { prompt } = body

    if (!prompt || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const aiProvider = getAIProvider(false)
    
    const systemPrompt = `You are an expert curriculum advisor. Analyze learning topics to determine the optimal teaching approach.

For each topic, determine:
1. DOMAIN: What category does this subject fall into?
   - programming: Coding, software, web development, data science
   - theory: Philosophy, history, mathematics concepts, physics theory
   - creative: Writing, art, music, design
   - professional: Business, marketing, management, soft skills
   - science: Biology, chemistry, practical sciences
   - language: Learning a new language

2. APPROACH: What's the best way to learn this?
   - reading: Subject is primarily knowledge-based, needs deep understanding
   - hands-on: Subject requires practice and building things
   - hybrid: Mix of both, needs theory with applied practice

3. MODALITY MIX: What percentage split?
   - For "Learn Python": 30% reading, 70% practice
   - For "History of Rome": 80% reading, 20% practice (quizzes, essays)
   - For "Web Design": 40% reading, 60% practice

4. PRACTICE TYPES: What kinds of practice make sense?
   - coding: Write and run code
   - writing: Essays, explanations, reflections
   - quiz: Knowledge checks
   - exercise: Worked problems
   - discussion: Analysis and debate`

    const userPrompt = `Analyze this learning topic: "${prompt}"

Return ONLY valid JSON:
{
  "domain": "programming" | "theory" | "creative" | "professional" | "science" | "language",
  "recommendedApproach": "reading" | "hands-on" | "hybrid",
  "modalityMix": {
    "reading": 40,
    "practice": 60
  },
  "suggestedDuration": "6-8 hours",
  "requiresProjects": true,
  "practiceTypes": ["coding", "quiz"],
  "reasoning": "Brief explanation of why this approach"
}`

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

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // Fallback to hybrid approach
      return NextResponse.json({
        domain: 'theory',
        recommendedApproach: 'hybrid',
        modalityMix: { reading: 60, practice: 40 },
        suggestedDuration: '4-6 hours',
        requiresProjects: false,
        practiceTypes: ['quiz', 'writing'],
        reasoning: 'Default hybrid approach for unclassified topic'
      } as PromptAnalysis)
    }

    let analysis: PromptAnalysis
    try {
      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate and normalize
      analysis = {
        domain: ['programming', 'theory', 'creative', 'professional', 'science', 'language'].includes(parsed.domain) 
          ? parsed.domain 
          : 'theory',
        recommendedApproach: ['reading', 'hands-on', 'hybrid'].includes(parsed.recommendedApproach)
          ? parsed.recommendedApproach
          : 'hybrid',
        modalityMix: {
          reading: Math.min(100, Math.max(0, parsed.modalityMix?.reading || 50)),
          practice: Math.min(100, Math.max(0, parsed.modalityMix?.practice || 50))
        },
        suggestedDuration: parsed.suggestedDuration || '4-6 hours',
        requiresProjects: Boolean(parsed.requiresProjects),
        practiceTypes: Array.isArray(parsed.practiceTypes) ? parsed.practiceTypes : ['quiz'],
        reasoning: parsed.reasoning || ''
      }
    } catch {
      // Fallback
      analysis = {
        domain: 'theory',
        recommendedApproach: 'hybrid',
        modalityMix: { reading: 60, practice: 40 },
        suggestedDuration: '4-6 hours',
        requiresProjects: false,
        practiceTypes: ['quiz', 'writing'],
        reasoning: 'Could not parse AI response, using default'
      }
    }

    return NextResponse.json(analysis)

  } catch (error) {
    console.error('[/api/learning/analyze-prompt] Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze prompt', details: String(error) },
      { status: 500 }
    )
  }
}
