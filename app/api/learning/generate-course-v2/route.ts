/**
 * Project-Based Course Structure Generation API
 * 
 * POST /api/learning/generate-course-v2 - Generate project-based course structure
 * 
 * This replaces generate-toc for the new Education Machine model.
 * Instead of Units → Chapters → Sections, it creates Projects → Tasks.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'
import { searchAcademicSources } from '@/lib/services/academic-sources'
import { cloudDb } from '@/lib/services/cloud-db'
import type { SubjectInterpretation } from '@/lib/services/domain-types'

interface GenerateCourseV2Request {
  prompt: string
  interpretation: SubjectInterpretation
}

interface ProjectOutline {
  title: string
  description: string
  deliverable: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedHours: number
  objectives: string[]
  skills: string[]
}

interface CourseOutline {
  title: string
  subtitle: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  learningOutcomes: string[]
  projects: ProjectOutline[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json() as GenerateCourseV2Request
    const { prompt, interpretation } = body

    if (!prompt || !interpretation) {
      return NextResponse.json(
        { error: 'Prompt and interpretation are required' },
        { status: 400 }
      )
    }

    // Step 1: Fetch academic sources for context
    const academicResults = await searchAcademicSources(
      `${prompt} ${interpretation.title} projects curriculum`,
      { maxResults: 5, timeout: 8000 }
    )

    const sourcesContext = academicResults.citations.length > 0
      ? `\n\nREFERENCE SOURCES:\n${academicResults.citations
          .slice(0, 5)
          .map((c, i) => `${i + 1}. "${c.title}" (${c.source})`)
          .join('\n')}`
      : ''

    // Step 2: Generate project-based course outline
    const aiProvider = getAIProvider(false)
    
    const systemPrompt = `You are a senior curriculum designer for a project-based learning platform.

Your philosophy:
- HANDS-ON FIRST: Learners build real things, not just read about them
- PROGRESSIVE COMPLEXITY: Each project builds skills from the previous
- TANGIBLE OUTCOMES: Every project results in something demonstrable
- PORTFOLIO-WORTHY: By course end, learners have proof of skills

Structure:
- Each course has 4-6 PROJECTS
- Projects are complete, standalone deliverables
- Each project takes 2-5 hours to complete
- Projects build on each other in complexity`

    const userPrompt = `Create a project-based learning path for:

SUBJECT: "${prompt}"
COURSE: ${interpretation.title}
APPROACH: ${interpretation.approach}
AUDIENCE: ${interpretation.targetAudience}
DURATION: ${interpretation.estimatedDuration}
${sourcesContext}

Design 4-6 hands-on projects that teach this subject through DOING.

Return ONLY valid JSON:
{
  "title": "${interpretation.title}",
  "subtitle": "Engaging subtitle highlighting value",
  "description": "What learners will build and learn",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "learningOutcomes": [
    "By the end, you will be able to...",
    "You'll have built..."
  ],
  "projects": [
    {
      "title": "Project 1: Build a [Specific Thing]",
      "description": "What you'll create and why it matters",
      "deliverable": "A working [X] that does [Y]",
      "difficulty": "beginner",
      "estimatedHours": 3,
      "objectives": [
        "Learn [concept]",
        "Practice [skill]"
      ],
      "skills": ["skill1", "skill2"]
    }
  ]
}

PROJECT PROGRESSION GUIDELINES:
- Project 1: Foundation - setup, basics, simple implementation
- Project 2: Core skills - main concepts with guided practice  
- Project 3: Integration - combine concepts, moderate complexity
- Project 4: Real-world - production patterns, best practices
- Project 5-6: Capstone - complex application, minimal guidance

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

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }
    
    let jsonString = jsonMatch[0]
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\x00-\x1F\x7F]/g, ' ')
    
    let courseOutline: CourseOutline
    try {
      courseOutline = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('[generate-course-v2] JSON parse error:', parseError)
      throw new Error('Failed to parse course structure')
    }

    // Validate structure
    if (!courseOutline.projects || courseOutline.projects.length === 0) {
      throw new Error('No projects generated')
    }

    // Step 3: Create course in database
    const courseId = crypto.randomUUID().slice(0, 12)
    const now = Date.now()

    // Save base course metadata (using existing course table for compatibility)
    const courseMetadata = {
      type: 'course-v2' as const,
      title: courseOutline.title,
      subtitle: courseOutline.subtitle,
      description: courseOutline.description,
      subject: interpretation,
      version: 2,
      projectCount: courseOutline.projects.length,
      difficulty: courseOutline.difficulty || 'intermediate',
      learningOutcomes: courseOutline.learningOutcomes || [],
      primarySources: academicResults.citations,
      generatedAt: now,
      lastUpdated: now
    }

    await cloudDb.saveCourse(userId, courseId, courseMetadata)

    // Step 4: Generate each project with tasks (in background for faster response)
    // For now, create project placeholders and generate tasks on first access
    const projectPromises = courseOutline.projects.map(async (proj, idx) => {
      const projectId = crypto.randomUUID().slice(0, 12)
      
      await cloudDb.createCourseProject(courseId, {
        id: projectId,
        title: proj.title,
        description: proj.description,
        difficulty: proj.difficulty || courseOutline.difficulty,
        deliverable: proj.deliverable,
        technologies: proj.skills || [],
        objectives: proj.objectives || [],
        prerequisites: idx > 0 ? [] : [],
        estimatedHours: proj.estimatedHours || 3,
        orderIndex: idx
      })

      // Mark first project as available
      if (idx === 0 && userId) {
        await cloudDb.upsertProjectProgress(userId, projectId, 'available')
      }

      return {
        id: projectId,
        title: proj.title,
        description: proj.description,
        deliverable: proj.deliverable,
        difficulty: proj.difficulty,
        estimatedHours: proj.estimatedHours,
        orderIndex: idx,
        taskCount: 0  // Tasks will be generated on first access
      }
    })

    const createdProjects = await Promise.all(projectPromises)

    return NextResponse.json({
      courseId,
      title: courseOutline.title,
      subtitle: courseOutline.subtitle,
      description: courseOutline.description,
      difficulty: courseOutline.difficulty,
      learningOutcomes: courseOutline.learningOutcomes,
      projects: createdProjects,
      stats: {
        totalProjects: createdProjects.length,
        estimatedHours: createdProjects.reduce((sum, p) => sum + p.estimatedHours, 0)
      }
    })

  } catch (error) {
    console.error('[/api/learning/generate-course-v2] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate course structure', details: String(error) },
      { status: 500 }
    )
  }
}
