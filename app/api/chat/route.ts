import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { chatService } from "@/lib/services/chat-service";



export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const { 
      message,           // For new messages (normal flow)
      messageId,         // For existing messages (edit flow)
      conversationId, 
      attachments, 
      referencedConversations, 
      referencedFolders,
      useReasoning       // Reasoning mode: 'auto' | 'on' | 'online' | 'off'
    } = await request.json() as any

    console.log('📨 [/api/chat] Raw Request Body:', {
      messageId,
      conversationId,
      hasMessage: !!message,
      messagePreview: message?.substring(0, 20),
      attachmentsCount: attachments?.length || 0,
      attachments: attachments?.map((a: any) => ({ name: a.name, type: a.type, url: a.url?.substring(0, 50) })) || []
    });

    // Validate: Either message or messageId must be provided (but not both)
    if ((!message && !messageId) || !conversationId) {
      console.error('❌ [/api/chat] Invalid request: missing required fields');
      return new Response(
        JSON.stringify({ error: "Either 'message' or 'messageId' and 'conversationId' are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const userMessageIdHeader = request.headers.get('X-User-Message-Id')
    const assistantMessageIdHeader = request.headers.get('X-Assistant-Message-Id')

    return await chatService.handleChatRequest(
      session.user.id,
      conversationId,
      message,
      messageId,
      attachments,
      referencedConversations,
      referencedFolders,
      userMessageIdHeader,
      assistantMessageIdHeader,
      useReasoning || 'auto'
    )

  } catch (error: any) {
    console.error("❌ [/api/chat] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
