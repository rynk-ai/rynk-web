/**
 * Course V2 API - Project-Based Learning
 * 
 * GET /api/learning/course-v2/[id]
 * 
 * Returns the course with projects, tasks and user progress.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cloudDb } from '@/lib/services/cloud-db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: courseId } = await params

    // Get course with projects and progress
    const courseData = await cloudDb.getCourseV2WithProgress(courseId, session.user.id)
    
    if (!courseData) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Enrich projects with status info
    const enrichedProjects = courseData.projects.map((project: any, idx: number) => {
      const progress = courseData.userProgress.projectProgress[project.id]
      
      // Calculate task completion
      let completedTasks = 0
      for (const task of project.tasks || []) {
        const submission = courseData.userProgress.taskSubmissions[task.id]
        if (submission?.passed) {
          completedTasks++
          task.status = 'passed'
        } else if (submission) {
          task.status = 'attempted'
        } else {
          task.status = 'pending'
        }
        task.submission = submission
      }
      
      const totalTasks = project.tasks?.length || 0
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      
      // Determine project status
      let status = progress?.status || 'locked'
      if (idx === 0 && !progress) {
        status = 'available'  // First project always available
      }
      
      return {
        ...project,
        status,
        progress: progressPercent,
        completedTasks,
        totalTasks
      }
    })

    return NextResponse.json({
      id: courseData.id,
      title: courseData.metadata?.title || courseData.title,
      subtitle: courseData.metadata?.subtitle,
      description: courseData.metadata?.description,
      difficulty: courseData.difficulty,
      projects: enrichedProjects,
      stats: {
        totalProjects: enrichedProjects.length,
        completedProjects: enrichedProjects.filter((p: any) => p.status === 'completed').length,
        currentStreak: courseData.currentStreak || 0,
        xp: courseData.xp || 0
      }
    })

  } catch (error) {
    console.error('[/api/learning/course-v2/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course', details: String(error) },
      { status: 500 }
    )
  }
}
