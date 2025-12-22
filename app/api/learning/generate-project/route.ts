/**
 * Project Generation API
 * 
 * POST /api/learning/generate-project
 * 
 * Generates a hands-on project with tasks, rubrics, and starter code.
 * This replaces the old section-based content generation with project-based learning.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'
import { cloudDb } from '@/lib/services/cloud-db'
import type { TaskRubric } from '@/lib/services/project-types'

interface GenerateProjectRequest {
  courseId: string
  courseTitle: string
  subject: string
  projectIndex: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  technologies?: string[]
  totalProjects?: number
}

interface GeneratedTask {
  title: string
  type: 'coding' | 'writing' | 'design' | 'quiz' | 'reflection'
  estimatedMinutes: number
  instructions: string
  starterCode?: string
  hints?: string[]
  rubric: TaskRubric
  passingScore: number
}

interface GeneratedProject {
  title: string
  description: string
  deliverable: string
  estimatedHours: number
  objectives: string[]
  tasks: GeneratedTask[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as GenerateProjectRequest
    const { 
      courseId, 
      courseTitle, 
      subject, 
      projectIndex, 
      difficulty,
      technologies,
      totalProjects = 5 
    } = body

    if (!courseId || !courseTitle || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, courseTitle, subject' },
        { status: 400 }
      )
    }

    const aiProvider = getAIProvider(false)
    
    const systemPrompt = `You are a senior curriculum designer creating hands-on coding projects for an online learning platform.

Your projects must follow these principles:
1. **TANGIBLE DELIVERABLE**: Every project results in something the learner can show off
2. **HANDS-ON**: 80% doing, 20% reading - learners build, don't just consume
3. **PROGRESSIVE TASKS**: 4-6 tasks that build toward the final deliverable
4. **REAL EVALUATION**: Each task has clear rubric criteria for AI evaluation
5. **PRACTICAL SKILLS**: Focus on skills employers actually want

Task types you can use:
- "coding": Write and submit code
- "writing": Documentation, essays, technical writing
- "design": Create mockups, diagrams (describe what to create)
- "quiz": Knowledge check questions
- "reflection": Self-assessment, planning tasks`

    const userPrompt = `Create a hands-on project for this course:

COURSE: ${courseTitle}
SUBJECT: ${subject}
PROJECT #: ${projectIndex + 1} of ${totalProjects}
DIFFICULTY: ${difficulty}
TECHNOLOGIES: ${technologies?.join(', ') || 'appropriate for the subject'}

Project ${projectIndex + 1} progression:
${projectIndex === 0 ? '- First project: Focus on fundamentals and setup' : ''}
${projectIndex === 1 ? '- Second project: Apply core concepts with guidance' : ''}
${projectIndex === 2 ? '- Third project: Build something more complex independently' : ''}
${projectIndex >= 3 ? '- Later project: Advanced features and real-world patterns' : ''}

Return JSON:
{
  "title": "Build a [Specific Thing]",
  "description": "2-3 sentences: What you'll build and why it matters",
  "deliverable": "A working [X] that does [Y]",
  "estimatedHours": 3,
  "objectives": [
    "Learn how to...",
    "Practice...", 
    "Understand..."
  ],
  "tasks": [
    {
      "title": "Task 1: Setup and Basics",
      "type": "coding",
      "estimatedMinutes": 30,
      "instructions": "Detailed step-by-step instructions in markdown format.\\n\\nInclude:\\n- What to build\\n- Specific requirements\\n- Expected output\\n- Any constraints",
      "starterCode": "// Starting point for the task\\n\\n",
      "hints": [
        "If stuck, try this approach...",
        "Remember that..."
      ],
      "rubric": {
        "criteria": [
          {
            "name": "Functionality",
            "description": "Code runs and produces expected output",
            "weight": 40,
            "levels": [
              { "score": 0, "label": "Not Working", "description": "Code has errors or doesn't run" },
              { "score": 50, "label": "Partial", "description": "Some features work but not all" },
              { "score": 100, "label": "Complete", "description": "All required features work correctly" }
            ]
          },
          {
            "name": "Code Quality",
            "description": "Clean, readable, well-organized code",
            "weight": 30,
            "levels": [
              { "score": 0, "label": "Poor", "description": "Hard to read, no structure" },
              { "score": 50, "label": "Acceptable", "description": "Basic organization, could improve" },
              { "score": 100, "label": "Excellent", "description": "Well-organized, clear naming, good practices" }
            ]
          },
          {
            "name": "Requirements",
            "description": "Follows all specified requirements",
            "weight": 30,
            "levels": [
              { "score": 0, "label": "Missing", "description": "Many requirements not met" },
              { "score": 50, "label": "Partial", "description": "Some requirements met" },
              { "score": 100, "label": "Complete", "description": "All requirements fully met" }
            ]
          }
        ]
      },
      "passingScore": 70
    }
  ]
}

REQUIREMENTS:
- Create 4-6 tasks that build toward the deliverable
- Each task should take 20-45 minutes
- Final task should integrate all learning
- Make tasks progressively harder
- Include practical coding challenges, not just reading
- Rubric weights must sum to 100 for each task

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

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[generate-project] No JSON found in response:', content.slice(0, 500))
      return NextResponse.json(
        { error: 'Failed to generate project structure' },
        { status: 500 }
      )
    }

    let project: GeneratedProject
    try {
      // Clean up common JSON issues
      let jsonString = jsonMatch[0]
        .replace(/,\s*([}\]])/g, '$1')  // Remove trailing commas
        .replace(/[\x00-\x1F\x7F]/g, ' ')  // Remove control chars
      
      project = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('[generate-project] JSON parse error:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse project structure' },
        { status: 500 }
      )
    }

    // Validate project structure
    if (!project.title || !project.tasks || !Array.isArray(project.tasks) || project.tasks.length === 0) {
      return NextResponse.json(
        { error: 'Invalid project structure: missing title or tasks' },
        { status: 500 }
      )
    }

    // Generate IDs and save to database
    const projectId = crypto.randomUUID().slice(0, 12)
    
    // Save project
    await cloudDb.createCourseProject(courseId, {
      id: projectId,
      title: project.title,
      description: project.description,
      difficulty,
      deliverable: project.deliverable,
      technologies: technologies || [],
      objectives: project.objectives || [],
      prerequisites: projectIndex > 0 ? [] : [],  // Could link to previous project
      estimatedHours: project.estimatedHours || 3,
      orderIndex: projectIndex
    })

    // Save tasks
    for (let i = 0; i < project.tasks.length; i++) {
      const task = project.tasks[i]
      const taskId = crypto.randomUUID().slice(0, 12)
      
      await cloudDb.createTask(projectId, {
        id: taskId,
        title: task.title,
        description: task.instructions?.slice(0, 200) || '',
        type: task.type || 'coding',
        instructions: task.instructions || '',
        starterCode: task.starterCode,
        resources: [],
        hints: task.hints || [],
        rubric: task.rubric || { criteria: [] },
        passingScore: task.passingScore || 70,
        estimatedMinutes: task.estimatedMinutes || 30,
        orderIndex: i
      })
    }

    // Mark first project as available for the user
    if (projectIndex === 0) {
      await cloudDb.upsertProjectProgress(session.user.id, projectId, 'available')
    }

    return NextResponse.json({
      projectId,
      project: {
        id: projectId,
        ...project,
        difficulty,
        orderIndex: projectIndex
      }
    })

  } catch (error) {
    console.error('[/api/learning/generate-project] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate project', details: String(error) },
      { status: 500 }
    )
  }
}
