import { NextRequest } from "next/server";
import { getGuestIdFromRequest, getOrCreateGuestSession } from "@/lib/guest";
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    console.log("📋 [/api/guest/conversations] GET request received");
    const guestId = getGuestIdFromRequest(request);

    if (!guestId) {
      // Return empty list for guests without ID
      return new Response(
        JSON.stringify({ conversations: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let env;
    try {
      env = getCloudflareContext().env;
    } catch (ctxError: any) {
      console.error("❌ [/api/guest/conversations] GET - Context error:", ctxError.message);
      return new Response(
        JSON.stringify({ conversations: [], _debug: "context_error" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!env?.DB) {
      console.error("❌ [/api/guest/conversations] GET - No DB binding");
      return new Response(
        JSON.stringify({ conversations: [], _debug: "no_db" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
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
    console.error("❌ [/api/guest/conversations] GET Error:", error.message, error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error",
      _stack: error.stack?.substring(0, 500)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("📋 [/api/guest/conversations] POST request received");
    const guestId = getGuestIdFromRequest(request);
    console.log("📋 [/api/guest/conversations] POST - Guest ID:", guestId?.substring(0, 20) || "null");

    if (!guestId) {
      return new Response(
        JSON.stringify({ error: "Guest ID required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    let env;
    try {
      env = getCloudflareContext().env;
      console.log("📋 [/api/guest/conversations] POST - Got context, DB exists:", !!env?.DB);
    } catch (ctxError: any) {
      console.error("❌ [/api/guest/conversations] POST - Context error:", ctxError.message);
      return new Response(
        JSON.stringify({ error: "Context unavailable", _debug: "context_error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!env?.DB) {
      console.error("❌ [/api/guest/conversations] POST - No DB binding");
      return new Response(
        JSON.stringify({ error: "Database unavailable", _debug: "no_db" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure guest session exists in the database
    console.log("📋 [/api/guest/conversations] POST - Creating/getting session...");
    const session = await getOrCreateGuestSession(env.DB, request);
    console.log("📋 [/api/guest/conversations] POST - Session:", session ? "created" : "null");
    
    if (!session) {
      return new Response(
        JSON.stringify({ error: "Failed to create guest session" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    console.log("📋 [/api/guest/conversations] POST - Inserting conversation:", conversationId);
    await env.DB.prepare(
      `INSERT INTO guest_conversations (id, guest_id, title, path, tags, is_pinned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        conversationId,
        guestId,
        'New Conversation',
        JSON.stringify([]),
        JSON.stringify([]),
        0,
        now,
        now
      )
      .run();

    console.log("📋 [/api/guest/conversations] POST - Conversation created successfully");
    const conversation = {
      id: conversationId,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
      isPinned: false,
      tags: [],
      path: [],
    };

    return new Response(
      JSON.stringify({ conversation }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("❌ [/api/guest/conversations] POST Error:", error.message, error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error",
      _stack: error.stack?.substring(0, 500)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

