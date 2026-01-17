import { LandingNavbar } from "@/components/landing/landing-navbar"
import Link from "next/link"
import { ArrowUpRight, Sparkles, Youtube, Chrome, ScanSearch, RefreshCcw, FileText, CheckCircle, Hash, PenTool, Type } from "lucide-react"

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
      title: "AI Content Detector",
      description: "Analyze text to determine if it was written by AI or a human.",
      href: "/tools/ai-content-detector",
      icon: ScanSearch,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      title: "Paraphrasing Tool",
      description: "Rewrite text in different styles while preserving meaning.",
      href: "/tools/paraphraser",
      icon: RefreshCcw,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Text Summarizer",
      description: "Condense long articles into clear, concise summaries.",
      href: "/tools/summarizer",
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Grammar Polisher",
      description: "Fix grammar, spelling, and punctuation with explanations.",
      href: "/tools/grammar",
      icon: CheckCircle,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Word Counter",
      description: "Count words, characters, sentences, and reading time.",
      href: "/tools/word-counter",
      icon: Hash,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      title: "Blog Title Generator",
      description: "Generate click-worthy blog titles that drive traffic.",
      href: "/tools/blog-title-generator",
      icon: PenTool,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Case Converter",
      description: "Convert text between different cases instantly.",
      href: "/tools/case-converter",
      icon: Type,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
    {
      title: "Viral Title Gen",
      description: "Generate YouTube titles backed by deep research.",
      href: "/tools/youtube-title-generator",
      icon: Youtube,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      title: "Rynk Companion",
      description: "AI grammar and tone fixer in your browser.",
      href: "https://github.com/rynk-ai/rynk-companion",
      icon: Chrome,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      badge: "Extension",
    },
  ]

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {tools.map((tool) => (
            <Link 
              key={tool.title} 
              href={tool.href}
              className="group relative flex flex-col p-5 bg-card border border-border rounded-xl hover:border-foreground/20 hover:shadow-lg transition-all duration-300"
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
        </div>
      </main>
    </div>
  )
}
