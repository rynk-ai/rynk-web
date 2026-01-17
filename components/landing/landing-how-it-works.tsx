"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PiMagnifyingGlass, PiExcludeSquare, PiDatabase, PiFileText } from "react-icons/pi";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    title: "You ask",
    description: "Type a complex question or upload a document.",
    icon: PiMagnifyingGlass,
  },
  {
    title: "We analyze",
    description: "The agent plans 4-6 parallel research paths.",
    icon: PiExcludeSquare,
  },
  {
    title: "We find",
    description: "Scanning millions of verified academic sources.",
    icon: PiDatabase,
  },
  {
    title: "You read",
    description: "A final report grounded in verified sources.",
    icon: PiFileText,
  },
];

export function LandingHowItWorks() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from(".step-card", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
      },
      y: 30,
      opacity: 0,
      stagger: 0.15,
      duration: 0.8,
      ease: "power3.out",
    });
  }, { scope: containerRef });

  return (
    <section
      ref={containerRef}
      id="how-it-works"
      className="py-32 bg-background border-b border-border"
    >
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center text-center mb-24">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-balance">
                How we dig deeper.
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl text-pretty">
                Most AI chats guess. Rynk reads the actual papers.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
           {/* Connecting Line (Desktop) */}
           <div className="hidden lg:block absolute top-[2.5rem] left-0 right-0 h-px bg-border -z-10" />

           {STEPS.map((step, i) => (
             <div key={i} className="step-card flex flex-col items-center text-center gap-6 bg-background p-4">
                <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center border border-border shadow-sm">
                    <step.icon className="w-8 h-8 text-foreground" />
                </div>
                <div>
                     <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                        Step 0{i+1}
                     </span>
                     <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>
                     <p className="text-sm text-muted-foreground leading-relaxed text-balance">
                        {step.description}
                     </p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </section>
  );
}
