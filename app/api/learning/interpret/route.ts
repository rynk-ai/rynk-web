/**
 * Subject Interpretation API
 * 
 * POST /api/learning/interpret - Generate 5 subject interpretations for a course prompt
 * Now includes prompt analysis for learning approach recommendation
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'
import type { SubjectInterpretation } from '@/lib/services/domain-types'

interface InterpretRequest {
  prompt: string
}

interface PromptAnalysis {
  domain: 'programming' | 'theory' | 'creative' | 'professional' | 'science' | 'language'
  recommendedApproach: 'reading' | 'hands-on' | 'hybrid'
  modalityMix: { reading: number; practice: number }
  suggestedDuration: string
  requiresProjects: boolean
  practiceTypes: string[]
  reasoning: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as InterpretRequest
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'A valid prompt is required (at least 3 characters)' },
        { status: 400 }
      )
    }

    const aiProvider = getAIProvider(false)
    
    // Run interpretation and analysis concurrently
    const [interpretationsResult, analysisResult] = await Promise.all([
      generateInterpretations(aiProvider, prompt),
      analyzePrompt(aiProvider, prompt)
    ])

    return NextResponse.json({ 
      interpretations: interpretationsResult,
      analysis: analysisResult
    })

  } catch (error) {
    console.error('[/api/learning/interpret] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate interpretations', details: String(error) },
      { status: 500 }
    )
  }
}

async function generateInterpretations(aiProvider: ReturnType<typeof getAIProvider>, prompt: string): Promise<SubjectInterpretation[]> {
  const systemPrompt = `You are a world-class learning experience designer who creates personalized educational paths.

Given any topic, you generate 5 GENUINELY DIFFERENT course options that each approach learning from a unique angle. Each interpretation should feel like a different course a student might take at a university.

Your interpretations must be:
- SPECIFIC: Not generic - tailored to the exact topic requested
- DIVERSE: Each offers a truly different learning experience
- ACTIONABLE: Clear what the student will learn and do
- ENGAGING: Titles and descriptions that make each option appealing`

  const userPrompt = `Create 5 distinct course interpretations for: "${prompt}"

Each interpretation should take a DIFFERENT ANGLE:
1. **Beginner-Friendly Foundation** - Start from zero, build core understanding
2. **Hands-On Practical** - Learn by building projects and real applications
3. **Deep Dive Expert** - Comprehensive mastery for serious learners
4. **Quick Essentials** - Fast-track to practical competency
5. **Industry/Career Focus** - Skills that employers want, career-ready

Return JSON:
{
  "interpretations": [
    {
      "id": "interp-1",
      "title": "Specific, compelling course title",
      "description": "2-3 sentences: What you'll learn, what you'll build or achieve, why this approach works",
      "approach": "foundational" | "practical" | "comprehensive" | "accelerated" | "professional",
      "targetAudience": "Specific audience description with their goals",
      "estimatedDuration": "X-Y hours",
      "suggestedPrerequisites": ["Only if truly needed"],
      "keyTopics": ["5-8 specific topics covered"]
    }
  ]
}

Make each interpretation genuinely different in scope, depth, and outcome. A beginner and an expert should each find one that fits perfectly.

Return ONLY JSON, no explanation.`

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

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response')
  }

  const parsed = JSON.parse(jsonMatch[0]) as { interpretations: SubjectInterpretation[] }
  
  if (!parsed.interpretations || !Array.isArray(parsed.interpretations)) {
    throw new Error('Invalid response structure')
  }

  return parsed.interpretations.map((interp, idx) => ({
    ...interp,
    id: interp.id || `interp-${idx + 1}`
  }))
}

async function analyzePrompt(aiProvider: ReturnType<typeof getAIProvider>, prompt: string): Promise<PromptAnalysis> {
  const systemPrompt = `You are an expert curriculum advisor. Analyze learning topics to determine the optimal teaching approach.

Determine:
1. DOMAIN: programming, theory, creative, professional, science, or language
2. APPROACH: reading (knowledge-based), hands-on (practice-based), or hybrid
3. MODALITY MIX: Percentage split between reading and practice
4. PRACTICE TYPES: coding, writing, quiz, exercise, or discussion`

  const userPrompt = `Analyze: "${prompt}"

Return ONLY valid JSON:
{
  "domain": "programming",
  "recommendedApproach": "hands-on",
  "modalityMix": { "reading": 30, "practice": 70 },
  "suggestedDuration": "6-8 hours",
  "requiresProjects": true,
  "practiceTypes": ["coding", "quiz"],
  "reasoning": "Brief explanation"
}`

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

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return getDefaultAnalysis()
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      domain: parsed.domain || 'theory',
      recommendedApproach: parsed.recommendedApproach || 'hybrid',
      modalityMix: parsed.modalityMix || { reading: 50, practice: 50 },
      suggestedDuration: parsed.suggestedDuration || '4-6 hours',
      requiresProjects: Boolean(parsed.requiresProjects),
      practiceTypes: parsed.practiceTypes || ['quiz'],
      reasoning: parsed.reasoning || ''
    }
  } catch {
    return getDefaultAnalysis()
  }
}

function getDefaultAnalysis(): PromptAnalysis {
  return {
    domain: 'theory',
    recommendedApproach: 'hybrid',
    modalityMix: { reading: 60, practice: 40 },
    suggestedDuration: '4-6 hours',
    requiresProjects: false,
    practiceTypes: ['quiz', 'writing'],
    reasoning: 'Default hybrid approach'
  }
}
