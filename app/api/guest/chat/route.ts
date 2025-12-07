import { NextRequest } from "next/server";
import { guestChatService } from "@/lib/services/guest-chat-service";
import {
  getOrCreateGuestSession,
  getGuestIdFromRequest,
  GUEST_CREDITS_LIMIT
} from "@/lib/guest";
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request: NextRequest) {
  try {
    // Check for guest mode
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();

    if (!guestId) {
      return new Response(
        JSON.stringify({ error: "Guest ID required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get or create guest session
    const guestSession = await getOrCreateGuestSession(env.DB, request);
    if (!guestSession) {
      return new Response(
        JSON.stringify({ error: "Failed to create guest session" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const {
      message,
      messageId,
      conversationId,
      attachments,
      referencedConversations,
      referencedFolders,
      useReasoning
    } = await request.json() as any;

    console.log('📨 [/api/guest/chat] Guest Request:', {
      guestId: guestId.substring(0, 20) + '...',
      messageId,
      conversationId,
      hasMessage: !!message,
      messagePreview: message?.substring(0, 20),
      attachmentsCount: attachments?.length || 0
    });

    // Validate: Either message or messageId must be provided (but not both)
    if ((!message && !messageId) || !conversationId) {
      console.error('❌ [/api/guest/chat] Invalid request: missing required fields');
      return new Response(
        JSON.stringify({ error: "Either 'message' or 'messageId' and 'conversationId' are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const userMessageIdHeader = request.headers.get('X-User-Message-Id')
    const assistantMessageIdHeader = request.headers.get('X-Assistant-Message-Id')

    // Handle the chat request using GuestChatService
    return await guestChatService.handleChatRequest(
      env.DB,
      request,
      guestId,
      conversationId,
      message,
      messageId,
      attachments || [],
      referencedConversations || [],
      referencedFolders || [],
      userMessageIdHeader,
      assistantMessageIdHeader,
      useReasoning || 'auto'
    )

  } catch (error: any) {
    console.error("❌ [/api/guest/chat] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

