import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LoginForm } from "@/components/auth/login-form"
import type { Metadata } from "next"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to rynk. to access your AI chat history, manage conversations, and collaborate with AI.",
  robots: {
    index: false,
    follow: false
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  const { callbackUrl } = await searchParams
  const redirectUrl = callbackUrl || "/chat"
  
  if (session?.user) {
    redirect(redirectUrl)
  }

  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex w-full max-w-sm flex-col items-center space-y-6 rounded-lg border bg-card p-8 shadow-lg">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
