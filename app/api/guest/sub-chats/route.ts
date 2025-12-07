import { NextRequest } from "next/server";
import { getGuestIdFromRequest } from "@/lib/guest";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();

    if (!guestId) {
      return new Response(JSON.stringify({ error: "Guest ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: "conversationId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Get guest sub-chats for the conversation
    const subChats = await env.DB.prepare(
      `SELECT gs.*, gm.content as source_message_content
         FROM guest_sub_chats gs
         JOIN guest_messages gm ON gs.source_message_id = gm.id
         WHERE gs.conversation_id = ? AND gm.guest_id = ?
         ORDER BY gs.updated_at DESC`,
    )
      .bind(conversationId, guestId)
      .all();

    // Transform to match expected format
    const formattedSubChats = (subChats.results || []).map((subChat: any) => ({
      id: subChat.id,
      conversationId: subChat.conversation_id,
      sourceMessageId: subChat.source_message_id,
      quotedText: subChat.quoted_text,
      sourceMessageContent: subChat.source_message_content,
      messages: subChat.messages ? JSON.parse(subChat.messages) : [],
      createdAt: new Date(subChat.created_at).getTime(),
      updatedAt: new Date(subChat.updated_at).getTime(),
    }));

    return new Response(JSON.stringify({ subChats: formattedSubChats }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ [/api/guest/sub-chats] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();

    if (!guestId) {
      return new Response(JSON.stringify({ error: "Guest ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      conversationId,
      sourceMessageId,
      quotedText,
      fullMessageContent,
    }: any = await request.json();

    if (!conversationId || !sourceMessageId || !quotedText) {
      return new Response(
        JSON.stringify({
          error: "conversationId, sourceMessageId, and quotedText are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const subChatId = `subchat_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await env.DB.prepare(
      `INSERT INTO guest_sub_chats (
          id, conversation_id, source_message_id, quoted_text,
          source_message_content, messages, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        subChatId,
        conversationId,
        sourceMessageId,
        quotedText,
        fullMessageContent || quotedText,
        JSON.stringify([]),
        new Date().toISOString(),
        new Date().toISOString(),
      )
      .run();

    return new Response(
      JSON.stringify({
        subChat: {
          id: subChatId,
          conversationId,
          sourceMessageId,
          quotedText,
          sourceMessageContent: fullMessageContent || quotedText,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("❌ [/api/guest/sub-chats] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
