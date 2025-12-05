import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { D1Adapter } from "@auth/d1-adapter"
import { getCloudflareContext } from "@opennextjs/cloudflare"

export const { handlers, auth, signIn, signOut } = NextAuth((req) => {
  // Try to get D1 binding from Cloudflare context
  let db: any = undefined
  
  try {
    // Use getCloudflareContext() to access Cloudflare bindings
    db = getCloudflareContext().env.DB
  } catch (error) {
    // In local dev, we'll use JWT-based sessions instead
    console.log('No D1 binding available - using JWT sessions')
  }
  
  return {
    trustHost: true,
    adapter: db ? D1Adapter(db) : undefined,
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ],
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
