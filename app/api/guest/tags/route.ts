import { NextRequest } from "next/server";
import { getGuestIdFromRequest } from "@/lib/guest";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();

    if (!guestId) {
      // Return empty tags for guests without session
      return new Response(JSON.stringify({ tags: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get all unique tags from guest conversations
    const result = await env.DB.prepare(
      `SELECT DISTINCT json_each.value as tag
       FROM guest_conversations, json_each(guest_conversations.tags)
       WHERE guest_conversations.guest_id = ?
       ORDER BY tag`
    )
      .bind(guestId)
      .all();

    const tags = (result.results || []).map((row: any) => row.tag);

    return new Response(JSON.stringify({ tags }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ [/api/guest/tags] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
