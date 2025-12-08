import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const session = await auth()

  // Protect /api/files routes (always require authentication)
  if (request.nextUrl.pathname.startsWith("/api/files") && !session?.user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Route authenticated users away from guest-chat to /chat
  if (request.nextUrl.pathname.startsWith("/guest-chat") && session?.user) {
    return NextResponse.redirect(new URL("/chat", request.url))
  }

  // Route ALL unauthenticated users from /chat to /guest-chat
  if (request.nextUrl.pathname.startsWith("/chat") && !session?.user) {
    return NextResponse.redirect(new URL("/guest-chat", request.url))
  }

  // Redirect /login to /chat if already authenticated
  if (request.nextUrl.pathname === "/login" && session?.user) {
    return NextResponse.redirect(new URL("/chat", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/chat/:path*", "/guest-chat/:path*", "/api/files/:path*", "/login"],
}

