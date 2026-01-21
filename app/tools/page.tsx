import { LandingNavbar } from "@/components/landing/landing-navbar"
import type { Metadata } from "next"
import ToolsBrowser from "./tools-browser"

export const metadata: Metadata = {
  title: "Free AI Tools Suite | rynk.",
  description: "A collection of powerful, free AI tools for content creators, developers, and writers. Includes Instagram caption generator, content detector, and more.",
  openGraph: {
    title: "Free AI Tools Suite | rynk.",
    description: "Supercharge your workflow with our free AI tools. No sign-up required for basic use.",
    url: "https://rynk.io/tools",
    images: [
        {
            url: "https://og.rynk.io/api/tools?title=Free%20AI%20Tools%20Suite&description=Supercharge%20your%20workflow%20with%20our%20free%20AI%20tools.",
            width: 1200,
            height: 630,
            alt: "rynk. AI Tools Suite",
        }
    ]
  }
}

export default function ToolsPage() {
  return (
    <div className="flex-1 w-full min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <LandingNavbar />

      <main className="w-full pt-28 sm:pt-32 pb-16 sm:pb-20">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance">
              Powerful AI Tools for{" "}
              <span className="text-muted-foreground">Every Creator</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground text-balance max-w-lg mx-auto">
              A suite of precision-engineered tools to supercharge your workflow. 
              Free to use, designed for impact.
            </p>
          </div>

          <ToolsBrowser />
        </div>
      </main>
    </div>
  )
}
