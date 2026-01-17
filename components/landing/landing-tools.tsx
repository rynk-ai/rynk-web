"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { motion } from "motion/react";
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
  PiArrowUpRight,
} from "react-icons/pi";

gsap.registerPlugin(ScrollTrigger);

const TOOLS = [
  {
    title: "AI Humanizer",
    description: "Make AI text sound human.",
    href: "/humanizer",
    icon: PiSparkle,
  },
  {
    title: "AI Detector",
    description: "Check if text is AI-written.",
    href: "/tools/ai-content-detector",
    icon: PiMagnifyingGlass,
  },
  {
    title: "Paraphraser",
    description: "Rewrite, preserve meaning.",
    href: "/tools/paraphraser",
    icon: PiArrowsClockwise,
  },
  {
    title: "Summarizer",
    description: "Long → short.",
    href: "/tools/summarizer",
    icon: PiFileText,
  },
  {
    title: "Grammar",
    description: "Fix mistakes, see why.",
    href: "/tools/grammar",
    icon: PiCheckCircle,
  },
  {
    title: "Word Counter",
    description: "Words, chars, read time.",
    href: "/tools/word-counter",
    icon: PiHash,
  },
  {
    title: "Blog Titles",
    description: "Headlines that click.",
    href: "/tools/blog-title-generator",
    icon: PiPencilLine,
  },
  {
    title: "Case Converter",
    description: "Any case, instantly.",
    href: "/tools/case-converter",
    icon: PiTextAa,
  },
  {
    title: "YouTube Titles",
    description: "Research-backed viral titles.",
    href: "/tools/youtube-title-generator",
    icon: PiYoutubeLogo,
  },
];

export function LandingTools() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from(".tool-card", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 75%",
      },
      y: 40,
      opacity: 0,
      stagger: {
        amount: 0.5,
        grid: [3, 3],
        from: "start",
      },
      duration: 0.6,
      ease: "power3.out",
    });

    gsap.from(".tools-header", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
      },
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: "power3.out",
    });
  }, { scope: containerRef });

  return (
    <section
      ref={containerRef}
      id="tools"
      className="py-24 md:py-32 bg-secondary/20 border-t border-border"
    >
      <div className="container px-4 md:px-6 mx-auto">
        {/* Header */}
        <div className="tools-header flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground block mb-4">
              Free tools
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] uppercase">
              9 tools.{" "}
              <span className="text-muted-foreground">All free.</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
            No login required for any of them. Just paste your text and go.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
          {TOOLS.map((tool) => (
            <Link key={tool.title} href={tool.href}>
              <motion.div
                className="tool-card relative p-6 md:p-8 bg-background h-full flex flex-col group cursor-pointer"
                whileHover={{ backgroundColor: "hsl(var(--secondary) / 0.5)" }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon */}
                <div className="w-10 h-10 border border-foreground/20 flex items-center justify-center mb-5 group-hover:border-foreground group-hover:bg-foreground group-hover:text-background transition-all">
                  <tool.icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors flex items-center gap-2">
                    {tool.title}
                    <PiArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/tools"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            View all tools →
          </Link>
        </div>
      </div>
    </section>
  );
}
