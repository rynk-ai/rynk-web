"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { PiBrain, PiFiles, PiChatCircle } from "react-icons/pi";

gsap.registerPlugin(ScrollTrigger);

export function LandingBento() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from(".bento-card", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 75%",
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out"
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-24 bg-background border-b border-border">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-20 max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] mb-8 text-foreground">
             A MEMORY SYSTEM <br/>
             <span className="text-muted-foreground">THAT ACTUALLY REMEMBERS.</span>
          </h2>
          <div className="flex justify-center">
             <div className="h-px w-24 bg-foreground mb-8" />
          </div>
          <p className="text-lg md:text-xl text-foreground font-medium max-w-2xl mx-auto leading-relaxed">
             Project-scoped memory, infinite context, and instant file analysis. <br/>Stop repeating yourself.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-0 border border-border bg-border">
            
            {/* Feature 1: Memory */}
            <div className="bento-card bg-background p-8 md:p-12 hover:bg-secondary/20 transition-colors flex flex-col h-full border-b md:border-b-0 md:border-r border-border min-h-[400px]">
                <div className="mb-auto">
                    <span className="text-4xl font-mono font-bold text-border text-stroke">01</span>
                </div>
                
                <div className="mt-8 mb-8">
                     <h3 className="text-2xl font-bold tracking-tight mb-4 uppercase">Infinite Context</h3>
                     <p className="text-muted-foreground leading-relaxed text-sm">
                        It remembers your preferences, projects, and tech stack. No context window anxiety.
                     </p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border border-dashed">
                    <div className="flex flex-wrap gap-2 text-[10px] uppercase font-mono tracking-wider">
                        <span className="bg-secondary px-2 py-1">React</span>
                        <span className="bg-secondary px-2 py-1">Tailwind</span>
                        <span className="bg-secondary px-2 py-1">Next.js</span>
                    </div>
                </div>
            </div>

            {/* Feature 2: Files */}
            <div className="bento-card bg-background p-8 md:p-12 hover:bg-secondary/20 transition-colors flex flex-col h-full border-b md:border-b-0 md:border-r border-border min-h-[400px]">
                <div className="mb-auto">
                    <span className="text-4xl font-mono font-bold text-border text-stroke">02</span>
                </div>
                
                <div className="mt-8 mb-8">
                     <h3 className="text-2xl font-bold tracking-tight mb-4 uppercase">File Analysis</h3>
                     <p className="text-muted-foreground leading-relaxed text-sm">
                        Drop PDFs, CSVs, or entire codebases. Instant analysis without uploading to third parties.
                     </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border border-dashed">
                     <div className="flex items-center gap-3">
                         <div className="w-8 h-10 border border-foreground bg-background relative flex flex-col items-center justify-center">
                             <span className="text-[6px] font-bold">PDF</span>
                         </div>
                         <div className="w-8 h-10 border border-foreground bg-secondary relative flex flex-col items-center justify-center">
                             <span className="text-[6px] font-bold">CSV</span>
                         </div>
                         <div className="w-8 h-10 border border-foreground bg-background relative flex flex-col items-center justify-center grayscale">
                             <span className="text-[6px] font-bold">DOC</span>
                         </div>
                     </div>
                </div>
            </div>

            {/* Feature 3: Threads */}
            <div className="bento-card bg-background p-8 md:p-12 hover:bg-secondary/20 transition-colors flex flex-col h-full min-h-[400px]">
                <div className="mb-auto">
                    <span className="text-4xl font-mono font-bold text-border text-stroke">03</span>
                </div>
                
                <div className="mt-8 mb-8">
                     <h3 className="text-2xl font-bold tracking-tight mb-4 uppercase">Threaded Context</h3>
                     <p className="text-muted-foreground leading-relaxed text-sm">
                        Dive deep into any topic without losing your main flow. Just select and ask.
                     </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border border-dashed pl-4">
                     <div className="border-l border-foreground pl-4 space-y-4">
                         <div className="h-2 w-12 bg-foreground rounded-none"></div>
                         <div className="h-2 w-20 bg-foreground/50 rounded-none"></div>
                     </div>
                </div>
            </div>

        </div>
      </div>
    </section>
  );
}
