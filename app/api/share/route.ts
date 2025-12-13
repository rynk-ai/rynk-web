import { auth } from '@/lib/auth'
import { cloudDb } from '@/lib/services/cloud-db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/share - Create a share link
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await cloudDb.getUser(session.user.email)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { conversationId } = await request.json() as { conversationId?: string }
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    // Verify ownership
    const conversation = await cloudDb.getConversation(conversationId)
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    if (conversation.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to share this conversation' }, { status: 403 })
    }

    // Check if already shared
    const existingShare = await cloudDb.getShareByConversationId(conversationId)
    if (existingShare) {
      return NextResponse.json({ share: existingShare })
    }

    // Create new share
    const share = await cloudDb.createShare(
      user.id as string,
      conversationId,
      conversation.title || 'Shared Chat'
    )

    return NextResponse.json({ share })
  } catch (error: any) {
    console.error('[/api/share] Error creating share:', error)
    return NextResponse.json({ error: error.message || 'Failed to create share' }, { status: 500 })
  }
}

// GET /api/share - List user's shares
export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await cloudDb.getUser(session.user.email)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const shares = await cloudDb.getSharesByUserId(user.id as string)
    return NextResponse.json({ shares })
  } catch (error: any) {
    console.error('[/api/share] Error listing shares:', error)
    return NextResponse.json({ error: error.message || 'Failed to list shares' }, { status: 500 })
  }
}
