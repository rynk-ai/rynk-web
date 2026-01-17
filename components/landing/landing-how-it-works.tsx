"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PiMagnifyingGlass, PiTreeStructure, PiDatabase, PiFileText } from "react-icons/pi";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    number: "01",
    title: "You ask",
    description: "Type a question. Upload a PDF if you want.",
    icon: PiMagnifyingGlass,
  },
  {
    number: "02",
    title: "We analyze",
    description: "Break your question into 4-6 research angles.",
    icon: PiTreeStructure,
  },
  {
    number: "03",
    title: "Parallel search",
    description: "Semantic Scholar, Crossref, Exa, Perplexity—all at once.",
    icon: PiDatabase,
  },
  {
    number: "04",
    title: "Full document",
    description: "Sections, citations, methodology. Not just a paragraph.",
    icon: PiFileText,
  },
];

export function LandingHowItWorks() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    // Animate steps
    gsap.from(".pipeline-step", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 75%",
      },
      y: 50,
      opacity: 0,
      stagger: 0.12,
      duration: 0.7,
      ease: "power3.out",
    });

    // Animate connecting lines
    gsap.from(".pipeline-line", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 70%",
      },
      scaleX: 0,
      transformOrigin: "left",
      stagger: 0.15,
      duration: 0.5,
      ease: "power2.out",
      delay: 0.3,
    });

    // Animate header
    gsap.from(".how-header", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
      },
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: "power3.out",
    });
  }, { scope: containerRef });

  return (
    <section
      ref={containerRef}
      id="how-it-works"
      className="py-24 md:py-32 bg-background border-t border-border"
    >
      <div className="container px-4 md:px-6 mx-auto">
        {/* Header */}
        <div className="how-header max-w-3xl mb-20">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground block mb-4">
            How it works
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] uppercase">
            Four steps.{" "}
            <span className="text-muted-foreground">No magic, just parallel search.</span>
          </h2>
        </div>

        {/* Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-border">
          {STEPS.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connecting line */}
              {index < STEPS.length - 1 && (
                <div className="pipeline-line hidden md:block absolute top-1/2 right-0 w-full h-px bg-border z-0" />
              )}

              <div className="pipeline-step relative z-10 p-8 md:p-10 bg-background border-r border-border last:border-r-0 h-full flex flex-col group hover:bg-secondary/30 transition-colors">
                {/* Number */}
                <span className="text-xs font-mono text-muted-foreground mb-6">
                  {step.number}
                </span>

                {/* Icon */}
                <div className="w-12 h-12 border border-foreground/20 flex items-center justify-center mb-6 group-hover:border-foreground group-hover:bg-foreground group-hover:text-background transition-all">
                  <step.icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold uppercase tracking-tight mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Average research time: <span className="text-foreground font-medium">45 seconds</span>
          </p>
        </div>
      </div>
    </section>
  );
}
