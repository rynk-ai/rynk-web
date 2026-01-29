import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Mobile Conversation by ID API
 * Uses same schema as cloud-db.ts
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
    
    const conversation = await db.prepare(
      'SELECT * FROM conversations WHERE id = ? AND userId = ?'
    ).bind(id, user.id).first();
    
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
        branches: conversation.branches ? JSON.parse(String(conversation.branches)) : [],
        activeBranchId: conversation.activeBranchId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      }
    });
    
  } catch (error: any) {
    console.error('[Mobile API] GET /conversations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/mobile/conversations/[id] - Update conversation (e.g. rename)
export async function PATCH(
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

    const body = await request.json() as { title?: string };
    const { title } = body;

    if (title === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const now = new Date().getTime();

    await db.prepare(
      'UPDATE conversations SET title = ?, updatedAt = ? WHERE id = ? AND userId = ?'
    ).bind(title, now, id, user.id).run();

    return NextResponse.json({ 
      success: true,
      conversation: { id, title, updatedAt: now } 
    });

  } catch (error: any) {
    console.error('[Mobile API] PATCH /conversations/[id] error:', error);
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
    
    // Match cloud-db.ts deleteConversation - delete messages first
    await db.prepare('DELETE FROM messages WHERE conversationId = ?').bind(id).run();
    await db.prepare('DELETE FROM conversations WHERE id = ? AND userId = ?')
      .bind(id, user.id).run();
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('[Mobile API] DELETE /conversations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
