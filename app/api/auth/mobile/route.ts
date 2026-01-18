import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { randomUUID } from 'crypto';

/**
 * Mobile Auth Session Endpoint
 * 
 * POST - Create a new mobile session (accepts native SDK tokens)
 * GET - Validate an existing access token
 * DELETE - Sign out / delete session
 */

// Token prefixes for identification
const ACCESS_TOKEN_PREFIX = 'access_';
const REFRESH_TOKEN_PREFIX = 'refresh_';

// Token expiry times
const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// Google token verification
async function verifyGoogleToken(idToken: string): Promise<{ email: string; name?: string; picture?: string } | null> {
  try {
    // Verify with Google's tokeninfo endpoint
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    
    if (!response.ok) {
      console.error('[Mobile Auth] Google token verification failed:', response.status);
      return null;
    }
    
    const data :any= await response.json();
    
    // Verify the token is for our app (optional - add your client IDs)
    // if (!['YOUR_WEB_CLIENT_ID', 'YOUR_IOS_CLIENT_ID'].includes(data.aud)) {
    //   return null;
    // }
    
    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  } catch (error) {
    console.error('[Mobile Auth] Google token verification error:', error);
    return null;
  }
}

// Apple token verification
async function verifyAppleToken(identityToken: string): Promise<{ email?: string; sub: string } | null> {
  try {
    // Decode the JWT to get claims (basic validation)
    // For production, you should verify with Apple's public keys
    const parts = identityToken.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Basic validation
    if (payload.iss !== 'https://appleid.apple.com') {
      console.error('[Mobile Auth] Apple token issuer mismatch');
      return null;
    }
    
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.error('[Mobile Auth] Apple token expired');
      return null;
    }
    
    return {
      email: payload.email,
      sub: payload.sub, // Apple user ID
    };
  } catch (error) {
    console.error('[Mobile Auth] Apple token verification error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }
    
    const token = authHeader.slice(7);
    
    // Check if it's an access token
    if (!token.startsWith(ACCESS_TOKEN_PREFIX)) {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 401 });
    }
    
    const session = await db.prepare(
      'SELECT * FROM mobile_sessions WHERE access_token = ? AND access_token_expires_at > datetime("now")'
    ).bind(token).first();
    
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 401 });
    }
    
    const user = await db.prepare(
      'SELECT id, email, name, image, credits, subscriptionTier, subscriptionStatus FROM users WHERE id = ?'
    ).bind(session.user_id).first();
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        credits: user.credits || 20,
        subscriptionTier: user.subscriptionTier || 'free',
        subscriptionStatus: user.subscriptionStatus || 'none',
      },
      accessTokenExpiresAt: session.access_token_expires_at,
    });
    
  } catch (error: any) {
    console.error('[Mobile Auth] Session fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    
    const body = await request.json() as {
      provider: 'google' | 'apple' | 'email';
      idToken?: string;
      email?: string;
      name?: string;
      image?: string;
      providerAccountId?: string;
    };
    
    const { provider, idToken, providerAccountId } = body;
    let { email, name, image } = body;
    
    console.log('[Mobile Auth] Received request:', { provider, hasToken: !!idToken, email });
    
    // Verify token based on provider
    if (provider === 'google' && idToken) {
      const googleUser = await verifyGoogleToken(idToken);
      if (!googleUser) {
        return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
      }
      email = googleUser.email;
      name = name || googleUser.name;
      image = image || googleUser.picture;
      console.log('[Mobile Auth] Google token verified for:', email);
      
    } else if (provider === 'apple' && idToken) {
      const appleUser = await verifyAppleToken(idToken);
      if (!appleUser) {
        return NextResponse.json({ error: 'Invalid Apple token' }, { status: 401 });
      }
      // Apple may not always return email after first sign-in
      email = email || appleUser.email;
      console.log('[Mobile Auth] Apple token verified, sub:', appleUser.sub);
      
      // For Apple, use sub as fallback identifier if no email
      if (!email && appleUser.sub) {
        // Look up existing user by Apple sub
        const existingUser = await db.prepare(
          'SELECT * FROM users WHERE id LIKE ?'
        ).bind(`apple_${appleUser.sub}%`).first();
        
        if (existingUser) {
          email = existingUser.email as string;
        }
      }
    }
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    
    // Find or create user
    let user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    
    if (!user) {
      const userId = randomUUID();
      await db.prepare(
        `INSERT INTO users (id, email, name, image, credits, subscriptionTier, subscriptionStatus) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        userId,
        email,
        name || null,
        image || null,
        20,
        'free',
        'none'
      ).run();
      
      user = { id: userId, email, name, image, credits: 20, subscriptionTier: 'free', subscriptionStatus: 'none' };
      console.log('[Mobile Auth] Created new user:', userId);
    }
    
    // Create access and refresh tokens
    const accessToken = `${ACCESS_TOKEN_PREFIX}${randomUUID()}`;
    const refreshToken = `${REFRESH_TOKEN_PREFIX}${randomUUID()}`;
    const accessTokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_MS);
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
    
    await db.prepare(
      `INSERT INTO mobile_sessions (access_token, refresh_token, user_id, provider, provider_account_id, created_at, access_token_expires_at, refresh_token_expires_at)
       VALUES (?, ?, ?, ?, ?, datetime("now"), ?, ?)`
    ).bind(
      accessToken,
      refreshToken,
      user.id,
      provider,
      providerAccountId || null,
      accessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt.toISOString()
    ).run();
    
    console.log('[Mobile Auth] Created session for user:', user.id);
    
    return NextResponse.json({
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
        image: user.image || null,
        credits: user.credits || 20,
        subscriptionTier: user.subscriptionTier || 'free',
        subscriptionStatus: user.subscriptionStatus || 'none',
      },
    });
    
  } catch (error: any) {
    console.error('[Mobile Auth] Session create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }
    
    const token = authHeader.slice(7);
    
    // Delete by access token or refresh token
    await db.prepare(
      'DELETE FROM mobile_sessions WHERE access_token = ? OR refresh_token = ?'
    ).bind(token, token).run();
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('[Mobile Auth] Session delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
