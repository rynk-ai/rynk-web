import { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Mobile Authentication Helper
 * Verifies the mobile access token from the Authorization header
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7);
  const { env } = getCloudflareContext();
  const db = env.DB;
  
  // Find valid session
  const session = await db.prepare(
    'SELECT * FROM mobile_sessions WHERE access_token = ? AND access_token_expires_at > datetime("now")'
  ).bind(token).first();
  
  if (!session) return null;
  
  // Get user details
  const user = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(session.user_id).first();
  
  return user;
}
