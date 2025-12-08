import { NextRequest } from "next/server";
import {
  getGuestSession,
  getGuestIdFromRequest,
  getOrCreateGuestSession,
  GUEST_CREDITS_LIMIT
} from "@/lib/guest";
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: NextRequest) {
  try {
    console.log("📊 [/api/guest/status] Request received");
    
    const guestId = getGuestIdFromRequest(request);
    console.log("📊 [/api/guest/status] Guest ID:", guestId?.substring(0, 20) || "null");

    if (!guestId) {
      // Return default status for guests without ID
      return new Response(
        JSON.stringify({
          guestId: null,
          creditsRemaining: GUEST_CREDITS_LIMIT,
          creditsLimit: GUEST_CREDITS_LIMIT,
          messageCount: 0,
          createdAt: null,
          lastActive: null
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let env;
    try {
      const context = getCloudflareContext();
      env = context.env;
      console.log("📊 [/api/guest/status] Got Cloudflare context, DB exists:", !!env?.DB);
    } catch (ctxError: any) {
      console.error("❌ [/api/guest/status] getCloudflareContext error:", ctxError.message);
      return new Response(
        JSON.stringify({
          guestId: guestId,
          creditsRemaining: GUEST_CREDITS_LIMIT,
          creditsLimit: GUEST_CREDITS_LIMIT,
          messageCount: 0,
          createdAt: null,
          lastActive: null,
          _debug: "context_error"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!env?.DB) {
      console.error("❌ [/api/guest/status] No DB binding available");
      return new Response(
        JSON.stringify({
          guestId: guestId,
          creditsRemaining: GUEST_CREDITS_LIMIT,
          creditsLimit: GUEST_CREDITS_LIMIT,
          messageCount: 0,
          createdAt: null,
          lastActive: null,
          _debug: "no_db"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Try to get or create session
    const session = await getOrCreateGuestSession(env.DB, request);
    console.log("📊 [/api/guest/status] Session:", session ? "found" : "null");

    if (!session) {
      return new Response(
        JSON.stringify({
          guestId: guestId,
          creditsRemaining: GUEST_CREDITS_LIMIT,
          creditsLimit: GUEST_CREDITS_LIMIT,
          messageCount: 0,
          createdAt: null,
          lastActive: null
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
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
    console.error("❌ [/api/guest/status] Error:", error.message, error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error",
      _stack: error.stack?.substring(0, 500)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
