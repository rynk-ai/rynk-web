import { NextRequest } from "next/server";
import { getGuestIdFromRequest } from "@/lib/guest";
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();
    const { id: conversationId } = await params;
    
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const cursor = url.searchParams.get('cursor');

    if (!guestId) {
      return new Response(
        JSON.stringify({ error: "Guest ID required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build query with cursor-based pagination
    let query = `SELECT * FROM guest_messages WHERE conversation_id = ?`;
    const params_arr: any[] = [conversationId];

    if (cursor) {
      query += ` AND created_at < ?`;
      params_arr.push(cursor);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params_arr.push(limit + 1); // Fetch one extra to check if there are more

    const messages = await env.DB.prepare(query).bind(...params_arr).all();

    const results = messages.results || [];
    const hasMore = results.length > limit;
    const messagesSlice = hasMore ? results.slice(0, limit) : results;

    const formattedMessages = messagesSlice.map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      role: msg.role,
      content: msg.content,
      attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
      parentMessageId: msg.parent_message_id,
      versionOf: msg.version_of,
      versionNumber: msg.version_number || 1,
      branchId: msg.branch_id,
      referencedConversations: msg.referenced_conversations ? JSON.parse(msg.referenced_conversations) : [],
      referencedFolders: msg.referenced_folders ? JSON.parse(msg.referenced_folders) : [],
      timestamp: new Date(msg.created_at).getTime(),
    }));

    // Reverse to get chronological order (oldest first)
    formattedMessages.reverse();

    const nextCursor = hasMore && results.length > 0 
      ? (results[limit] as any).created_at 
      : null;

    return new Response(
      JSON.stringify({
        messages: formattedMessages,
        nextCursor
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ [/api/guest/conversations/[id]/messages] GET Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
