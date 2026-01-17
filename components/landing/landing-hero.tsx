"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { motion } from "motion/react";
import { PiArrowRight, PiTerminalWindow } from "react-icons/pi";
import { cn } from "@/lib/utils";

gsap.registerPlugin();

const LOG_LINES = [
  { text: "> INITIALIZING_AGENT [RUNNING]", color: "text-emerald-500" },
  { text: "> QUERY: \"Future of solid state batteries\"", color: "text-foreground" },
  { text: "> ANALYZING_INTENT: [DEEP_RESEARCH]", color: "text-blue-500" },
  { text: "> SEARCHING: Semantic Scholar... [FOUND 3 PAPERS]", color: "text-purple-500" },
  { text: "> READING: \"Nature_Energy_Vol4.pdf\" (p. 45)", color: "text-amber-500" },
  { text: "> CROSS_REFERENCING: [SUCCESS]", color: "text-emerald-500" },
  { text: "> EXTRACTING_CITATIONS: [4 ADDED]", color: "text-blue-500" },
  { text: "> GENERATING_REPORT: [SECTIONS: 6]", color: "text-foreground" },
  { text: "> FINALIZING_OUTPUT [COMPLETE]", color: "text-emerald-500" },
];

function ResearchLog() {
  const [lines, setLines] = useState<typeof LOG_LINES>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentIndex >= LOG_LINES.length) return;

    const timeout = setTimeout(() => {
      setLines(prev => [...prev, LOG_LINES[currentIndex]]);
      setCurrentIndex(prev => prev + 1);
    }, 800); // Add line every 800ms

    return () => clearTimeout(timeout);
  }, [currentIndex]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="w-full max-w-md mx-auto md:mr-0 font-mono text-xs md:text-sm bg-secondary/30 border border-border rounded-none p-4 h-[300px] flex flex-col relative overflow-hidden group">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
         <div className="flex items-center gap-2">
            <PiTerminalWindow className="w-4 h-4 text-muted-foreground" />
            <span className="uppercase tracking-widest text-[10px] text-muted-foreground">System_Log</span>
         </div>
         <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-border" />
            <div className="w-2 h-2 rounded-full bg-border" />
         </div>
      </div>

      {/* Log Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 scrollbar-none">
        {lines.map((line, i) => (
          <div key={i} className={cn("break-all animate-in fade-in slide-in-from-bottom-2 duration-300", line.color)}>
             {line.text}
          </div>
        ))}
        {currentIndex < LOG_LINES.length && (
           <div className="animate-pulse text-muted-foreground">_</div>
        )}
      </div>

       {/* Scanline Effect */}
       <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px]" />
    </div>
  );
}

export function LandingHero() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();

    // Left Column Animation
    tl.from(".hero-marker", {
      opacity: 0, 
      x: -20,
      duration: 0.8,
      ease: "power3.out"
    })
    .from(".hero-line", {
      scaleX: 0,
      transformOrigin: "left",
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.6")
    .from(".hero-title-line", {
      y: 100,
      opacity: 0,
      rotateX: -20,
      stagger: 0.1,
      duration: 1,
      ease: "power4.out"
    }, "-=0.4")
    .from(".hero-subhead", {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.6")
    .from(".hero-cta", {
      opacity: 0,
      scale: 0.95,
      duration: 0.6,
      ease: "back.out(1.5)"
    }, "-=0.4");

    // Right Column Animation
    gsap.from(".hero-log", {
      opacity: 0,
      x: 40,
      duration: 1,
      ease: "power3.out",
      delay: 0.5
    });

  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[90vh] flex items-center border-b border-border overflow-hidden bg-background"
    >
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-[0.15] pointer-events-none" />

        <div className="container px-4 md:px-6 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10 pt-20 pb-20">
            
            {/* Left Col: The Promise */}
            <div className="flex flex-col gap-8 md:gap-12 relative">
                {/* Technical Markers */}
                <div className="flex items-center gap-4 text-[10px] font-mono tracking-widest text-muted-foreground hero-marker">
                    <span>[SYS_READY]</span>
                    <span className="w-12 h-px bg-border hero-line" />
                    <span>V.2.0.4</span>
                </div>

                {/* Massive Typography */}
                <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold leading-[0.85] tracking-tight uppercase flex flex-col gap-2">
                    <span className="hero-title-line block">Research</span>
                    <span className="hero-title-line block text-muted-foreground">That Shows</span>
                    <span className="hero-title-line block">Its Work.</span>
                </h1>

                {/* Brutalist Subhead */}
                <div className="hero-subhead max-w-md pl-1 border-l-2 border-primary/50">
                    <p className="text-lg md:text-xl text-muted-foreground leading-relaxed pl-6">
                        No black boxes. No hallucinations. <br/>
                        Just verifiable facts from 200M+ papers.
                    </p>
                </div>

                {/* CTA */}
                <div className="hero-cta flex flex-wrap gap-6 items-center">
                    <Link href="/chat">
                        <motion.button
                            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background font-bold uppercase tracking-wider text-sm overflow-hidden"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Start Researching
                                <PiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </span>
                            <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                        </motion.button>
                    </Link>
                    
                    <a href="#how-it-works" className="text-sm font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors border-b border-transparent hover:border-foreground pb-0.5">
                        View Pipeline_Log
                    </a>
                </div>
            </div>

            {/* Right Col: The Proof (Log) */}
            <div className="hero-log relative">
                 <div className="absolute -inset-1 bg-gradient-to-tr from-primary/20 via-transparent to-transparent opacity-50 blur-xl" />
                 <ResearchLog />
                 
                 {/* Decorative Elements */}
                 <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-50">
                    <div className="w-1 h-2 bg-border" />
                    <div className="w-1 h-2 bg-border" />
                    <div className="w-1 h-8 bg-primary/50" />
                    <div className="w-1 h-2 bg-border" />
                 </div>
            </div>

        </div>
    </section>
  );
}
