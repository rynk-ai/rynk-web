"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PiBookOpen, PiFiles, PiBrain } from "react-icons/pi";

gsap.registerPlugin(ScrollTrigger);

export function LandingFeatures() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from(".feature-card", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: "power3.out"
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} id="features" className="py-24 bg-secondary/30">
      <div className="container px-4 mx-auto">
        <div className="mb-16 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything in one place.</h2>
            <p className="text-muted-foreground text-lg">
                Your research doesn't disappear when you close the tab. 
                Build a library that grows smarter with every query.
            </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="feature-card col-span-1 md:col-span-2 bg-background rounded-2xl p-8 border border-border shadow-sm flex flex-col md:flex-row gap-8 items-start">
               <div className="flex-1 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <PiBookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold">Deep Context</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Refer back to papers you found 3 months ago. Rynk allows you to bring citations and context from past projects into new ones.
                  </p>
               </div>
               {/* Visual placeholder */}
               <div className="w-full md:w-1/3 h-32 md:h-auto bg-secondary rounded-xl border border-border/50" />
            </div>

            {/* Feature 2 */}
            <div className="feature-card bg-background rounded-2xl p-8 border border-border shadow-sm space-y-4">
                 <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <PiFiles className="w-6 h-6 text-amber-600" />
                 </div>
                 <h3 className="text-xl font-bold">PDF Analysis</h3>
                 <p className="text-muted-foreground">
                    Upload a 100-page PDF. Ask for the 3 most important stats. Get them in seconds, with page references.
                 </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card bg-background rounded-2xl p-8 border border-border shadow-sm space-y-4">
                 <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <PiBrain className="w-6 h-6 text-purple-600" />
                 </div>
                 <h3 className="text-xl font-bold">Smart Synthesis</h3>
                 <p className="text-muted-foreground">
                    We don't just find links. We read them and write a coherent, synthesized answer for you.
                 </p>
            </div>

             {/* Feature 4 */}
            <div className="feature-card col-span-1 md:col-span-2 bg-background rounded-2xl p-8 border border-border shadow-sm flex flex-col md:flex-row-reverse gap-8 items-start">
               <div className="flex-1 space-y-4">
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                        Coming soon
                   </div>
                  <h3 className="text-xl font-bold">Collaborative Workspaces</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Share your research projects with your team. Comment on citations, fork search paths, and build a collective brain.
                  </p>
               </div>
                {/* Visual placeholder */}
               <div className="w-full md:w-1/3 h-32 md:h-auto bg-secondary rounded-xl border border-border/50" />
            </div>

        </div>

      </div>
    </section>
  );
}
