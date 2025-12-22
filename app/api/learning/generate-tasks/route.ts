/**
 * Generate Tasks for a Project
 * 
 * POST /api/learning/generate-tasks
 * 
 * Generates tasks with rubrics for a specific project.
 * Called when a project is accessed and has no tasks yet.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'
import { cloudDb } from '@/lib/services/cloud-db'
import type { TaskRubric } from '@/lib/services/project-types'

interface GenerateTasksRequest {
  projectId: string
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as GenerateTasksRequest
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    // Get project details
    const project = await cloudDb.getCourseProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if tasks already exist
    const existingTasks = await cloudDb.getTasksByProject(projectId)
    if (existingTasks.length > 0) {
      return NextResponse.json({
        projectId,
        tasks: existingTasks,
        cached: true
      })
    }

    // Get course for context
    const course = await cloudDb.getCourse(project.courseId)
    const courseTitle = course?.metadata?.title || 'Learning Course'

    // Generate tasks using AI
    const aiProvider = getAIProvider(false)
    
    const systemPrompt = `You are a senior curriculum designer creating hands-on tasks for a coding project.

Your tasks must:
1. BUILD toward the project deliverable step by step
2. BE PRACTICAL - learners write real code or create real artifacts
3. HAVE CLEAR RUBRICS - objective criteria for AI evaluation
4. INCLUDE HINTS - progressive help for when learners get stuck
5. PROGRESS IN DIFFICULTY - start easy, end challenging

Task types:
- "coding": Write/modify code
- "writing": Documentation, planning, essays
- "design": Create diagrams, mockups (describe what to create)
- "quiz": Quick knowledge checks
- "reflection": Self-assessment, planning`

    const userPrompt = `Create 4-6 hands-on tasks for this project:

COURSE: ${courseTitle}
PROJECT: ${project.title}
DESCRIPTION: ${project.description}
DELIVERABLE: ${project.deliverable}
TECHNOLOGIES: ${(project.technologies || []).join(', ') || 'Appropriate for the topic'}
OBJECTIVES: ${(project.objectives || []).join(', ') || 'Build the deliverable'}
DIFFICULTY: ${project.difficulty}
TIME: ~${project.estimatedHours} hours total

Return JSON array of tasks:
[
  {
    "title": "Task 1: Setup and Foundation",
    "type": "coding",
    "estimatedMinutes": 25,
    "instructions": "Detailed markdown instructions:\\n\\n## Objective\\nWhat to build\\n\\n## Requirements\\n- Requirement 1\\n- Requirement 2\\n\\n## Expected Output\\nWhat the completed task should look like",
    "starterCode": "// Starter code if coding task\\n\\n",
    "hints": [
      "First hint - general direction",
      "Second hint - more specific",
      "Third hint - nearly the answer"
    ],
    "rubric": {
      "criteria": [
        {
          "name": "Functionality",
          "description": "Code runs correctly",
          "weight": 40,
          "levels": [
            { "score": 0, "label": "Not Working", "description": "Won't run or crashes" },
            { "score": 50, "label": "Partial", "description": "Some features work" },
            { "score": 100, "label": "Complete", "description": "All features work" }
          ]
        },
        {
          "name": "Code Quality",
          "description": "Clean, readable code",
          "weight": 30,
          "levels": [
            { "score": 0, "label": "Poor", "description": "Hard to read" },
            { "score": 50, "label": "Acceptable", "description": "Basic organization" },
            { "score": 100, "label": "Excellent", "description": "Well-organized" }
          ]
        },
        {
          "name": "Requirements",
          "description": "Meets specifications",
          "weight": 30,
          "levels": [
            { "score": 0, "label": "Missing", "description": "Requirements not met" },
            { "score": 50, "label": "Partial", "description": "Some requirements met" },
            { "score": 100, "label": "Complete", "description": "All requirements met" }
          ]
        }
      ]
    },
    "passingScore": 70
  }
]

TASK PROGRESSION:
1. Setup/foundation - get the basics working
2. Core feature - main functionality
3. Enhancement - add features or polish
4. Final integration - complete the deliverable

For non-coding tasks, adjust rubric criteria appropriately.
Ensure rubric weights sum to 100 for each task.

Return ONLY the JSON array, no other text.`

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

    // Parse JSON array
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('[generate-tasks] No JSON array found:', content.slice(0, 500))
      return NextResponse.json(
        { error: 'Failed to generate tasks' },
        { status: 500 }
      )
    }

    let tasks: GeneratedTask[]
    try {
      let jsonString = jsonMatch[0]
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\x00-\x1F\x7F]/g, ' ')
      
      tasks = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('[generate-tasks] JSON parse error:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse tasks' },
        { status: 500 }
      )
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: 'No tasks generated' },
        { status: 500 }
      )
    }

    // Save tasks to database
    const savedTasks = []
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
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

      savedTasks.push({
        id: taskId,
        title: task.title,
        type: task.type,
        estimatedMinutes: task.estimatedMinutes,
        orderIndex: i
      })
    }

    return NextResponse.json({
      projectId,
      tasks: savedTasks,
      cached: false
    })

  } catch (error) {
    console.error('[/api/learning/generate-tasks] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate tasks', details: String(error) },
      { status: 500 }
    )
  }
}
