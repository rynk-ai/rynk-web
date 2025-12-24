/**
 * ToC Preview API
 * 
 * POST /api/learning/preview-toc - Generate course structure WITHOUT saving to DB
 * Used for previewing before user confirms course creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'
import { searchAcademicSources } from '@/lib/services/academic-sources'
import type { SubjectInterpretation, CourseMetadata, CourseUnit } from '@/lib/services/domain-types'

interface PreviewToCRequest {
  prompt: string
  interpretation: SubjectInterpretation
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as PreviewToCRequest
    const { prompt, interpretation } = body

    if (!prompt || !interpretation) {
      return NextResponse.json(
        { error: 'Prompt and interpretation are required' },
        { status: 400 }
      )
    }

    // Step 1: Fetch academic sources for context
    const academicResults = await searchAcademicSources(
      `${prompt} ${interpretation.title}`,
      { maxResults: 5, timeout: 8000 }
    )

    // Format sources for prompt context
    const sourcesContext = academicResults.citations.length > 0
      ? `\n\nACADEMIC SOURCES TO INFORM STRUCTURE:\n${academicResults.citations
          .slice(0, 5)
          .map((c, i) => `${i + 1}. "${c.title}" (${c.source}) ${c.year ? `- ${c.year}` : ''}`)
          .join('\n')}`
      : ''

    // Step 2: Generate ToC using AI
    const aiProvider = getAIProvider(false)
    
    const systemPrompt = `You are a world-class curriculum designer creating university-level course structures.

Your principles:
- Structure content for optimal learning progression (simple → complex)
- Each module builds on previous knowledge
- Include practical applications alongside theory
- Design for active learning, not passive reading
- Ensure comprehensive coverage of the subject

Structure hierarchy:
- UNITS: Major learning milestones (like textbook parts)
- CHAPTERS: Complete topic coverage (like textbook chapters)  
- SECTIONS: Individual lessons (8-15 minutes each)`

    const userPrompt = `Design a comprehensive course structure for:

SUBJECT: "${prompt}"
TITLE: ${interpretation.title}
APPROACH: ${interpretation.approach}
DESCRIPTION: ${interpretation.description}
TARGET AUDIENCE: ${interpretation.targetAudience}
DURATION: ${interpretation.estimatedDuration}
KEY TOPICS: ${interpretation.keyTopics?.join(', ') || 'N/A'}
${sourcesContext}

Return ONLY valid JSON with this exact structure:
{
  "title": "${interpretation.title}",
  "subtitle": "Engaging subtitle that highlights the unique value",
  "description": "2-3 sentences explaining what students will learn and why it matters",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "prerequisites": ["Prerequisite 1"],
  "learningOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3"],
  "units": [
    {
      "id": "unit-1",
      "title": "Unit Title",
      "description": "What this unit covers",
      "milestone": "What the learner achieves",
      "chapters": [
        {
          "id": "ch-1-1",
          "title": "Chapter Title",
          "description": "What this chapter teaches",
          "estimatedTime": 45,
          "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
          "assessmentType": "quiz",
          "sections": [
            { "id": "sec-1-1-1", "title": "Section 1", "description": "Brief description", "estimatedTime": 10 },
            { "id": "sec-1-1-2", "title": "Section 2", "description": "Brief description", "estimatedTime": 10 },
            { "id": "sec-1-1-3", "title": "Section 3", "description": "Brief description", "estimatedTime": 10 },
            { "id": "sec-1-1-4", "title": "Section 4", "description": "Brief description", "estimatedTime": 10 }
          ]
        }
      ]
    }
  ]
}

REQUIREMENTS:
- Create 3-5 UNITS (major learning blocks)
- Each unit has 3-5 CHAPTERS
- Each chapter has 5-8 SECTIONS (this is important - provide enough depth!)
- Sections should be 8-15 minutes each
- Total course time: approximately ${interpretation.estimatedDuration}
- Make section titles specific and actionable (not vague)
- Progress from foundational concepts to advanced applications

Return ONLY the JSON, no other text.`

    const response = await aiProvider.sendMessage({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })

    // Collect streamed response
    let content = ''
    for await (const chunk of response) {
      content += chunk
    }

    // Extract and clean JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }
    
    // Clean up common LLM JSON issues
    let jsonString = jsonMatch[0]
      // Remove trailing commas before closing braces/brackets
      .replace(/,\s*([}\]])/g, '$1')
      // Remove JavaScript-style comments
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Fix unquoted property names (basic cases)
      .replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      // Fix escaped newlines in strings
      .replace(/\\n/g, ' ')
    
    let parsed: any
    try {
      parsed = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('[preview-toc] JSON parse error, attempting recovery...')
      // Try to extract a simpler structure if full parse fails
      try {
        // Find the units array specifically
        const unitsMatch = jsonString.match(/"units"\s*:\s*\[([\s\S]*?)\]\s*\}/)
        if (unitsMatch) {
          // Retry with a minimal structure
          const minimalJson = `{"title":"${interpretation.title}","units":[]}`
          parsed = JSON.parse(minimalJson)
          console.warn('[preview-toc] Falling back to minimal course structure')
        } else {
          throw parseError
        }
      } catch {
        throw new Error(`Failed to parse course structure: ${(parseError as Error).message}`)
      }
    }
    
    // Build preview CourseMetadata (without saving)
    const now = Date.now()
    
    // Process units to add status and ensure IDs
    const units: CourseUnit[] = (parsed.units || []).map((unit: any, unitIdx: number) => ({
      id: unit.id || `unit-${unitIdx + 1}`,
      title: unit.title,
      description: unit.description,
      milestone: unit.milestone,
      chapters: (unit.chapters || []).map((chapter: any, chapterIdx: number) => ({
        id: chapter.id || `ch-${unitIdx + 1}-${chapterIdx + 1}`,
        title: chapter.title,
        description: chapter.description,
        estimatedTime: chapter.estimatedTime || 20,
        learningObjectives: chapter.learningObjectives || [],
        assessmentType: chapter.assessmentType || 'quiz',
        status: (unitIdx === 0 && chapterIdx === 0) ? 'available' : 'locked',
        sections: (chapter.sections || []).map((section: any, sectionIdx: number) => ({
          id: section.id || `sec-${unitIdx + 1}-${chapterIdx + 1}-${sectionIdx + 1}`,
          title: section.title,
          description: section.description,
          estimatedTime: section.estimatedTime || 8,
          status: 'pending',
          citations: []
        }))
      }))
    }))

    // Calculate totals
    let totalChapters = 0
    let totalSections = 0
    let totalTime = 0
    
    units.forEach(unit => {
      totalChapters += unit.chapters.length
      unit.chapters.forEach(chapter => {
        totalSections += chapter.sections.length
        totalTime += chapter.estimatedTime || 0
      })
    })

    const previewMetadata: CourseMetadata = {
      type: 'course',
      title: parsed.title || interpretation.title,
      subtitle: parsed.subtitle,
      description: parsed.description || interpretation.description,
      subject: interpretation,
      units,
      primarySources: academicResults.citations,
      totalEstimatedTime: totalTime,
      difficulty: parsed.difficulty || 'intermediate',
      prerequisites: parsed.prerequisites || interpretation.suggestedPrerequisites || [],
      learningOutcomes: parsed.learningOutcomes || [],
      totalUnits: units.length,
      totalChapters,
      totalSections,
      generatedAt: now,
      lastUpdated: now
    }

    // Return preview WITHOUT saving to database
    return NextResponse.json({
      preview: previewMetadata
    })

  } catch (error) {
    console.error('[/api/learning/preview-toc] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate course preview', details: String(error) },
      { status: 500 }
    )
  }
}
