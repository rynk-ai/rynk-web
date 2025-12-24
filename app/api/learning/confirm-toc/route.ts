/**
 * ToC Confirm API
 * 
 * POST /api/learning/confirm-toc - Save a previewed ToC to the database
 * Called after user approves the generated course structure
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import type { CourseMetadata } from '@/lib/services/domain-types'

interface ConfirmToCRequest {
  metadata: CourseMetadata
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as ConfirmToCRequest
    const { metadata } = body

    if (!metadata || !metadata.units || metadata.units.length === 0) {
      return NextResponse.json(
        { error: 'Valid course metadata is required' },
        { status: 400 }
      )
    }

    // Generate a new course ID
    const courseId = crypto.randomUUID().slice(0, 12)
    
    // Update timestamps
    const now = Date.now()
    const courseMetadata: CourseMetadata = {
      ...metadata,
      generatedAt: now,
      lastUpdated: now
    }

    // Save course to database
    const { cloudDb } = await import('@/lib/services/cloud-db')
    await cloudDb.saveCourse(session.user.id, courseId, courseMetadata)

    return NextResponse.json({
      courseId,
      metadata: courseMetadata
    })

  } catch (error) {
    console.error('[/api/learning/confirm-toc] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save course', details: String(error) },
      { status: 500 }
    )
  }
}
