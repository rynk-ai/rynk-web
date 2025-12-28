import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { randomUUID } from 'crypto';

/**
 * Mobile Conversations API
 * Uses the same schema as cloud-db.ts
 * Tables: conversations, messages
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
    
    // Match cloud-db.ts getConversations query
    const conversations = await db.prepare(`
      SELECT * FROM conversations 
      WHERE userId = ?
      ORDER BY updatedAt DESC
      LIMIT 50
    `).bind(user.id).all();
    
    // Format like cloud-db.ts does
    const formattedConversations = (conversations.results || []).map((c: any) => ({
      id: c.id,
      userId: c.userId,
      projectId: c.projectId,
      title: c.title,
      path: c.path ? JSON.parse(String(c.path)) : [],
      tags: c.tags ? JSON.parse(String(c.tags)) : [],
      isPinned: Boolean(c.isPinned),
      branches: c.branches ? JSON.parse(String(c.branches)) : [],
      activeBranchId: c.activeBranchId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
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
    const now = Date.now(); // cloud-db uses ms timestamps
    
    // Match cloud-db.ts createConversation
    await db.prepare(`
      INSERT INTO conversations (id, userId, projectId, title, path, tags, isPinned, branches, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      conversationId,
      user.id,
      body.projectId || null,
      body.title || 'New Conversation',
      '[]', // path - empty initially
      '[]', // tags
      0,    // isPinned
      '[]', // branches
      now,
      now
    ).run();
    
    return NextResponse.json({ 
      conversationId,
      conversation: {
        id: conversationId,
        userId: user.id,
        projectId: body.projectId || null,
        title: body.title || 'New Conversation',
        path: [],
        tags: [],
        isPinned: false,
        branches: [],
        createdAt: now,
        updatedAt: now,
      }
    });
    
  } catch (error: any) {
    console.error('[Mobile API] POST /conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
