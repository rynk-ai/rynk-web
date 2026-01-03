"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { PiMagnifyingGlass, PiClock, PiTrendUp, PiGraduationCap, PiList } from "react-icons/pi";

gsap.registerPlugin(ScrollTrigger);

export function LandingSurfacesGrid() {
  const containerRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 70%",
        end: "bottom bottom",
        toggleActions: "play none none reverse"
      }
    });

    tl.from(".surface-card", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out"
    });

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-24 bg-secondary/50 border-t border-b border-border">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-12 md:gap-x-12 mb-20 text-center md:text-left">
           <div className="md:col-span-8">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[0.9] mb-6 text-foreground">
                    PICK YOUR FORMAT. <br/>
                    WE'LL BUILD THE INTERFACE.
                </h2>
           </div>
           <div className="md:col-span-4 flex items-end">
                <p className="text-lg text-muted-foreground leading-relaxed text-balance">
                    Quizzes, timelines, comparisons, research reports—just pick what you need and it's generated instantly.
                </p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-t border-l border-border bg-border">
          
          {/* Card 1: Research (Big Left) */}
          <div className="surface-card md:col-span-8 bg-background p-8 md:p-12 border-r border-b border-border min-h-[400px] flex flex-col group hover:bg-secondary/20 transition-colors">
             <div className="flex justify-between items-start mb-12">
                 <div className="flex flex-col gap-2">
                     <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">01</span>
                     <h3 className="text-2xl font-bold tracking-tight">Deep Research</h3>
                 </div>
                 <PiMagnifyingGlass className="h-8 w-8 opacity-20 group-hover:opacity-100 transition-opacity" />
             </div>
             
             <div className="relative flex-1 bg-secondary/30 border border-border p-6 flex flex-col gap-4">
                 {/* Schematic Layout */}
                 <div className="h-2 w-1/3 bg-foreground mb-4" />
                 <div className="h-px w-full bg-border md:w-full" />
                 <div className="grid grid-cols-3 gap-4">
                     <div className="h-24 border border-border bg-background p-3">
                         <div className="w-8 h-8 rounded-full bg-foreground/10 mb-2"></div>
                         <div className="h-2 w-1/2 bg-foreground/10"></div>
                     </div>
                     <div className="h-24 border border-border bg-background p-3">
                         <div className="w-8 h-8 rounded-full bg-foreground/10 mb-2"></div>
                         <div className="h-2 w-1/2 bg-foreground/10"></div>
                     </div>
                     <div className="h-24 border border-border bg-background p-3">
                         <div className="w-8 h-8 rounded-full bg-foreground/10 mb-2"></div>
                         <div className="h-2 w-1/2 bg-foreground/10"></div>
                     </div>
                 </div>
                 <div className="space-y-2 mt-4">
                     <div className="h-2 w-full bg-foreground/5"></div>
                     <div className="h-2 w-[90%] bg-foreground/5"></div>
                     <div className="h-2 w-[95%] bg-foreground/5"></div>
                 </div>
             </div>
          </div>

          {/* Card 2: Wiki (Right) */}
          <div className="surface-card md:col-span-4 bg-background p-8 md:p-12 border-r border-b border-border min-h-[400px] flex flex-col group hover:bg-secondary/20 transition-colors">
              <div className="flex justify-between items-start mb-12">
                 <div className="flex flex-col gap-2">
                     <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">02</span>
                     <h3 className="text-2xl font-bold tracking-tight">Instant Wiki</h3>
                 </div>
                 <PiList className="h-8 w-8 opacity-20 group-hover:opacity-100 transition-opacity" />
             </div>
             
             <div className="relative flex-1 bg-secondary/30 border border-border p-6">
                 {/* Wiki Schematic */}
                 <div className="flex gap-4 h-full">
                     <div className="w-8 border-r border-border h-full flex flex-col gap-2 pt-2">
                         <div className="h-1 w-4 bg-foreground/20"></div>
                         <div className="h-1 w-6 bg-foreground/20"></div>
                         <div className="h-1 w-3 bg-foreground/20"></div>
                     </div>
                     <div className="flex-1 space-y-3">
                         <div className="h-16 w-full bg-foreground/5"></div>
                         <div className="h-2 w-3/4 bg-foreground/20"></div>
                         <div className="h-2 w-full bg-foreground/5"></div>
                         <div className="h-2 w-full bg-foreground/5"></div>
                     </div>
                 </div>
             </div>
          </div>

          {/* Row 2 */}

          {/* Card 3: Timeline */}
          <div className="surface-card md:col-span-4 bg-background p-8 md:p-12 border-r border-b border-border min-h-[360px] flex flex-col group hover:bg-secondary/20 transition-colors">
             <div className="mb-8">
                 <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground block mb-2">03</span>
                 <h3 className="text-xl font-bold tracking-tight">Timeline</h3>
             </div>
             <div className="flex-1 flex items-center justify-center">
                 <div className="relative w-full h-[2px] bg-border flex items-center justify-between px-4">
                     <div className="w-3 h-3 bg-foreground rounded-full relative"><div className="absolute top-6 left-1/2 -translate-x-1/2 w-px h-8 bg-border"></div></div>
                     <div className="w-3 h-3 bg-foreground rounded-full"></div>
                     <div className="w-3 h-3 bg-foreground rounded-full"></div>
                     <div className="w-3 h-3 bg-foreground rounded-full"></div>
                 </div>
             </div>
          </div>

          {/* Card 4: Study */}
          <div className="surface-card md:col-span-4 bg-background p-8 md:p-12 border-r border-b border-border min-h-[360px] flex flex-col group hover:bg-secondary/20 transition-colors">
             <div className="mb-8">
                 <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground block mb-2">04</span>
                 <h3 className="text-xl font-bold tracking-tight">Study Mode</h3>
             </div>
             <div className="flex-1 flex items-center justify-center">
                  <div className="w-32 h-40 border-2 border-foreground bg-background relative flex items-center justify-center">
                      <div className="text-4xl font-serif">A+</div>
                      <div className="absolute -right-2 -bottom-2 w-full h-full border border-border -z-10"></div>
                  </div>
             </div>
          </div>

          {/* Card 5: Market */}
          <div className="surface-card md:col-span-4 bg-background p-8 md:p-12 border-r border-b border-border min-h-[360px] flex flex-col group hover:bg-secondary/20 transition-colors">
             <div className="mb-8">
                 <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground block mb-2">05</span>
                 <h3 className="text-xl font-bold tracking-tight">Market</h3>
             </div>
             <div className="flex-1 flex items-end justify-center gap-1 pb-4">
                 {[40, 65, 45, 80, 55, 90, 100].map((h, i) => (
                     <div key={i} className="w-4 bg-foreground hover:bg-accent transition-colors duration-300" style={{ height: `${h}%` }}></div>
                 ))}
             </div>
          </div>

        </div>
      </div>
    </section>
  );
}
