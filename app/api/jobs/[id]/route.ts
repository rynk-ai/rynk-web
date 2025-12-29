/**
 * Job Status API
 * 
 * GET /api/jobs/[id] - Get the status of a background job
 * 
 * Used by the frontend to poll for completion of async tasks
 * processed by the TaskProcessor Durable Object.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getCloudflareContext()
    
    // Auth check - Support both Web (Cookie) and Mobile (Bearer Token)
    let userId: string | undefined

    // 1. Try Web Session
    const session = await auth()
    if (session?.user?.id) {
      userId = session.user.id
    } else {
      // 2. Try Mobile Token
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const db = env.DB
        
        const mobileSession = await db.prepare(
          'SELECT user_id FROM mobile_sessions WHERE token = ? AND expires_at > datetime("now")'
        ).bind(token).first() as { user_id: string } | null
        
        if (mobileSession) {
          userId = mobileSession.user_id
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: jobId } = await params

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    
    // Check if TASK_PROCESSOR binding exists
    if (!env.TASK_PROCESSOR) {
      return NextResponse.json(
        { error: 'Task processor not configured' },
        { status: 503 }
      )
    }

    const doId = env.TASK_PROCESSOR.idFromName('global')
    const stub = env.TASK_PROCESSOR.get(doId)

    // Fetch job status from Durable Object
    const response = await stub.fetch(`http://do/status/${jobId}`)
    const data = await response.json()

    // Forward the response status
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('[/api/jobs/[id]] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/jobs/[id] - Cancel a job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: jobId } = await params

    if (!jobId) {
        return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    const { env } = getCloudflareContext()
    
    if (!env.TASK_PROCESSOR) {
      return NextResponse.json(
        { error: 'Task processor not configured' },
        { status: 503 }
      )
    }

    const doId = env.TASK_PROCESSOR.idFromName('global')
    const stub = env.TASK_PROCESSOR.get(doId)

    const response = await stub.fetch(`http://do/cancel/${jobId}`, {
      method: 'DELETE'
    })
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('[/api/jobs/[id]] DELETE Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
