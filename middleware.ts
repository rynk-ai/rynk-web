import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const session = await auth()
  
  // Protect /chat and /api/files routes
  if ((request.nextUrl.pathname.startsWith("/chat") || 
       request.nextUrl.pathname.startsWith("/api/files")) && 
      !session?.user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect /login to /chat if already authenticated
  if (request.nextUrl.pathname === "/login" && session?.user) {
    return NextResponse.redirect(new URL("/chat", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/chat/:path*", "/api/files/:path*", "/login"],
}
