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
    features: [
      "100 messages / mo",
      "All 10+ surfaces",
      "Basic file upload (5MB)",
      "Standard speed",
      "Community support",
    ],
    cta: "Start Free",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$5.99",
    features: [
      "2500 messages / mo",
      "All 10+ surfaces",
      "Large file upload (50MB)",
      "Deep research mode",
      "Priority support",
    ],
    cta: "Start Trial",
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
        start: "top 70%",
      },
      y: 60,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out"
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} id="pricing" className="py-32 bg-background border-b border-border">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-24 max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] text-foreground mb-8">
            START FREE. <br/>
            <span className="text-muted-foreground">SCALE WHEN READY.</span>
          </h2>
          <div className="flex justify-center">
             <div className="h-px w-24 bg-foreground mb-8" />
          </div>
          <p className="text-lg md:text-xl text-foreground font-medium max-w-xl mx-auto leading-relaxed">
            No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-0 max-w-5xl mx-auto">
          {PLANS.map((plan, index) => (
            <div 
                key={plan.name}
                className={`pricing-card border border-border p-8 md:p-12 flex flex-col relative group transition-colors duration-300 ${
                    plan.highlighted 
                        ? "bg-foreground text-background border-foreground md:-ml-[1px] md:z-10" 
                        : "bg-background text-foreground hover:bg-secondary/30"
                }`}
            >
              <div className="flex justify-between items-start mb-8">
                  <div>
                      <h3 className="text-3xl font-bold tracking-tight mb-2">{plan.name}</h3>
                      {plan.highlighted && <span className="text-xs font-mono uppercase tracking-widest text-background/60">Most Popular</span>}
                  </div>
                  <div className="text-right">
                      <span className="text-4xl md:text-5xl font-bold tracking-tighter block">{plan.price}</span>
                      <span className={`text-xs font-mono uppercase tracking-wider block mt-1 ${
                          plan.highlighted ? "text-background/60" : "text-muted-foreground"
                      }`}>per month</span>
                  </div>
              </div>

              <div className="flex-1 mb-12">
                  <div className={`h-px w-full mb-8 ${plan.highlighted ? "bg-background/20" : "bg-border"}`} />
                  <ul className="space-y-4">
                      {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-3 text-sm font-medium">
                              <PiCheck className={`h-4 w-4 flex-shrink-0 ${plan.highlighted ? "text-background" : "text-foreground"}`} />
                              <span className={plan.highlighted ? "text-background/90" : "text-foreground/80"}>{feature}</span>
                          </li>
                      ))}
                  </ul>
              </div>

              <Link href={plan.href} className="mt-auto">
                  <Button 
                      size="lg"
                      variant={plan.highlighted ? "secondary" : "default"}
                      className={`w-full rounded-none h-14 text-base font-bold uppercase tracking-widest flex justify-between items-center px-6 ${
                          plan.highlighted 
                            ? "bg-background text-foreground hover:bg-background/90" 
                            : "bg-foreground text-background hover:bg-foreground/90"
                      }`}
                  >
                      <span>{plan.cta}</span>
                      <PiArrowRight className="h-5 w-5" />
                  </Button>
              </Link>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
             <Link href="mailto:support@rynk.io" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-4">
                Contact us for Enterprise
             </Link>
        </div>

      </div>
    </section>
  );
}
