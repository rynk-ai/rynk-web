import { auth } from '@/lib/auth'
import { cloudDb } from '@/lib/services/cloud-db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/share/[id]/clone - Clone shared conversation to user's account
export async function POST(
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
    
    const result = await cloudDb.cloneConversation(shareId, user.id as string)
    
    return NextResponse.json({ 
      success: true, 
      conversationId: result.conversationId 
    })
  } catch (error: any) {
    console.error('[/api/share/[id]/clone] Error cloning:', error)
    return NextResponse.json({ error: error.message || 'Failed to clone conversation' }, { status: 500 })
  }
}
