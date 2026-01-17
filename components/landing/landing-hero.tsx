"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { motion } from "motion/react";
import { PiArrowRight } from "react-icons/pi";

gsap.registerPlugin();

const HEADLINE = "Research that shows its work.";

export function LandingHero() {
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.from(".hero-char", {
      y: 60,
      opacity: 0,
      stagger: 0.02,
      duration: 0.6,
      ease: "power4.out",
    })
      .from(
        ".hero-subheadline",
        {
          y: 30,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.3"
      )
      .from(
        ".hero-cta",
        {
          scale: 0.9,
          opacity: 0,
          duration: 0.5,
          ease: "back.out(1.7)",
        },
        "-=0.2"
      )
      .from(
        ".hero-secondary",
        {
          opacity: 0,
          y: 10,
          duration: 0.4,
          ease: "power2.out",
        },
        "-=0.2"
      )
      .from(
        ".hero-stats",
        {
          opacity: 0,
          y: 20,
          duration: 0.5,
          ease: "power2.out",
        },
        "-=0.1"
      );
  }, { scope: heroRef });

  return (
    <section 
      ref={heroRef} 
      className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-24 overflow-hidden"
    >
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-40" />
      
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline - Pre-split for animation */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8 uppercase">
            {HEADLINE.split("").map((char, i) => (
              <span 
                key={i} 
                className="hero-char inline-block"
                style={{ display: char === " " ? "inline" : "inline-block" }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </h1>

          {/* Subheadline - Direct, specific */}
          <p className="hero-subheadline text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            Ask a question. We search academic databases, the web, and your documents.{" "}
            <span className="text-foreground font-normal">Every answer has a citation.</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/chat">
              <motion.button
                className="hero-cta group inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background font-bold uppercase tracking-wide text-sm hover:bg-foreground/90 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                Try it free
                <PiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </Link>
            
            <a 
              href="#how-it-works" 
              className="hero-secondary text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              See how it works
            </a>
          </div>

          {/* Honest stats - no fluff */}
          <div className="hero-stats mt-16 pt-8 border-t border-border/50">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-mono">
              What you get for free
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <span>100 queries/month</span>
              <span className="hidden sm:inline text-border">|</span>
              <span>All features</span>
              <span className="hidden sm:inline text-border">|</span>
              <span>No credit card</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

