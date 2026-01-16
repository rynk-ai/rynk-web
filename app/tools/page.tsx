import { LandingNavbar } from "@/components/landing/landing-navbar"
import Link from "next/link"
import { ArrowUpRight, Sparkles, Youtube, Chrome } from "lucide-react"

export default function ToolsPage() {
  const tools = [
    {
      title: "AI Humanizer",
      description: "Make AI-generated text undetectable and naturally human-like.",
      href: "/humanizer",
      icon: Sparkles,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Viral Title Gen",
      description: "Generate click-worthy YouTube titles backed by deep research.",
      href: "/tools/youtube-title-generator",
      icon: Youtube,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      title: "Rynk Companion",
      description: "The AI grammar and tone fixer that lives in your browser.",
      href: "https://github.com/rynk-ai/rynk-companion",
      icon: Chrome,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      badge: "Extension",
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <LandingNavbar />

      <main className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-2xl mx-auto text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">
            Powerful AI Tools for <br />
            <span className="text-muted-foreground">Every Creator</span>
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            A suite of precision-engineered tools to supercharge your workflow. 
            Free to use, designed for impact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tools.map((tool) => (
            <Link 
              key={tool.title} 
              href={tool.href}
              className="group relative flex flex-col p-6 bg-card border border-border hover:border-foreground/20 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${tool.bg} ${tool.color}`}>
                  <tool.icon className="w-6 h-6" />
                </div>
                {tool.badge && (
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-secondary text-secondary-foreground rounded-full">
                    {tool.badge}
                  </span>
                )}
                {!tool.badge && (
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                )}
              </div>
              
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{tool.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
