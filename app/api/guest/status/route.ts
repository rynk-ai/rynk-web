import { NextRequest } from "next/server";
import {
  getGuestSession,
  getGuestIdFromRequest,
  GUEST_CREDITS_LIMIT
} from "@/lib/guest";
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();

    if (!guestId) {
      return new Response(
        JSON.stringify({ error: "No guest session" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const session = await getGuestSession(env.DB, guestId);

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Guest session not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        guestId: session.guest_id,
        creditsRemaining: session.credits_remaining,
        creditsLimit: GUEST_CREDITS_LIMIT,
        messageCount: session.message_count,
        createdAt: session.created_at,
        lastActive: session.last_active
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("❌ [/api/guest/status] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
