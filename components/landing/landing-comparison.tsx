"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { PiLink } from "react-icons/pi";

gsap.registerPlugin(ScrollTrigger);

export function LandingComparison() {
  const containerRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 70%",
        end: "bottom center",
        toggleActions: "play none none reverse"
      }
    });

    tl.from(".comp-header", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
    })
    .from(".comp-card", {
        y: 100,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "expo.out"
    }, "-=0.4");

  }, { scope: containerRef });

  return (
    <section ref={containerRef} id="features" className="py-32 bg-background relative overflow-hidden">
      
      <div className="container px-4 mx-auto">
        <div className="comp-header mb-20 max-w-4xl">
           <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] mb-8 text-foreground">
              STOP READING
              <span className="block text-muted-foreground">WALLS OF TEXT.</span>
           </h2>
           <div className="h-px w-24 bg-foreground mb-8" />
           <p className="text-xl md:text-2xl text-foreground font-medium max-w-2xl leading-relaxed">
             Other AIs dump paragraphs. We give you <span className="bg-foreground text-background px-1">tables, timelines, and cited sources</span>—ready to use.
           </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          
          {/* Box 1: Standard LLM (Chaos) */}
          <div className="comp-card bg-secondary/30 border border-border p-8 md:p-12 flex flex-col h-full relative overflow-hidden group">
             <div className="mb-10">
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground block mb-2">Standard Model</span>
                <h3 className="text-2xl font-bold tracking-tight opacity-50">Unstructured Output</h3>
             </div>

             <div className="flex-1 relative z-10">
                 {/* Visual chaos representation */}
                 <div className="space-y-4 opacity-50 blur-[1px] group-hover:blur-0 transition-all duration-500">
                    <div className="h-4 w-full bg-foreground/10" />
                    <div className="h-4 w-[90%] bg-foreground/10" />
                    <div className="h-4 w-[95%] bg-foreground/10" />
                    <div className="h-4 w-[85%] bg-foreground/10" />
                    <div className="h-4 w-full bg-foreground/10" />
                    <div className="h-4 w-[92%] bg-foreground/10" />
                 </div>
                 
                 <div className="mt-8 p-4 border border-red-500/20 bg-red-500/5 text-red-600 font-mono text-xs flex items-center justify-center">
                    ERROR: TOO_MUCH_NOISE
                 </div>
             </div>
          </div>

          {/* Box 2: rynk. (Order) */}
          <div className="comp-card bg-background border border-foreground p-0 md:p-0 flex flex-col h-full relative overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[10px_10px_0px_0px_white]">
            <div className="p-8 md:p-12 border-b border-border">
                <span className="text-xs font-mono uppercase tracking-widest text-accent block mb-2">rynk.</span>
                <h3 className="text-2xl font-bold tracking-tight">Structured Comparison</h3>
            </div>

            <div className="flex-1 p-8 md:p-12 bg-secondary/20">
                 {/* Structured Table Visual */}
                 <div className="w-full text-sm">
                    <div className="grid grid-cols-3 gap-4 pb-4 border-b-2 border-foreground mb-4 font-mono text-[10px] uppercase tracking-wider font-bold">
                        <span>Feature</span>
                        <span>iPhone 15 Pro</span>
                        <span>Pixel 9 Pro</span>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 border-b border-border/50 pb-2">
                             <span className="font-bold">Chipset</span>
                             <span className="font-mono text-muted-foreground">A17 Pro</span>
                             <span className="font-mono text-muted-foreground">Tensor G4</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 border-b border-border/50 pb-2">
                             <span className="font-bold">Material</span>
                             <span className="font-mono text-muted-foreground">Titanium</span>
                             <span className="font-mono text-muted-foreground">Aluminum</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 border-b border-border/50 pb-2">
                             <span className="font-bold">RAM</span>
                             <span className="font-mono text-muted-foreground">8 GB</span>
                             <span className="font-mono text-muted-foreground">16 GB</span>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <div className="px-2 py-1 border border-border bg-background text-[10px] font-mono flex items-center gap-2 text-muted-foreground">
                            <PiLink /> GSM Arena
                        </div>
                        <div className="px-2 py-1 border border-border bg-background text-[10px] font-mono flex items-center gap-2 text-muted-foreground">
                            <PiLink /> The Verge
                        </div>
                    </div>
                 </div>
            </div>
          </div>
        
        </div>
      </div>
    </section>
  );
}
