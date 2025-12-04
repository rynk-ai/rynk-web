import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { chatService } from '@/lib/services/chat-service'

/**
 * Agentic Chat API Route
 * Handles multi-source research requests with real-time status updates
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { 
      message,
      conversationId,
      userMessageId,
      assistantMessageId
    } = await request.json() as any

    if (!message || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message, conversationId' }),
        { status: 400 }
      )
    }

    // Call the agentic request handler
    return await chatService.handleAgenticRequest(
      session.user.id,
      conversationId,
      message,
      userMessageId,
      assistantMessageId
    )

  } catch (error: any) {
    console.error('❌ [/api/agentic-chat] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
