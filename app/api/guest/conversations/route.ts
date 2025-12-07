import { NextRequest } from "next/server";
import { getGuestIdFromRequest } from "@/lib/guest";
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();

    if (!guestId) {
      return new Response(
        JSON.stringify({ error: "Guest ID required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get guest conversations
    const conversations = await env.DB
      .prepare(
        `SELECT gc.*,
           COUNT(gm.id) as message_count,
           MAX(gm.created_at) as last_message_at
         FROM guest_conversations gc
         LEFT JOIN guest_messages gm ON gc.id = gm.conversation_id
         WHERE gc.guest_id = ?
         GROUP BY gc.id
         ORDER BY gc.updated_at DESC
         LIMIT 100`
      )
      .bind(guestId)
      .all();

    // Transform to match expected format
    const formattedConversations = (conversations.results || []).map((conv: any) => ({
      id: conv.id,
      title: conv.title || 'Untitled Chat',
      createdAt: new Date(conv.created_at).getTime(),
      updatedAt: new Date(conv.updated_at).getTime(),
      messageCount: conv.message_count || 0,
      isPinned: conv.is_pinned === 1,
      tags: conv.tags ? JSON.parse(conv.tags) : [],
      path: conv.path ? JSON.parse(conv.path) : [],
    }));

    return new Response(
      JSON.stringify({ conversations: formattedConversations }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("❌ [/api/guest/conversations] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
