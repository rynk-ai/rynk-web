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
    const surfaceId = searchParams.get('surfaceId') // Optional: load specific surface

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

    // Get surface data for this type
    const surfaceData = conversation.surfaceStates?.[surfaceType]
    
    let surfaceState = null
    let allSurfaces: any[] = []
    
    if (Array.isArray(surfaceData)) {
      // New array format
      allSurfaces = surfaceData
      if (surfaceId) {
        // Load specific surface by ID
        surfaceState = surfaceData.find((s: any) => s.id === surfaceId) || null
      } else {
        // Load the most recent one (last in array)
        surfaceState = surfaceData[surfaceData.length - 1] || null
      }
    } else if (surfaceData && typeof surfaceData === 'object') {
      // Legacy single-object format
      surfaceState = surfaceData
      allSurfaces = [surfaceData]
    }

    return NextResponse.json({
      found: !!surfaceState,
      surfaceState,
      allSurfaces, // Include all surfaces for this type
      surfaceId: surfaceState?.id || null,
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
    const { conversationId, surfaceType, surfaceState, surfaceId } = body as {
      conversationId: string
      surfaceType: SurfaceType
      surfaceState: SurfaceState
      surfaceId?: string  // Optional: if updating existing surface
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

    // Get existing surface states (could be old format or new array format)
    const existingStates = conversation.surfaceStates || {}
    const existingForType = existingStates[surfaceType]
    
    // Generate unique ID for new surfaces
    const newSurfaceId = surfaceId || `${surfaceType}-${Date.now()}`
    
    // Add ID and timestamp to the surface state
    const enrichedState = {
      ...surfaceState,
      id: newSurfaceId,
      savedAt: Date.now(),
    }
    
    let updatedTypeArray: any[]
    
    if (Array.isArray(existingForType)) {
      // Already new array format - check if updating existing or adding new
      const existingIndex = existingForType.findIndex((s: any) => s.id === surfaceId)
      if (existingIndex >= 0) {
        // Update existing
        updatedTypeArray = [...existingForType]
        updatedTypeArray[existingIndex] = enrichedState
      } else {
        // Add new (limit to 10 per type for performance)
        updatedTypeArray = [...existingForType, enrichedState].slice(-10)
      }
    } else if (existingForType && typeof existingForType === 'object') {
      // Old single-object format - convert to array
      const oldSurface = {
        ...existingForType,
        id: existingForType.id || `${surfaceType}-legacy`,
        savedAt: existingForType.savedAt || Date.now() - 1000,
      }
      updatedTypeArray = [oldSurface, enrichedState]
    } else {
      // No existing - start new array
      updatedTypeArray = [enrichedState]
    }

    // Merge with existing surface states
    const updatedSurfaceStates = {
      ...existingStates,
      [surfaceType]: updatedTypeArray,
    }

    // Update conversation
    await cloudDb.updateConversation(conversationId, {
      surfaceStates: updatedSurfaceStates,
    })

    console.log(`[/api/surface/state] Saved ${surfaceType} (id: ${newSurfaceId}) for ${conversationId}`)

    return NextResponse.json({
      success: true,
      surfaceType,
      surfaceId: newSurfaceId,
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
