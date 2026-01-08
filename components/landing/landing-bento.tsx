"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { PiBrain, PiGlobe, PiTrendUp, PiGraduationCap, PiArrowRight } from "react-icons/pi";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export function LandingBento() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from(".bento-item", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
      },
      y: 60,
      opacity: 0,
      duration: 1,
      stagger: 0.1,
      ease: "power3.out"
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-24 bg-background border-b border-border">
      <div className="container px-4 md:px-6 mx-auto">
        
        {/* Section Header */}
        <div className="mb-16 md:mb-24 max-w-2xl">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] text-foreground mb-6 uppercase font-display">
            The Grid of <br/><span className="text-muted-foreground">Possibilities.</span>
          </h2>
          <p className="text-lg text-muted-foreground font-light tracking-wide max-w-lg">
            A rigid system designed for flexible thought. Every surface is optimized for a specific mode of intelligence.
          </p>
        </div>

        {/* Swiss Grid - High Contrast Borders */}
        <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(300px,auto)] border-t border-l border-foreground/10 bg-foreground/10 gap-px">
            
            {/* Feature 1: Deep Reasoning (Large) */}
            <div className="bento-item col-span-1 md:col-span-8 bg-background p-8 md:p-12 flex flex-col justify-between group overflow-hidden">
                <div className="flex justify-between items-start">
                    <div className="w-12 h-12 border border-foreground flex items-center justify-center bg-secondary group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                        <PiBrain className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Sys.02</span>
                </div>
                
                <div className="mt-12 relative z-10">
                     <h3 className="text-3xl font-bold tracking-tighter mb-4 uppercase">Deep Reasoning</h3>
                     <p className="text-muted-foreground leading-relaxed max-w-md">
                        Chain-of-thought processing for complex problem solving. Rynk thinks before it speaks, breaking down queries into logical steps.
                     </p>
                </div>

                {/* Decorative Pattern */}
                <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
                    <div className="w-64 h-64 border-l border-t border-foreground p-4">
                        <div className="w-full h-full border-l border-t border-foreground p-4">
                             <div className="w-full h-full border-l border-t border-foreground"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature 2: Finance (Tall) */}
            <div className="bento-item col-span-1 md:col-span-4 md:row-span-2 bg-background p-8 md:p-12 flex flex-col justify-between group">
                <div className="flex justify-between items-start">
                    <div className="w-12 h-12 border border-foreground flex items-center justify-center bg-secondary group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                        <PiTrendUp className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Fin.Mk</span>
                </div>

                <div className="my-10">
                    <div className="font-mono text-sm space-y-2 text-muted-foreground">
                        <div className="flex justify-between border-b border-border pb-1">
                            <span>BTC</span> <span className="text-foreground">98,241.00</span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-1">
                            <span>ETH</span> <span className="text-foreground">2,841.50</span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-1">
                            <span>SOL</span> <span className="text-foreground">142.20</span>
                        </div>
                         <div className="flex justify-between border-b border-border pb-1">
                            <span>NDX</span> <span className="text-foreground">19,203.1</span>
                        </div>
                    </div>
                </div>
                
                <div className="mt-auto">
                     <h3 className="text-3xl font-bold tracking-tighter mb-4 uppercase">Market Analysis</h3>
                     <p className="text-muted-foreground leading-relaxed text-sm">
                        Real-time financial data, technical signals, and sentiment analysis for crypto and equities.
                     </p>
                </div>
            </div>

            {/* Feature 3: Research */}
            <div className="bento-item col-span-1 md:col-span-4 bg-background p-8 md:p-12 flex flex-col justify-between group hover:bg-secondary/20 transition-colors">
                <div className="mb-8">
                     <div className="w-12 h-12 border border-foreground flex items-center justify-center bg-secondary group-hover:bg-foreground group-hover:text-background transition-colors duration-300 mb-6">
                        <PiGlobe className="w-6 h-6" />
                    </div>
                     <h3 className="text-2xl font-bold tracking-tighter mb-3 uppercase">Agentic Research</h3>
                     <p className="text-muted-foreground leading-relaxed text-sm">
                        Synthesizing multiple sources (Exa, Perplexity) into a unified report.
                     </p>
                </div>
                <div className="flex gap-2">
                    <div className="h-1 w-8 bg-foreground"></div>
                    <div className="h-1 w-4 bg-muted-foreground/30"></div>
                </div>
            </div>

             {/* Feature 4: Learning */}
            <div className="bento-item col-span-1 md:col-span-4 bg-background p-8 md:p-12 flex flex-col justify-between group hover:bg-secondary/20 transition-colors">
                <div className="mb-8">
                     <div className="w-12 h-12 border border-foreground flex items-center justify-center bg-secondary group-hover:bg-foreground group-hover:text-background transition-colors duration-300 mb-6">
                        <PiGraduationCap className="w-6 h-6" />
                    </div>
                     <h3 className="text-2xl font-bold tracking-tighter mb-3 uppercase">Structured Learning</h3>
                     <p className="text-muted-foreground leading-relaxed text-sm">
                        Turn any topic into a multi-chapter course with quizzes and progress tracking.
                     </p>
                </div>
                 <div className="w-full bg-border h-1 mt-auto group-hover:bg-foreground/20 transition-colors">
                    <div className="bg-foreground h-full w-[65%]"></div>
                 </div>
            </div>

        </div>
      </div>
    </section>
  );
}
