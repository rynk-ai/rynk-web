import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { randomUUID } from 'crypto';

/**
 * Mobile Conversations API
 * Requires mobile session token in Authorization header
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

// GET /api/mobile/conversations - List user's conversations
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const conversations = await db.prepare(`
      SELECT 
        c.id,
        c.userId as user_id,
        c.projectId as project_id,
        c.title,
        c.path,
        c.tags,
        c.isPinned as is_pinned,
        c.activeBranchId as active_branch_id,
        c.createdAt as created_at,
        c.updatedAt as updated_at,
        (SELECT COUNT(*) FROM cloud_messages WHERE conversationId = c.id) as message_count
      FROM cloud_conversations c
      WHERE c.userId = ?
      ORDER BY c.updatedAt DESC
      LIMIT 50
    `).bind(user.id).all();
    
    const formattedConversations = (conversations.results || []).map((conv: any) => ({
      id: conv.id,
      userId: conv.user_id,
      projectId: conv.project_id,
      title: conv.title,
      path: conv.path ? JSON.parse(conv.path) : [],
      tags: conv.tags ? JSON.parse(conv.tags) : [],
      isPinned: Boolean(conv.is_pinned),
      activeBranchId: conv.active_branch_id,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      messageCount: conv.message_count || 0,
    }));
    
    return NextResponse.json({ conversations: formattedConversations });
    
  } catch (error: any) {
    console.error('[Mobile API] GET /conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/mobile/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json() as { title?: string; projectId?: string };
    
    const conversationId = randomUUID();
    const now = new Date().toISOString();
    
    await db.prepare(`
      INSERT INTO cloud_conversations (id, userId, projectId, title, path, tags, isPinned, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      conversationId,
      user.id,
      body.projectId || null,
      body.title || null,
      '[]',
      '[]',
      0,
      now,
      now
    ).run();
    
    return NextResponse.json({ 
      conversationId,
      conversation: {
        id: conversationId,
        userId: user.id,
        projectId: body.projectId || null,
        title: body.title || null,
        path: [],
        tags: [],
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      }
    });
    
  } catch (error: any) {
    console.error('[Mobile API] POST /conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
