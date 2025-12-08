import { NextRequest } from "next/server";
import { getGuestIdFromRequest } from "@/lib/guest";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAIProvider } from "@/lib/services/ai-factory";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();
    const { id: subChatId } = await params;

    if (!guestId) {
      return new Response(JSON.stringify({ error: "Guest ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { content }: any = await request.json();

    if (!content || !content.trim()) {
      return new Response(
        JSON.stringify({ error: "Message content is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the sub-chat
    const subChat = await env.DB.prepare(
      `SELECT * FROM guest_sub_chats WHERE id = ?`
    )
      .bind(subChatId)
      .first();

    if (!subChat) {
      return new Response(
        JSON.stringify({ error: "Sub-chat not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse existing messages
    const messages = subChat.messages ? JSON.parse(subChat.messages as string) : [];

    // Add user message
    const userMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: content.trim(),
      createdAt: Date.now(),
    };
    messages.push(userMessage);

    // Prepare context for AI
    const quotedText = subChat.quoted_text as string;
    const sourceContent = subChat.source_message_content as string;

    const aiMessages = [
      {
        role: "system",
        content: `You are a helpful assistant. The user is asking about a specific part of a conversation.
        
Context from the original message:
"${sourceContent}"

The user highlighted this specific text:
"${quotedText}"

Answer the user's question about this specific context. Be concise and helpful.`,
      },
      ...messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // Get AI response
    const aiProvider = getAIProvider(false);
    let fullResponse = "";

    const stream = aiProvider.sendMessage({ messages: aiMessages });
    for await (const chunk of stream) {
      fullResponse += chunk;
    }

    // Add assistant message
    const assistantMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: "assistant",
      content: fullResponse,
      createdAt: Date.now(),
    };
    messages.push(assistantMessage);

    // Update sub-chat in database
    await env.DB.prepare(
      `UPDATE guest_sub_chats SET messages = ?, updated_at = ? WHERE id = ?`
    )
      .bind(JSON.stringify(messages), new Date().toISOString(), subChatId)
      .run();

    // Return updated sub-chat
    return new Response(
      JSON.stringify({
        subChat: {
          id: subChat.id,
          conversationId: subChat.conversation_id,
          sourceMessageId: subChat.source_message_id,
          quotedText: subChat.quoted_text,
          sourceMessageContent: subChat.source_message_content,
          messages,
          createdAt: new Date(subChat.created_at as string).getTime(),
          updatedAt: Date.now(),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ [/api/guest/sub-chats/[id]/message] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
