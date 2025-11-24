"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PromptInputWithFiles } from "@/components/prompt-input-with-files"
import { TextShimmer } from "@/components/motion-primitives/text-shimmer"

export default function HomePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user is authenticated
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/session')
        const session = await response.json() as { user?: unknown }
        setIsAuthenticated(!!session?.user)
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  const handleSubmit = async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return

    // Store the query and files info in localStorage
    localStorage.setItem('pendingChatQuery', text)
    
    // Store file references (we'll handle actual files on chat page)
    if (files.length > 0) {
      // Note: Can't store File objects directly in localStorage
      // We'll just store the count for now, files will need to be re-uploaded
      localStorage.setItem('pendingChatFilesCount', files.length.toString())
    }

    // Redirect based on auth status
    if (isAuthenticated) {
      router.push('/chat')
    } else {
      router.push('/login')
    }
  }

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <main className="flex h-screen w-full flex-col items-center justify-center bg-background px-4">
      {/* Branding */}
      <div className="mb-24 flex flex-col items-center">
        <TextShimmer
          spread={5}
          duration={4}
          className="text-3xl md:text-4xl lg:text-7xl font-bold tracking-tighter text-foreground/70 leading-tight"
        >
          simplychat.
        </TextShimmer>
      </div>

      {/* Input Field */}
      <div className="w-full max-w-3xl lg:max-w-4xl">
        <PromptInputWithFiles
          onSubmit={handleSubmit}
          placeholder="Message..."
          className="glass relative z-10 w-full rounded-2xl md:rounded-3xl border border-border/50 p-0 shadow-lg transition-all duration-500"
          isLoading={false}
        />
      </div>

      {/* Optional hint text */}
      <p className="mt-6 text-sm text-muted-foreground">
        {isAuthenticated ? "Start a conversation" : "Sign in to continue"}
      </p>
    </main>
  )
}
