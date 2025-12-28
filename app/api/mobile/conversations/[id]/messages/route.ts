import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Mobile Messages API
 */

async function getAuthenticatedUser(request: NextRequest, db: any) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7);
  
  const session = await db.prepare(
    'SELECT * FROM mobile_sessions WHERE token = ? AND expires_at > datetime("now")'
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
    
    // Verify conversation belongs to user
    const conversation = await db.prepare(
      'SELECT id FROM cloud_conversations WHERE id = ? AND userId = ?'
    ).bind(conversationId, user.id).first();
    
    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    const limit = 50;
    const cursor = new URL(request.url).searchParams.get('cursor');
    
    let query = `
      SELECT * FROM cloud_messages 
      WHERE conversationId = ?
    `;
    
    if (cursor) {
      query += ` AND createdAt < ?`;
    }
    
    query += ` ORDER BY createdAt DESC LIMIT ?`;
    
    const messages = cursor
      ? await db.prepare(query).bind(conversationId, cursor, limit).all()
      : await db.prepare(query).bind(conversationId, limit).all();
    
    const formattedMessages = (messages.results || []).map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content,
      attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
      parentMessageId: msg.parentMessageId,
      versionOf: msg.versionOf,
      versionNumber: msg.versionNumber || 1,
      branchId: msg.branchId,
      reasoningContent: msg.reasoningContent,
      reasoningMetadata: msg.reasoningMetadata ? JSON.parse(msg.reasoningMetadata) : null,
      webAnnotations: msg.webAnnotations ? JSON.parse(msg.webAnnotations) : null,
      modelUsed: msg.modelUsed,
      createdAt: msg.createdAt,
    })).reverse(); // Reverse to get chronological order
    
    const nextCursor = messages.results?.length === limit 
      ? messages.results[messages.results.length - 1]?.createdAt 
      : null;
    
    return NextResponse.json({ 
      messages: formattedMessages,
      nextCursor,
    });
    
  } catch (error: any) {
    console.error('[Mobile API] GET /conversations/[id]/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
