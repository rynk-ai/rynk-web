import { NextRequest } from "next/server";
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { chatService } from "@/lib/services/chat-service";

/**
 * Mobile Chat API
 * Same as /api/chat but uses mobile session token auth
 */

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7);
  const { env } = getCloudflareContext();
  const db = env.DB;
  
  const session = await db.prepare(
    'SELECT * FROM mobile_sessions WHERE access_token = ? AND access_token_expires_at > datetime("now")'
  ).bind(token).first();
  
  if (!session) return null;
  
  const user = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(session.user_id).first();
  
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { 
      message,
      conversationId, 
      attachments, 
      referencedConversations, 
      referencedFolders,
      useReasoning
    } = await request.json() as any;

    console.log('📨 [/api/mobile/chat] Request:', {
      userId: user.id,
      conversationId,
      hasMessage: !!message,
      messagePreview: message?.substring(0, 20)
    });

    if (!message || !conversationId) {
      return new Response(
        JSON.stringify({ error: "'message' and 'conversationId' are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Use the same chat service as web
    return await chatService.handleChatRequest(
      user.id as string,
      conversationId,
      message,
      undefined, // messageId (for edit flow)
      attachments,
      referencedConversations,
      referencedFolders,
      undefined, // userMessageIdHeader
      undefined, // assistantMessageIdHeader
      useReasoning || 'auto'
    );

  } catch (error: any) {
    console.error("❌ [/api/mobile/chat] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
