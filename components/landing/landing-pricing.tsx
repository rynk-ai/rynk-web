"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { PiCheck, PiArrowRight, PiX } from "react-icons/pi";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const PLANS = [
  {
    name: "Standard",
    price: "$0",
    period: "forever",
    description: "For casual exploration.",
    features: [
      { name: "100 messages/mo", included: true },
      { name: "All surface formats", included: true },
      { name: "Standard speed", included: true },
      { name: "Deep research", included: false },
      { name: "Context branching", included: false },
    ],
    cta: "Start Free",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$5.99",
    period: "per month",
    description: "For power users & researchers.",
    features: [
      { name: "Unlimited messages", included: true },
      { name: "All surface formats", included: true },
      { name: "Fastest speed", included: true },
      { name: "Deep research mode", included: true },
      { name: "Context branching", included: true },
    ],
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
    <section ref={containerRef} id="pricing" className="bg-background border-b border-border">
      <div className="container px-4 md:px-6 mx-auto">
        
        <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* Header / Left Side */}
            <div className="py-24 md:pr-12 md:border-r border-border">
                <h2 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.85] text-foreground mb-8 uppercase font-display">
                    Simple <br/><span className="text-muted-foreground">Pricing.</span>
                </h2>
                <div className="w-24 h-px bg-foreground mb-8"></div>
                <p className="text-xl text-muted-foreground font-light max-w-sm">
                    Invest in your intelligence. Cancel anytime.
                </p>
            </div>

            {/* Plans / Right Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-t md:border-t-0 border-border">
                {PLANS.map((plan, index) => (
                    <div 
                        key={plan.name}
                        className={`pricing-item p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 border-border ${index === 0 ? 'md:border-r' : ''}`}
                    >
                        <div>
                            <div className="mb-8">
                                <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-bold tracking-tighter">{plan.price}</span>
                                    {plan.period !== "forever" && <span className="text-sm text-muted-foreground">/mo</span>}
                                </div>
                                <p className="mt-4 text-sm text-muted-foreground">{plan.description}</p>
                            </div>

                            <ul className="space-y-4 mb-12">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm">
                                        {feature.included ? (
                                            <PiCheck className="h-4 w-4 text-foreground flex-shrink-0" />
                                        ) : (
                                            <PiX className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                                        )}
                                        <span className={feature.included ? "text-foreground" : "text-muted-foreground/50 line-through"}>
                                            {feature.name}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Link href={plan.href} className="w-full">
                            <Button 
                                size="lg"
                                variant={plan.highlighted ? "default" : "outline"}
                                className={`w-full rounded-none h-14 uppercase tracking-widest text-xs font-bold ${
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

        </div>
      </div>
    </section>
  );
}
