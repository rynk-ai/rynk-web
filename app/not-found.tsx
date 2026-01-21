import Link from "next/link"
import { LandingNavbar } from "@/components/landing/landing-navbar"
import { LandingFooter } from "@/components/landing/landing-footer"

export default function NotFound() {
  return (
    <div className="flex-1 w-full min-h-screen bg-background text-foreground flex flex-col items-center">
      <div className="w-full max-w-3xl mx-auto border-x border-dashed border-border/50 min-h-screen bg-background shadow-2xl shadow-black/5 flex flex-col">
        <LandingNavbar />
        
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            The page you are looking for does not exist or has been moved.
          </p>
          
          <div className="flex gap-4">
            <Link 
              href="/"
              className="px-6 py-2.5 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              Go Home
            </Link>
            <Link 
              href="/chat"
              className="px-6 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Start Chat
            </Link>
          </div>
        </main>

        <LandingFooter />
      </div>
    </div>
  )
}
