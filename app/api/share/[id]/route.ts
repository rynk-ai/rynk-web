import { auth } from '@/lib/auth'
import { cloudDb } from '@/lib/services/cloud-db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/share/[id] - Get shared conversation data (PUBLIC - no auth required)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params
    
    const share = await cloudDb.getShare(shareId)
    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }
    
    if (!share.isActive) {
      return NextResponse.json({ error: 'This conversation is no longer shared' }, { status: 410 })
    }
    
    // Check expiration if set
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 })
    }

    // Get the conversation and messages
    const conversation = await cloudDb.getConversation(share.conversationId)
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { messages } = await cloudDb.getMessages(share.conversationId, 1000)
    
    // Increment view count (don't await to avoid slowing response)
    cloudDb.incrementShareViewCount(shareId).catch(console.error)

    return NextResponse.json({
      share: {
        id: share.id,
        title: share.title,
        viewCount: share.viewCount,
        cloneCount: share.cloneCount,
        createdAt: share.createdAt
      },
      conversation: {
        title: conversation.title,
        tags: conversation.tags,
        surfaceStates: conversation.surfaceStates,
        createdAt: conversation.createdAt
      },
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        reasoning_metadata: m.reasoning_metadata,
        web_annotations: m.web_annotations,
        model_used: m.model_used
      }))
    })
  } catch (error: any) {
    console.error('[/api/share/[id]] Error fetching share:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch share' }, { status: 500 })
  }
}

// DELETE /api/share/[id] - Deactivate share (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await cloudDb.getUser(session.user.email)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id: shareId } = await params
    
    const success = await cloudDb.deactivateShare(shareId, user.id as string)
    if (!success) {
      return NextResponse.json({ error: 'Share not found or not owned by you' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[/api/share/[id]] Error deactivating share:', error)
    return NextResponse.json({ error: error.message || 'Failed to deactivate share' }, { status: 500 })
  }
}
