"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const ITEMS = [
  "Deep Reasoning",
  "Financial Analysis",
  "Agentic Research",
  "Structured Learning",
  "Code Generation",
  "Document Interaction",
  "Memory Systems",
  "Secure Environment",
];

export function LandingTicker() {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useGSAP(() => {
    if (!textRef.current) return;
    
    gsap.to(".ticker-track", {
      x: "-50%",
      duration: 50,
      ease: "none",
      repeat: -1,
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="py-4 border-b border-border overflow-hidden bg-foreground text-background">
      <div className="relative flex whitespace-nowrap ticker-track w-fit hover:[animation-play-state:paused]">
        {/* Double the items for seamless loop */}
        {[...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS].map((item, i) => (
          <div key={i} className="flex items-center mx-8">
            <span className="text-sm font-mono uppercase tracking-widest font-bold">
              {item}
            </span>
            <span className="ml-8 w-1 h-1 bg-background rounded-full opacity-50" />
          </div>
        ))}
         <div ref={textRef} /> 
      </div>
    </div>
  );
}
