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
    const folderIds = (folders.results || []).map((f: any) => f.id);
    const placeholders = folderIds.map(() => '?').join(',');
    
    let convsByFolder = new Map<string, string[]>();
    
    if (folderIds.length > 0) {
      const allFolderConvs = await db.prepare(
        `SELECT folderId, conversationId FROM folder_conversations WHERE folderId IN (${placeholders})`
      ).bind(...folderIds).all();
      
      (allFolderConvs.results || []).forEach((row: any) => {
        const fid = row.folderId as string;
        if (!convsByFolder.has(fid)) {
          convsByFolder.set(fid, []);
        }
        convsByFolder.get(fid)!.push(row.conversationId as string);
      });
    }

    const formattedFolders = (folders.results || []).map((f: any) => ({
      id: f.id,
      userId: f.userId,
      projectId: f.projectId,
      name: f.name,
      description: f.description,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      conversationIds: convsByFolder.get(f.id) || []
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

    const body = await request.json() as { name: string; description?: string; conversationIds?: string[] };
    const { name, description, conversationIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO folders (id, userId, name, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, user.id, name, description || null, now, now).run();

    // Add conversations if provided
    if (conversationIds && conversationIds.length > 0) {
      console.log(`[Mobile API] Adding ${conversationIds.length} conversations to folder ${id}`);
      const batch = conversationIds.map(convId =>
        db.prepare('INSERT INTO folder_conversations (folderId, conversationId) VALUES (?, ?)').bind(id, convId)
      )
      const batchResult = await db.batch(batch);
      console.log('[Mobile API] Batch insert result:', batchResult);
    } else {
      console.log(`[Mobile API] No conversations provided for folder ${id}`);
    }

    return NextResponse.json({ 
      folder: {
        id,
        userId: user.id,
        name,
        description: description || null,
        createdAt: now,
        updatedAt: now,
        conversationIds: conversationIds || []
      }
    });

  } catch (error: any) {
    console.error('[Mobile API] POST /folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
