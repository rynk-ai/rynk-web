"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

const ITEMS = [
  "Clarity",
  "Depth", 
  "Speed",
  "Focus",
  "Research",
  "Precision",
  "Insight",
  "Quality",
];

export function LandingTicker() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.to(".ticker-track", {
      x: "-50%",
      duration: 40,
      ease: "none",
      repeat: -1,
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="py-4 border-y border-border overflow-hidden bg-foreground text-background">
      <div className="relative flex whitespace-nowrap ticker-track w-fit">
        {[...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS].map((item, i) => (
          <div key={i} className="flex items-center mx-8">
            <span className="text-sm font-mono uppercase tracking-widest font-medium">
              {item}
            </span>
            <span className="ml-8 w-1 h-1 bg-background rounded-full opacity-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
