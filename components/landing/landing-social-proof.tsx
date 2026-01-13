"use client";

import { motion } from "motion/react";

const LOGOS = [
  "Acme Corp",
  "Globex",
  "Soylent Corp",
  "Initech",
  "Umbrella",
  "Massive Dynamic",
  "Cyberdyne",
  "Stark Ind"
];

export function LandingSocialProof() {
  return (
    <section className="py-12 border-b border-border/40 bg-background/50 backdrop-blur-sm">
      <div className="container px-4 mx-auto">
        <p className="text-center text-sm font-medium text-muted-foreground mb-8">
          Trusted by curious minds at fast-growing startups
        </p>
        
        <div className="relative flex overflow-hidden group">
          <div className="flex animate-marquee whitespace-nowrap gap-16 min-w-full justify-center">
            {[...LOGOS, ...LOGOS].map((logo, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-center grayscale opacity-40 hover:opacity-100 transition-opacity cursor-pointer mx-4"
              >
                <span className="text-xl font-bold font-mono tracking-normal">{logo}</span>
              </div>
            ))}
          </div>
          
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
        </div>
      </div>
    </section>
  );
}
