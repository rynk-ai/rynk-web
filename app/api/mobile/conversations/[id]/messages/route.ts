import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Mobile Messages API
 * Uses path-based message ordering like cloud-db.ts
 */

async function getAuthenticatedUser(request: NextRequest, db: any) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7);
  
  const session = await db.prepare(
    'SELECT * FROM mobile_sessions WHERE access_token = ? AND access_token_expires_at > datetime("now")'
  ).bind(token).first();
  
  if (!session) return null;
  
  const user = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(session.user_id).first();
  
  return user;
}

// GET /api/mobile/conversations/[id]/messages - Get messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const { id: conversationId } = await params;
    
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // cloud-db.ts uses path-based ordering: conversation.path contains message IDs in order
    const conversation = await db.prepare(
      'SELECT path FROM conversations WHERE id = ? AND userId = ?'
    ).bind(conversationId, user.id).first();
    
    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    const path = conversation.path ? JSON.parse(String(conversation.path)) : [];
    
    if (path.length === 0) {
      return NextResponse.json({ messages: [], nextCursor: null });
    }
    
    // Fetch messages by IDs (matching cloud-db pattern)
    const placeholders = path.map(() => '?').join(',');
    const messages = await db.prepare(
      `SELECT * FROM messages WHERE id IN (${placeholders})`
    ).bind(...path).all();
    
    // Build a map for ordering
    const msgMap = new Map(
      (messages.results || []).map((m: any) => [m.id, m])
    );
    
    // Return messages in path order (matching cloud-db.ts getMessages)
    const orderedMessages = path
      .map((id: string) => {
        const m = msgMap.get(id);
        if (!m) return null;
        return {
          id: m.id,
          conversationId: m.conversationId,
          role: m.role,
          content: m.content,
          attachments: m.attachments ? JSON.parse(String(m.attachments)) : null,
          parentMessageId: m.parentMessageId,
          versionOf: m.versionOf,
          versionNumber: m.versionNumber || 1,
          branchId: m.branchId,
          reasoningContent: m.reasoning_content,
          reasoningMetadata: m.reasoning_metadata ? JSON.parse(String(m.reasoning_metadata)) : null,
          webAnnotations: m.web_annotations ? JSON.parse(String(m.web_annotations)) : null,
          modelUsed: m.model_used,
          createdAt: m.createdAt,
        };
      })
      .filter(Boolean);
    
    return NextResponse.json({ 
      messages: orderedMessages,
      nextCursor: null, // Simplified - no pagination for mobile initially
    });
    
  } catch (error: any) {
    console.error('[Mobile API] GET /conversations/[id]/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
