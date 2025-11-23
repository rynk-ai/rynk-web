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
      message, 
      conversationId, 
      attachments, 
      referencedConversations, 
      referencedFolders 
    } = await request.json() as any

    if (!message || !conversationId) {
      return new Response(
        JSON.stringify({ error: "Message and conversationId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    return await chatService.handleChatRequest(
      session.user.id,
      conversationId,
      message,
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
