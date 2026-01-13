"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { PiCheck } from "react-icons/pi";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  "Deep research",
  "Projects & context",
  "All models",
  "Priority support",
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    queries: "100 queries/mo",
    cta: "Get Started",
    href: "/chat",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$5.99",
    period: "per month",
    queries: "2,500 queries/mo",
    cta: "Go Pro",
    href: "/login?callbackUrl=https://rynk.io/subscription",
    highlighted: true,
  },
];

export function LandingPricing() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from(".pricing-item", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out"
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} id="pricing" className="py-24 md:py-32 bg-background border-t border-border">
      <div className="container px-4 md:px-6 mx-auto">
        
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold tracking-normal leading-[0.9] text-foreground mb-4 font-display">
              Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Same features. Different limits.
            </p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {PLANS.map((plan) => (
              <div 
                key={plan.name}
                className={`pricing-item p-8 md:p-10 flex flex-col bg-background ${plan.highlighted ? 'bg-secondary/30' : ''}`}
              >
                <div className="mb-8">
                  <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold tracking-normal">{plan.price}</span>
                    {plan.period !== "forever" && <span className="text-sm text-muted-foreground">/mo</span>}
                  </div>
                  <p className="mt-3 text-lg text-foreground font-medium">{plan.queries}</p>
                </div>

                <ul className="space-y-3 mb-10 flex-1">
                  {FEATURES.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <PiCheck className="h-4 w-4 text-foreground flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href} className="w-full">
                  <Button 
                    size="lg"
                    variant={plan.highlighted ? "default" : "outline"}
                    className={`w-full rounded-none h-12 uppercase tracking-wide text-xs font-bold ${
                      plan.highlighted 
                        ? "bg-foreground text-background hover:bg-foreground/90" 
                        : "bg-transparent border-foreground text-foreground hover:bg-secondary"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Promo */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Use code <span className="font-mono font-bold text-foreground">M5WD0UWR</span> for 1st month free.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
