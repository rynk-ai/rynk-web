import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import { D1Adapter } from "@auth/d1-adapter"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { sendMagicLinkEmail } from "@/lib/email/resend"

export const { handlers, auth, signIn, signOut } = NextAuth((req) => {
  // Try to get D1 binding from Cloudflare context
  let db: any = undefined
  let resendApiKey: string | undefined
  
  try {
    // Use getCloudflareContext() to access Cloudflare bindings
    const ctx = getCloudflareContext()
    db = ctx.env.DB
    resendApiKey = ctx.env.RESEND_API_KEY
    console.log('[Auth] Cloudflare context found:', { 
      hasDB: !!db, 
      hasResendKey: !!resendApiKey 
    })
  } catch (error) {
    console.log('[Auth] No Cloudflare context or error accessing it:', error)
    // In local dev, we'll use JWT-based sessions instead
    console.log('No Cloudflare context - using JWT sessions')
    resendApiKey = process.env.RESEND_API_KEY
  }
  
  return {
    trustHost: true,
    adapter: db ? D1Adapter(db) : undefined,
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      // Passwordless magic link authentication
      Resend({
        apiKey: resendApiKey || '',
        from: 'noreply@rynk.io',
        // Custom email sending function using our branded template
        sendVerificationRequest: async ({ identifier, url, provider }) => {
          if (!resendApiKey) {
            console.error('❌ [Auth] RESEND_API_KEY not configured')
            throw new Error('Email service not configured')
          }
          
          const result = await sendMagicLinkEmail(resendApiKey, {
            to: identifier,
            url,
            host: new URL(url).host
          })
          
          if (!result.success) {
            throw new Error(result.error || 'Failed to send magic link email')
          }
        }
      }),
    ],
    events: {
      async createUser({ user }) {
        // Fix: The remote D1 database has DEFAULT 10 for credits, but we want 100
        // Update credits to 100 immediately after user creation
        if (db && user.id) {
          try {
            await db.prepare('UPDATE users SET credits = 100 WHERE id = ?').bind(user.id).run()
            console.log('✅ Set initial credits to 100 for new user:', user.id)
          } catch (error) {
            console.error('Failed to set initial credits for user:', error)
          }
        }
      },
    },
    callbacks: {
      async session({ session, user, token }) {
        if (session.user) {
          if (user) {
            // Database session (with adapter)
            session.user.id = user.id
            // @ts-ignore - credits is a custom field
            session.user.credits = user.credits || 100
            // @ts-ignore - subscriptionTier is a custom field
            session.user.subscriptionTier = user.subscriptionTier || 'free'
            // @ts-ignore - subscriptionStatus is a custom field
            session.user.subscriptionStatus = user.subscriptionStatus || 'none'
          } else if (token?.sub) {
            // JWT session (without adapter)
            // @ts-ignore
            session.user.id = token.sub
            // @ts-ignore
            session.user.credits = 100
            // @ts-ignore - default to free tier for JWT sessions
            session.user.subscriptionTier = 'free'
            // @ts-ignore
            session.user.subscriptionStatus = 'none'
            
            // DEFENSIVE: Ensure user exists in D1 for JWT sessions
            // This handles cases where NextAuth uses JWT but we need D1 records
            if (db && session.user.email) {
              try {
                const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?')
                  .bind(session.user.email)
                  .first()
                
                if (!existingUser && token.sub) {
                  // Create user record with free tier defaults
                  await db.prepare(
                    'INSERT INTO users (id, email, name, image, credits, subscriptionTier, subscriptionStatus) VALUES (?, ?, ?, ?, ?, ?, ?)'
                  ).bind(
                    token.sub,
                    session.user.email,
                    session.user.name || null,
                    session.user.image || null,
                    100,
                    'free',
                    'none'
                  ).run()
                  
                  console.log('✅ Created user record in D1 for JWT session:', token.sub)
                }
              } catch (error) {
                console.error('Failed to ensure user exists in D1:', error)
              }
            }
          }
        }
        return session
      },
    },
    pages: {
      signIn: '/login',
    },
  }
})
