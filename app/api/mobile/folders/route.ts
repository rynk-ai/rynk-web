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
