"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { PiArrowRight, PiMagnifyingGlass, PiSparkle } from "react-icons/pi";
import { motion } from "motion/react";

gsap.registerPlugin();

export function LandingHero() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.from(".hero-badge", {
      y: 20,
      opacity: 0,
      duration: 0.6,
      ease: "power3.out"
    })
    .from(".hero-title", {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.4")
    .from(".hero-sub", {
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.6")
    .from(".hero-input", {
      scale: 0.95,
      opacity: 0,
      duration: 0.8,
      ease: "back.out(1.2)"
    }, "-=0.4");

  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[50vh] flex flex-col items-center justify-center pt-24 pb-12 bg-background overflow-hidden"
    >
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="container px-4 md:px-6 mx-auto relative z-10 flex flex-col items-center text-center max-w-2xl">
            
            {/* Badge */}
            <div className="hero-badge mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Live: Deep Research Agent
                </span>
            </div>

            {/* Headline */}
            <h1 className="hero-title text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4 text-balance">
                Synthesize the <br className="hidden md:block"/>
                <span className="text-muted-foreground">world's knowledge.</span>
            </h1>

            {/* Subhead */}
            <p className="hero-sub text-base text-muted-foreground max-w-lg mb-8 leading-relaxed text-pretty">
                Rynk is an autonomous research agent. It reads millions of sources, verifies facts, and writes cited reports. No hallucinations. 100% verifiable.
            </p>

            {/* Simulated Input / CTA */}
            <div className="hero-input w-full max-w-2xl relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-secondary via-primary/20 to-secondary rounded-2xl opacity-20 group-hover:opacity-40 blur transition-opacity duration-500" />
                
                <div className="relative bg-background border border-border rounded-xl p-2 shadow-2xl flex flex-col gap-2">
                    {/* Fake Input Area */}
                    <div className="flex items-center gap-4 px-4 py-3">
                        <PiMagnifyingGlass className="w-5 h-5 text-muted-foreground" />
                        <span className="text-muted-foreground/50 text-lg flex-1 text-left line-clamp-1">
                            e.g., Economic implications of quantum computing.
                        </span>
                        <Link href="/chat">
                             <button className="bg-foreground text-background px-6 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                                Start Researching <PiArrowRight />
                            </button>
                        </Link>
                    </div>

                    {/* Pre-suggested quick actions */}
                    <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">Try:</span>
                        {["Market Analysis", "Legal Precedent", "Medical Review"].map((tag) => (
                            <div key={tag} className="px-2 py-1 rounded bg-secondary text-xs text-secondary-foreground whitespace-nowrap">
                                {tag}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Trust / Social Proof */}
            <div className="mt-10 pt-6 border-t border-border/50 flex flex-col items-center gap-3 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-forwards scale-90">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                    Powered by verified sources
                </p>
                <div className="flex items-center gap-6 grayscale opacity-50">
                   <span className="font-serif font-bold text-sm">Semantic Scholar</span>
                   <span className="font-serif font-bold text-sm">PubMed</span>
                   <span className="font-serif font-bold text-sm">Crossref</span>
                   <span className="font-serif font-bold text-sm">arXiv</span>
                </div>
            </div>

        </div>
    </section>
  );
}
