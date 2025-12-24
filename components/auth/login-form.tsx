"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { PiSpinner, PiEnvelope, PiArrowLeft } from "react-icons/pi"

export function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/chat"
  const error = searchParams.get("error")
  
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || isLoading) return
    
    setIsLoading(true)
    setErrorMessage(null)
    
    try {
      const result = await signIn("resend", {
        email,
        callbackUrl,
        redirect: false,
      })
      
      if (result?.error) {
        setErrorMessage("Failed to send magic link. Please try again.")
      } else {
        setEmailSent(true)
      }
    } catch (err) {
      setErrorMessage("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    await signIn("google", { callbackUrl })
  }

  // Show success message after email is sent
  if (emailSent) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex w-full max-w-sm flex-col items-center space-y-6 rounded-lg border bg-card p-8 shadow-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <PiEnvelope className="h-6 w-6 text-primary" />
          </div>
          <div className="flex flex-col items-center space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a magic link to <span className="font-medium text-foreground">{email}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Click the link in the email to sign in.
            </p>
          </div>
          <button
            onClick={() => {
              setEmailSent(false)
              setEmail("")
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <PiArrowLeft className="h-4 w-4" />
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex w-full max-w-sm flex-col items-center space-y-6 rounded-lg border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        {/* Error message */}
        {(error || errorMessage) && (
          <div className="w-full rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
            {errorMessage || (error === "OAuthAccountNotLinked" 
              ? "This email is already associated with another account." 
              : "An error occurred. Please try again.")}
          </div>
        )}

        {/* Email form */}
        <form onSubmit={handleEmailSubmit} className="w-full space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !email}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <PiSpinner className="h-4 w-4 animate-spin" />
                Sending magic link...
              </>
            ) : (
              <>
                <PiEnvelope className="h-4 w-4" />
                Continue with email
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google sign in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <PiSpinner className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Google
        </button>

        {/* Divider for guest mode */}
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        {/* Guest mode */}
        <a
          href="/guest-chat"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/30 bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Continue as Guest
        </a>

        <p className="text-xs text-center text-muted-foreground">
          Try without an account • Limited features
        </p>
      </div>
    </div>
  )
}
