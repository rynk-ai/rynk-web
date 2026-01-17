"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    id: "01",
    title: "Deep Research",
    description: "4-6 research angles. Parallel searches. Full document with abstract, sections, and citations.",
  },
  {
    id: "02",
    title: "Your Documents",
    description: "Upload PDFs. We chunk them into searchable pieces. Ask anything, get the exact passage.",
  },
  {
    id: "03",
    title: "Modular Context",
    description: "Every conversation is a building block. Reference past chats in new ones. Build a knowledge base that grows, instead of starting from zero.",
  },
];


export function LandingFeatures() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from(".feature-item", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out"
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} id="features" className="py-32 bg-background border-b border-border">
      <div className="container px-4 mx-auto">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
          {FEATURES.map((feature) => (
            <div key={feature.id} className="feature-item">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground block mb-4">
                {feature.id}
              </span>
              <h3 className="text-2xl md:text-3xl font-bold tracking-normal mb-4 uppercase">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
