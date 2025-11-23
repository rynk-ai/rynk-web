import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { chatService } from "@/lib/services/chat-service";

export const runtime = 'edge'

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
      referencedFolders 
    } = await request.json() as any

    // Validate: Either message or messageId must be provided (but not both)
    if ((!message && !messageId) || !conversationId) {
      return new Response(
        JSON.stringify({ error: "Either 'message' or 'messageId' and 'conversationId' are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    return await chatService.handleChatRequest(
      session.user.id,
      conversationId,
      message,
      messageId,
      attachments,
      referencedConversations,
      referencedFolders
    )

  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
