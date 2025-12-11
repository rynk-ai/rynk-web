/**
 * Surface State API - Load and Save Surface States
 * 
 * GET  - Load persisted surface state for a conversation
 * POST - Save updated surface state
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cloudDb } from '@/lib/services/cloud-db'
import type { SurfaceState, SurfaceType } from '@/lib/services/domain-types'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const surfaceType = searchParams.get('type') as SurfaceType | null

    if (!conversationId || !surfaceType) {
      return NextResponse.json(
        { error: 'Missing conversationId or type' },
        { status: 400 }
      )
    }

    // Get conversation with surface states
    const conversation = await cloudDb.getConversation(conversationId)
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Check ownership
    if (conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get specific surface state
    const surfaceState = conversation.surfaceStates?.[surfaceType] || null

    return NextResponse.json({
      found: !!surfaceState,
      surfaceState,
    })
  } catch (error) {
    console.error('[/api/surface/state] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load surface state' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, surfaceType, surfaceState } = body as {
      conversationId: string
      surfaceType: SurfaceType
      surfaceState: SurfaceState
    }

    if (!conversationId || !surfaceType || !surfaceState) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get conversation to verify ownership and get existing states
    const conversation = await cloudDb.getConversation(conversationId)
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Merge with existing surface states
    const updatedSurfaceStates = {
      ...(conversation.surfaceStates || {}),
      [surfaceType]: surfaceState,
    }

    // Update conversation
    await cloudDb.updateConversation(conversationId, {
      surfaceStates: updatedSurfaceStates,
    })

    console.log(`[/api/surface/state] Saved ${surfaceType} state for ${conversationId}`)

    return NextResponse.json({
      success: true,
      surfaceType,
    })
  } catch (error) {
    console.error('[/api/surface/state] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to save surface state' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const surfaceType = searchParams.get('type') as SurfaceType | null

    if (!conversationId || !surfaceType) {
      return NextResponse.json(
        { error: 'Missing conversationId or type' },
        { status: 400 }
      )
    }

    // Get conversation to verify ownership
    const conversation = await cloudDb.getConversation(conversationId)
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Remove the specific surface type from surfaceStates
    const updatedSurfaceStates = { ...(conversation.surfaceStates || {}) }
    delete updatedSurfaceStates[surfaceType]

    // Update conversation with remaining states (or empty object)
    await cloudDb.updateConversation(conversationId, {
      surfaceStates: Object.keys(updatedSurfaceStates).length > 0 
        ? updatedSurfaceStates 
        : null, // Set to null if no surfaces remain
    })

    console.log(`[/api/surface/state] Deleted ${surfaceType} state for ${conversationId}`)

    return NextResponse.json({
      success: true,
      deleted: surfaceType,
    })
  } catch (error) {
    console.error('[/api/surface/state] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete surface state' },
      { status: 500 }
    )
  }
}
