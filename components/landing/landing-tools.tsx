"use client";

import Link from "next/link";
import {
  PiSparkle,
  PiMagnifyingGlass,
  PiArrowsClockwise,
  PiFileText,
  PiCheckCircle,
  PiHash,
  PiPencilLine,
  PiTextAa,
  PiYoutubeLogo,
} from "react-icons/pi";

const TOOLS = [
  {
    title: "AI Humanizer",
    description: "Make AI text sound human.",
    href: "/humanizer",
    icon: PiSparkle,
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/20",
  },
  {
    title: "AI Detector",
    description: "Check if text is AI-written.",
    href: "/tools/ai-content-detector",
    icon: PiMagnifyingGlass,
    color: "text-violet-600 bg-violet-100 dark:bg-violet-900/20",
  },
  {
    title: "Paraphraser",
    description: "Rewrite while preserving meaning.",
    href: "/tools/paraphraser",
    icon: PiArrowsClockwise,
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20",
  },
  {
    title: "Summarizer",
    description: "Condense long text instantly.",
    href: "/tools/summarizer",
    icon: PiFileText,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/20",
  },
  {
    title: "Grammar Fixer",
    description: "Correct mistakes with explanations.",
    href: "/tools/grammar",
    icon: PiCheckCircle,
    color: "text-amber-600 bg-amber-100 dark:bg-amber-900/20",
  },
  {
    title: "Word Counter",
    description: "Count words, chars, and time.",
    href: "/tools/word-counter",
    icon: PiHash,
    color: "text-rose-600 bg-rose-100 dark:bg-rose-900/20",
  },
];

export function LandingTools() {
  return (
    <section id="tools" className="py-16 bg-background">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight mb-3">Free AI Tools</h2>
            <p className="text-muted-foreground text-lg max-w-xl">
                No sign-up required. Just helpful utilities for your daily workflow.
            </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS.map((tool) => (
            <Link key={tool.title} href={tool.href} className="group block h-full">
              <div className="h-full p-6 rounded-2xl border border-border bg-card hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                 <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tool.color}`}>
                       <tool.icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                            {tool.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-snug">
                            {tool.description}
                        </p>
                    </div>
                 </div>
              </div>
            </Link>
          ))}
        </div>
        
        <div className="mt-12 text-center">
             <Link href="/tools">
                <button className="px-6 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors">
                    View all 10 tools
                </button>
             </Link>
        </div>

      </div>
    </section>
  );
}
