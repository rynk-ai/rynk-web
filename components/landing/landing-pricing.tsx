"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { PiCheck, PiArrowRight } from "react-icons/pi";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "100 messages per month",
      "All surface formats",
      "Standard speed",
    ],
    cta: "Get Started",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$5.99",
    period: "per month",
    features: [
      "2,500 messages per month",
      "Priority speed",
      "Deep research mode",
    ],
    cta: "Start Free Trial",
    href: "/login?callbackUrl=https://rynk.io/subscription",
    highlighted: true,
  },
];

export function LandingPricing() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from(".pricing-card", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 75%",
      },
      y: 40,
      opacity: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: "power3.out"
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} id="pricing" className="py-32 bg-secondary/30 border-b border-border">
      <div className="container px-4 mx-auto">
        
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight text-foreground mb-4">
            Simple pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade when you need more.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PLANS.map((plan) => (
            <div 
                key={plan.name}
                className={`pricing-card p-8 flex flex-col relative transition-colors duration-300 ${
                    plan.highlighted 
                        ? "bg-foreground text-background" 
                        : "bg-background border border-border"
                }`}
            >
              <div className="mb-6">
                  <h3 className="text-xl font-bold tracking-tight mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tighter">{plan.price}</span>
                      <span className={`text-sm ${plan.highlighted ? "text-background/60" : "text-muted-foreground"}`}>
                        /{plan.period}
                      </span>
                  </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                          <PiCheck className={`h-4 w-4 flex-shrink-0 ${plan.highlighted ? "text-background/80" : "text-foreground"}`} />
                          <span className={plan.highlighted ? "text-background/80" : "text-foreground/70"}>{feature}</span>
                      </li>
                  ))}
              </ul>

              <Link href={plan.href}>
                  <Button 
                      size="lg"
                      className={`w-full rounded-none h-12 font-medium ${
                          plan.highlighted 
                            ? "bg-background text-foreground hover:bg-background/90" 
                            : "bg-foreground text-background hover:bg-foreground/90"
                      }`}
                  >
                      {plan.cta}
                      <PiArrowRight className="ml-2 h-4 w-4" />
                  </Button>
              </Link>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
