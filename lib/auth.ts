import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { D1Adapter } from "@auth/d1-adapter"
import { getRequestContext } from "@cloudflare/next-on-pages"

export const { handlers, auth, signIn, signOut } = NextAuth((req) => {
  // Try to get D1 binding from Cloudflare context
  let db: any = undefined
  
  try {
    const context = getRequestContext()
    // @ts-ignore - CloudflareEnv type will be available in production
    db = context?.env?.DB
  } catch (error) {
    // In local dev, we'll use JWT-based sessions instead
    console.log('No D1 binding available - using JWT sessions')
  }
  
  return {
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
          } else if (token?.sub) {
            // JWT session (without adapter)
            // @ts-ignore
            session.user.id = token.sub
            // @ts-ignore
            session.user.credits = 100
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
