import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Mobile Projects API
 * Fetches user's projects
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

// GET /api/mobile/projects - List user's projects
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch projects from 'projects' table
    // Assuming schema has userId
    const projects = await db.prepare(`
      SELECT * FROM projects 
      WHERE userId = ?
      ORDER BY updatedAt DESC
    `).bind(user.id).all();
    
    // Format response
    const formattedProjects = (projects.results || []).map((p: any) => ({
      id: p.id,
      userId: p.userId,
      name: p.name,
      description: p.description,
      emoji: p.emoji,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      // Add other fields as needed based on schema
    }));
    
    return NextResponse.json({ projects: formattedProjects });
    
  } catch (error: any) {
    console.error('[Mobile API] GET /projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
