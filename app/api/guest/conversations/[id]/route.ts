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

    if (!guestId) {
      return new Response(
        JSON.stringify({ error: "Guest ID required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get conversation
    const conversation = await env.DB
      .prepare(
        `SELECT * FROM guest_conversations WHERE id = ? AND guest_id = ?`
      )
      .bind(conversationId, guestId)
      .first();

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get messages
    const messages = await env.DB
      .prepare(
        `SELECT * FROM guest_messages WHERE conversation_id = ? ORDER BY created_at ASC`
      )
      .bind(conversationId)
      .all();

    const formattedMessages = (messages.results || []).map((msg: any) => ({
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

    return new Response(
      JSON.stringify({
        conversation: {
          id: conversation.id,
          title: conversation.title || 'Untitled Chat',
          createdAt: new Date((conversation as any).created_at).getTime(),
          updatedAt: new Date((conversation as any).updated_at).getTime(),
          isPinned: (conversation as any).is_pinned === 1,
          tags: (conversation as any).tags ? JSON.parse((conversation as any).tags) : [],
          path: (conversation as any).path ? JSON.parse((conversation as any).path) : [],
        },
        messages: formattedMessages
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ [/api/guest/conversations/[id]] GET Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();
    const { id: conversationId } = await params;

    if (!guestId) {
      return new Response(
        JSON.stringify({ error: "Guest ID required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const updates = await request.json() as { title?: string; isPinned?: boolean; tags?: string[]; path?: string[] };
    const now = new Date().toISOString();

    // Build update query dynamically
    const updateFields: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.isPinned !== undefined) {
      updateFields.push('is_pinned = ?');
      values.push(updates.isPinned ? 1 : 0);
    }
    if (updates.tags !== undefined) {
      updateFields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.path !== undefined) {
      updateFields.push('path = ?');
      values.push(JSON.stringify(updates.path));
    }

    values.push(conversationId, guestId);

    await env.DB.prepare(
      `UPDATE guest_conversations SET ${updateFields.join(', ')} WHERE id = ? AND guest_id = ?`
    )
      .bind(...values)
      .run();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ [/api/guest/conversations/[id]] PATCH Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();
    const { id: conversationId } = await params;

    if (!guestId) {
      return new Response(
        JSON.stringify({ error: "Guest ID required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Delete conversation (cascades to messages)
    await env.DB.prepare(
      `DELETE FROM guest_conversations WHERE id = ? AND guest_id = ?`
    )
      .bind(conversationId, guestId)
      .run();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ [/api/guest/conversations/[id]] DELETE Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
