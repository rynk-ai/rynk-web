"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { PiCheck, PiX, PiMinus } from "react-icons/pi";

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
    .from(".comparison-table", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
    }, "-=0.4");

  }, { scope: containerRef });

  return (
    <section ref={containerRef} id="comparison" className="py-32 bg-background relative overflow-hidden">
      
      <div className="container px-4 mx-auto max-w-5xl">
        <div className="comp-header mb-20 text-center">
           <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              The Rynk Advantage
           </h2>
           <p className="text-xl text-muted-foreground">
             Automated, accurate, and affordable.
           </p>
        </div>

        <div className="comparison-table overflow-hidden rounded-xl border border-border bg-secondary/10">
            <div className="grid grid-cols-4 p-6 border-b border-border bg-secondary/30 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-1">Feature</div>
                <div className="col-span-1 text-center text-foreground font-bold">Rynk</div>
                <div className="col-span-1 text-center">ChatGPT</div>
                <div className="col-span-1 text-center">Human Assistant</div>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-4 p-6 border-b border-border text-sm items-center hover:bg-secondary/5 transition-colors">
                <div className="col-span-1 font-medium">Cites Real Sources?</div>
                <div className="col-span-1 text-center flex justify-center"><PiCheck className="text-emerald-500 w-5 h-5" /></div>
                <div className="col-span-1 text-center flex justify-center"><PiMinus className="text-amber-500 w-5 h-5" /> <span className="ml-2 text-xs text-muted-foreground hidden md:inline">(Sometimes)</span></div>
                <div className="col-span-1 text-center flex justify-center"><PiCheck className="text-emerald-500 w-5 h-5" /></div>
            </div>

             {/* Row 2 */}
            <div className="grid grid-cols-4 p-6 border-b border-border text-sm items-center hover:bg-secondary/5 transition-colors">
                <div className="col-span-1 font-medium">Fact-Checking</div>
                <div className="col-span-1 text-center text-emerald-600 font-bold">Automated</div>
                <div className="col-span-1 text-center text-red-500 font-medium">Hallucinates</div>
                <div className="col-span-1 text-center text-muted-foreground">Manual</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 p-6 border-b border-border text-sm items-center hover:bg-secondary/5 transition-colors">
                <div className="col-span-1 font-medium">Time to Report</div>
                <div className="col-span-1 text-center text-emerald-600 font-bold">5 Minutes</div>
                <div className="col-span-1 text-center text-muted-foreground">30 Minutes</div>
                <div className="col-span-1 text-center text-muted-foreground">5 Days</div>
            </div>

             {/* Row 4 */}
            <div className="grid grid-cols-4 p-6 text-sm items-center hover:bg-secondary/5 transition-colors">
                <div className="col-span-1 font-medium">Cost</div>
                <div className="col-span-1 text-center text-emerald-600 font-bold">$20 / mo</div>
                <div className="col-span-1 text-center text-muted-foreground">$20 / mo</div>
                <div className="col-span-1 text-center text-red-500 font-medium">$5,000 / mo</div>
            </div>
        </div>
      </div>
    </section>
  );
}
