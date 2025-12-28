import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Mobile Conversation by ID API
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

// GET /api/mobile/conversations/[id] - Get conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const { id } = await params;
    
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const conversation = await db.prepare(`
      SELECT * FROM cloud_conversations WHERE id = ? AND userId = ?
    `).bind(id, user.id).first();
    
    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      conversation: {
        id: conversation.id,
        userId: conversation.userId,
        projectId: conversation.projectId,
        title: conversation.title,
        path: conversation.path ? JSON.parse(String(conversation.path)) : [],
        tags: conversation.tags ? JSON.parse(String(conversation.tags)) : [],
        isPinned: Boolean(conversation.isPinned),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      }
    });
    
  } catch (error: any) {
    console.error('[Mobile API] GET /conversations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/mobile/conversations/[id] - Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const { id } = await params;
    
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Delete messages first
    await db.prepare('DELETE FROM cloud_messages WHERE conversationId = ?').bind(id).run();
    
    // Delete conversation
    await db.prepare('DELETE FROM cloud_conversations WHERE id = ? AND userId = ?')
      .bind(id, user.id).run();
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('[Mobile API] DELETE /conversations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
