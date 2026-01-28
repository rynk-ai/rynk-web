import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Mobile Folder Detail API
 * Handle Rename (PATCH) and Delete (DELETE)
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const { id } = await params; // Await params in Next.js 15+

    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { name: string };
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Verify ownership
    const folder = await db.prepare('SELECT * FROM folders WHERE id = ? AND userId = ?').bind(id, user.id).first();
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE folders 
      SET name = ?, updatedAt = ?
      WHERE id = ?
    `).bind(name, now, id).run();

    return NextResponse.json({ 
      folder: { ...folder, name, updatedAt: now } 
    });

  } catch (error: any) {
    console.error('[Mobile API] PATCH /folders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const { id } = await params;

    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const folder = await db.prepare('SELECT * FROM folders WHERE id = ? AND userId = ?').bind(id, user.id).first();
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Delete folder (database constraints should handle cascading or we might need to detach chats manually)
    // Assuming 'folders' table deletion is enough for now or standard cascade
    await db.prepare('DELETE FROM folders WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Mobile API] DELETE /folders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
