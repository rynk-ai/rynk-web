/**
 * Task Evaluation API
 * 
 * POST /api/learning/evaluate
 * 
 * Evaluates a task submission against a rubric using AI.
 * This is the core of the "real assessment" system.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAIProvider } from '@/lib/services/ai-factory'
import { cloudDb } from '@/lib/services/cloud-db'
import type { TaskRubric, TaskEvaluation } from '@/lib/services/project-types'

interface EvaluateRequest {
  taskId: string
  submission: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as EvaluateRequest
    const { taskId, submission } = body

    if (!taskId || !submission) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, submission' },
        { status: 400 }
      )
    }

    // Get task details
    const task = await cloudDb.getTask(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Create submission record
    const submissionId = crypto.randomUUID().slice(0, 12)
    await cloudDb.createSubmission({
      id: submissionId,
      taskId,
      userId: session.user.id,
      content: submission
    })

    // Evaluate using AI
    const aiProvider = getAIProvider(false)
    const rubric = task.rubric as TaskRubric
    
    const systemPrompt = `You are an expert code reviewer and educator evaluating a student's submission.

Your evaluation must be:
1. OBJECTIVE: Score based on the rubric criteria, not subjective opinions
2. CONSTRUCTIVE: Give specific, actionable feedback
3. ENCOURAGING: Acknowledge what was done well before critiquing
4. PRACTICAL: Suggest concrete improvements, not vague advice

Be strict but fair. A passing score (70+) should mean the work is genuinely good.`

    // Build rubric text
    const rubricText = rubric.criteria?.map(c => 
      `${c.name} (${c.weight}% weight): ${c.description}\n` +
      `Levels:\n` +
      c.levels.map(l => `  - ${l.score}%: ${l.label} - ${l.description}`).join('\n')
    ).join('\n\n') || 'No rubric provided'

    const userPrompt = `Evaluate this ${task.type} submission:

## TASK: ${task.title}

## INSTRUCTIONS:
${task.instructions}

## RUBRIC:
${rubricText}

## STUDENT SUBMISSION:
\`\`\`
${submission}
\`\`\`

Evaluate the submission against each rubric criterion. Be objective and fair.

Return ONLY valid JSON:
{
  "criteriaScores": {
    "${rubric.criteria?.[0]?.name || 'Criterion1'}": 75,
    "${rubric.criteria?.[1]?.name || 'Criterion2'}": 50
  },
  "overallScore": 65,
  "feedback": "Overall assessment in 2-3 sentences. What did they do well? What needs work?",
  "strengths": [
    "Specific thing they did well",
    "Another strength"
  ],
  "improvements": [
    "Specific thing to improve with actionable advice",
    "Another improvement suggestion"
  ],
  "suggestions": [
    "Concrete next step to improve",
    "Another actionable suggestion"
  ]
}

SCORING GUIDELINES:
- Calculate overallScore as weighted average of criteriaScores using rubric weights
- Score each criterion objectively based on the rubric levels
- Be specific in feedback - reference their actual code/work
- Passing score is ${task.passingScore}%

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

    // Parse evaluation
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[evaluate] No JSON found in response:', content.slice(0, 500))
      return NextResponse.json(
        { error: 'Failed to parse evaluation' },
        { status: 500 }
      )
    }

    let evaluationResult: {
      criteriaScores: Record<string, number>
      overallScore: number
      feedback: string
      strengths: string[]
      improvements: string[]
      suggestions: string[]
    }

    try {
      const jsonString = jsonMatch[0]
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\x00-\x1F\x7F]/g, ' ')
      
      evaluationResult = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('[evaluate] JSON parse error:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse evaluation response' },
        { status: 500 }
      )
    }

    // Determine if passed
    const passed = evaluationResult.overallScore >= task.passingScore

    // Build full evaluation
    const evaluation: TaskEvaluation = {
      score: evaluationResult.overallScore,
      passed,
      feedback: evaluationResult.feedback,
      criteriaScores: evaluationResult.criteriaScores,
      strengths: evaluationResult.strengths || [],
      improvements: evaluationResult.improvements || [],
      suggestions: evaluationResult.suggestions || [],
      evaluatedAt: Date.now()
    }

    // Save evaluation to submission
    await cloudDb.updateSubmissionEvaluation(submissionId, {
      score: evaluation.score,
      passed: evaluation.passed,
      feedback: evaluation.feedback,
      criteriaScores: evaluation.criteriaScores,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      suggestions: evaluation.suggestions
    })

    // Update project progress if task passed
    if (passed) {
      const project = await cloudDb.getCourseProject(task.projectId)
      if (project) {
        // Check if all tasks in project are now passed
        const allTasks = await cloudDb.getTasksByProject(task.projectId)
        let allPassed = true
        
        for (const t of allTasks) {
          if (t.id === taskId) continue  // Current task just passed
          const latestSubmission = await cloudDb.getLatestSubmission(t.id, session.user.id)
          if (!latestSubmission?.passed) {
            allPassed = false
            break
          }
        }

        // Update project status
        if (allPassed) {
          await cloudDb.upsertProjectProgress(session.user.id, task.projectId, 'completed')
          
          // Unlock next project
          const allProjects = await cloudDb.getProjectsByCourse(project.courseId)
          const currentIndex = allProjects.findIndex(p => p.id === task.projectId)
          if (currentIndex >= 0 && currentIndex < allProjects.length - 1) {
            const nextProject = allProjects[currentIndex + 1]
            await cloudDb.upsertProjectProgress(session.user.id, nextProject.id, 'available')
          }
        } else {
          await cloudDb.upsertProjectProgress(session.user.id, task.projectId, 'in_progress')
        }
      }
    }

    // Calculate XP earned
    const xpEarned = passed ? Math.round(10 + (evaluation.score - task.passingScore) / 2) : 0

    return NextResponse.json({
      submissionId,
      evaluation,
      xpEarned,
      passed
    })

  } catch (error) {
    console.error('[/api/learning/evaluate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate submission', details: String(error) },
      { status: 500 }
    )
  }
}
