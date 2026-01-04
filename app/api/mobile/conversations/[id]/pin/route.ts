import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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

// PUT /api/mobile/conversations/[id]/pin - Toggle pin status
export async function PUT(
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

    const body = await request.json();
    const { isPinned } = body as { isPinned: boolean };
    
    // Check ownership first
    const conversation = await db.prepare(
      'SELECT id FROM conversations WHERE id = ? AND userId = ?'
    ).bind(id, user.id).first();
    
    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Update pin status
    await db.prepare(
      'UPDATE conversations SET isPinned = ?, updatedAt = datetime("now") WHERE id = ?'
    ).bind(isPinned ? 1 : 0, id).run();
    
    return NextResponse.json({ success: true, isPinned });
    
  } catch (error: any) {
    console.error('[Mobile API] PUT /conversations/[id]/pin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
