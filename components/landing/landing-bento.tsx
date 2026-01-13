"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

export function LandingBento() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from(".feature-line", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 85%",
      },
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power3.out"
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-20 md:py-28 bg-background border-t border-border">
      <div className="container px-4 md:px-6 mx-auto">
        
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 text-center md:text-left">
          <div className="feature-line">
            <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-3">Research</h3>
            <p className="text-lg text-foreground">Pulls from multiple sources. Synthesizes.</p>
          </div>
          <div className="feature-line">
            <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-3">Projects</h3>
            <p className="text-lg text-foreground">Remembers context between sessions.</p>
          </div>
          <div className="feature-line">
            <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-3">Design</h3>
            <p className="text-lg text-foreground">Minimal. Fast. No distractions.</p>
          </div>
        </div>

      </div>
    </section>
  );
}
