import { NextRequest } from "next/server";
import { getGuestIdFromRequest } from "@/lib/guest";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();
    const { id: folderId } = await params;

    if (!guestId) {
      return new Response(JSON.stringify({ error: "Guest ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { conversationId } = await request.json() as { conversationId: string };

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: "Conversation ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify folder belongs to guest
    const folder = await env.DB.prepare(
      `SELECT id FROM guest_folders WHERE id = ? AND guest_id = ?`
    )
      .bind(folderId, guestId)
      .first();

    if (!folder) {
      return new Response(JSON.stringify({ error: "Folder not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Add conversation to folder
    await env.DB.prepare(
      `INSERT OR IGNORE INTO guest_folder_conversations (folder_id, conversation_id) VALUES (?, ?)`
    )
      .bind(folderId, conversationId)
      .run();

    // Update folder timestamp
    await env.DB.prepare(
      `UPDATE guest_folders SET updated_at = ? WHERE id = ?`
    )
      .bind(new Date().toISOString(), folderId)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(
      "❌ [/api/guest/folders/[id]/conversations] POST Error:",
      error
    );
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
