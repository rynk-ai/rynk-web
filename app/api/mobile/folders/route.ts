import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Mobile Folders API
 * Fetches user's folders
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

// GET /api/mobile/folders - List user's folders
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch folders from 'folders' table
    const folders = await db.prepare(`
      SELECT * FROM folders 
      WHERE userId = ?
      ORDER BY updatedAt DESC
    `).bind(user.id).all();
    
    // Format response
    const formattedFolders = (folders.results || []).map((f: any) => ({
      id: f.id,
      userId: f.userId,
      projectId: f.projectId,
      name: f.name,
      description: f.description,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));
    
    return NextResponse.json({ folders: formattedFolders });
    
  } catch (error: any) {
    console.error('[Mobile API] GET /folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/mobile/folders - Create new folder
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { name: string; description?: string };
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO folders (id, userId, name, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, user.id, name, description || null, now, now).run();

    return NextResponse.json({ 
      folder: {
        id,
        userId: user.id,
        name,
        description: description || null,
        createdAt: now,
        updatedAt: now,
        conversationIds: [] // Initial empty list for consistency with frontend type
      }
    });

  } catch (error: any) {
    console.error('[Mobile API] POST /folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
