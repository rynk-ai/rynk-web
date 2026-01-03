"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { PiShareNetwork } from "react-icons/pi";

gsap.registerPlugin(ScrollTrigger);

export function LandingModelRouting() {
  const containerRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 60%",
        end: "bottom center",
        toggleActions: "play none none reverse"
      }
    });

    // Reveal Header
    tl.from(".route-header", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
    });

    // Animate Diagram
    tl.from(".route-node-center", { scale: 0, duration: 0.5, ease: "back.out(1.7)" })
      .to(".route-path-left", { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" }, "-=0.2")
      .to(".route-path-right", { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" }, "<")
      .from(".route-node-target", { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 }, "-=0.4");

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-32 bg-background relative border-b border-border">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-24 max-w-3xl mx-auto route-header">
           <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground block mb-6">Autonomous Orchestration</span>
           <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[0.9] text-foreground mb-8">
             WE SWITCH AI MODELS <br/>
             <span className="text-muted-foreground">SO YOU DON'T HAVE TO.</span>
           </h2>
        </div>

        <div className="relative max-w-5xl mx-auto">
            {/* The Diagram Layer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center relative z-10">
                
                {/* Left: Speed */}
                <div className="flex flex-col items-center text-center route-node-target">
                    <div className="border border-border bg-background p-6 w-full max-w-[280px] h-[200px] flex flex-col items-center justify-center hover:bg-secondary/20 transition-colors duration-300 relative group">
                        <span className="absolute top-4 left-4 text-xs font-mono uppercase text-muted-foreground">Path A</span>
                        <div className="mb-4">
                             <div className="w-2 h-2 bg-green-500 rounded-none mb-2 mx-auto"></div>
                             <h3 className="text-2xl font-bold uppercase tracking-tight">Speed</h3>
                        </div>
                        <p className="text-sm text-muted-foreground px-4">Llama 3 70B<br/>800+ Tokens/sec</p>
                    </div>
                </div>

                {/* Center: Router */}
                <div className="flex flex-col items-center justify-center py-12 md:py-0 relative">
                     <div className="w-24 h-24 bg-foreground text-background flex items-center justify-center route-node-center relative z-20 shadow-xl">
                         <PiShareNetwork className="h-10 w-10" />
                     </div>
                     <span className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">Smart Router</span>
                </div>

                {/* Right: Reasoning */}
                <div className="flex flex-col items-center text-center route-node-target">
                    <div className="border border-border bg-background p-6 w-full max-w-[280px] h-[200px] flex flex-col items-center justify-center hover:bg-secondary/20 transition-colors duration-300 relative group">
                        <span className="absolute top-4 left-4 text-xs font-mono uppercase text-muted-foreground">Path B</span>
                        <div className="mb-4">
                             <div className="w-2 h-2 bg-accent rounded-none mb-2 mx-auto"></div>
                             <h3 className="text-2xl font-bold uppercase tracking-tight">Logic</h3>
                        </div>
                        <p className="text-sm text-muted-foreground px-4">Claude 3.5 Sonnet<br/>Complex Reasoning</p>
                    </div>
                </div>
            </div>

            {/* SVG Connector Lines (Absolute Overlay) */}
            <div className="absolute inset-0 pointer-events-none hidden md:block">
                <svg className="w-full h-full" overflow="visible">
                    {/* Path Center to Left */}
                    <path 
                        d="M 50% 50% L 16% 50%" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="1" 
                        className="text-border route-path-left"
                        strokeDasharray="1000"
                        strokeDashoffset="1000"
                        vectorEffect="non-scaling-stroke"
                    />
                    {/* Path Center to Right */}
                    <path 
                        d="M 50% 50% L 84% 50%" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="1" 
                        className="text-border route-path-right"
                        strokeDasharray="1000"
                        strokeDashoffset="1000"
                        vectorEffect="non-scaling-stroke"
                    />
                    
                    {/* Circle markers at intersection */}
                    <circle cx="50%" cy="50%" r="4" fill="currentColor" className="text-background stroke-foreground" />
                </svg>
            </div>
            
        </div>
      </div>
    </section>
  );
}
