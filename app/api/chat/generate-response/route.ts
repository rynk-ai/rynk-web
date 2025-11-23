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

    const { messageId, conversationId } = await request.json() as any

    if (!messageId || !conversationId) {
      return new Response(
        JSON.stringify({ error: "messageId and conversationId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    return await chatService.generateAIResponseForMessage(
      messageId,
      conversationId,
      session.user.id
    )

  } catch (error: any) {
    console.error("Generate response error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
