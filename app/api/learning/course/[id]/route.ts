/**
 * Get Course API
 * 
 * GET /api/learning/course/[id] - Get course metadata and progress
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

    const course = await cloudDb.getCourse(courseId)
    
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(course)

  } catch (error) {
    console.error('[/api/learning/course/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    )
  }
}
