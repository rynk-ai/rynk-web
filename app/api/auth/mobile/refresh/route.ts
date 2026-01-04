 import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { randomUUID } from 'crypto';

/**
 * Mobile Auth Refresh Endpoint
 * 
 * POST - Exchange refresh token for new access + refresh tokens (sliding window)
 */

// Token prefixes (must match main route.ts)
const ACCESS_TOKEN_PREFIX = 'access_';
const REFRESH_TOKEN_PREFIX = 'refresh_';

// Token expiry times (must match main route.ts)
const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    
    const body = await request.json() as { refreshToken?: string };
    const { refreshToken } = body;
    
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
    }
    
    // Validate refresh token format
    if (!refreshToken.startsWith(REFRESH_TOKEN_PREFIX)) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
    }
    
    // Find session by refresh token
    const session = await db.prepare(
      'SELECT * FROM mobile_sessions WHERE refresh_token = ? AND refresh_token_expires_at > datetime("now")'
    ).bind(refreshToken).first();
    
    if (!session) {
      console.log('[Mobile Auth] Invalid or expired refresh token');
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }
    
    // Get user
    const user = await db.prepare(
      'SELECT id, email, name, image, credits, subscriptionTier, subscriptionStatus FROM users WHERE id = ?'
    ).bind(session.user_id).first();
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Generate new tokens (sliding window - new refresh token extends the session)
    const newAccessToken = `${ACCESS_TOKEN_PREFIX}${randomUUID()}`;
    const newRefreshToken = `${REFRESH_TOKEN_PREFIX}${randomUUID()}`;
    const newAccessTokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_MS);
    const newRefreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
    
    // Update session with new tokens (invalidates old refresh token)
    await db.prepare(
      `UPDATE mobile_sessions 
       SET access_token = ?, 
           refresh_token = ?, 
           access_token_expires_at = ?, 
           refresh_token_expires_at = ?
       WHERE refresh_token = ?`
    ).bind(
      newAccessToken,
      newRefreshToken,
      newAccessTokenExpiresAt.toISOString(),
      newRefreshTokenExpiresAt.toISOString(),
      refreshToken
    ).run();
    
    console.log('[Mobile Auth] Tokens refreshed for user:', user.id);
    
    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt: newRefreshTokenExpiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
        image: user.image || null,
        credits: user.credits || 100,
        subscriptionTier: user.subscriptionTier || 'free',
        subscriptionStatus: user.subscriptionStatus || 'none',
      },
    });
    
  } catch (error: any) {
    console.error('[Mobile Auth] Refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
