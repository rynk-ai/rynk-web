/**
 * Learning Courses API
 * 
 * GET /api/learning/courses - Get user's courses
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cloudDb } from '@/lib/services/cloud-db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's courses from cloud database
    const courses = await cloudDb.getUserCourses(session.user.id)

    return NextResponse.json({ courses })
  } catch (error) {
    console.error('[/api/learning/courses] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}
