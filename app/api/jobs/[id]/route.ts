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
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: jobId } = await params

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Get the Durable Object stub
    const { env } = getCloudflareContext()
    
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
