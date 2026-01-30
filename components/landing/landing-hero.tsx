"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { PiArrowRight, PiMagnifyingGlass, PiSparkle } from "react-icons/pi";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

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
    .from(".hero-cta", {
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.4");

  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[60vh] flex flex-col items-center justify-center pt-32 pb-20 bg-background overflow-hidden"
    >
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="container px-4 md:px-6 mx-auto relative z-10 flex flex-col items-center text-center max-w-3xl">
            
            {/* Badge */}
            <div className="hero-badge mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 backdrop-blur-sm border border-border/60 shadow-[0_0_15px_rgba(0,0,0,0.05)] hover:bg-background/80 transition-colors cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-medium text-foreground/80 uppercase tracking-wider">
                    Autonomous Research Agent
                </span>
            </div>

            {/* Headline */}
            <h1 className="hero-title text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 text-balance leading-[1.1]">
                Deep research. <br className="hidden md:block"/>
                <span className="text-muted-foreground">Done in minutes.</span>
            </h1>

            {/* Subhead */}
            <p className="hero-sub text-lg text-muted-foreground/90 max-w-xl mb-10 leading-relaxed text-pretty">
                Stop sifting through search results. Rynk is an agent that plans, reads, and writes detailed reports for you. 100% cited.
            </p>

            {/* CTA Buttons */}
            <div className="hero-cta flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <Link href="/chat" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all group">
                        Start Researching
                        <PiArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </Link>
                <Link href="#how-it-works" className="w-full sm:w-auto">
                     <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-medium rounded-full bg-background/50 backdrop-blur border-border/50 hover:bg-secondary/50">
                       How it works
                     </Button>
                </Link>
            </div>

            {/* Trust / Social Proof */}
            <div className="mt-16 pt-8 border-t border-border/40 flex flex-col items-center gap-4 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-forwards scale-95">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.2em]">
                    Trusted Sources
                </p>
                <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 grayscale opacity-40 hover:opacity-60 transition-opacity duration-500">
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
