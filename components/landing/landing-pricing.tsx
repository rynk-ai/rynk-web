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
  "Deep research capabilities",
  "Unlimited project workspaces",
  "Access to premium models",
  "Priority processing speed",
  "Export to PDF/Markdown",
];

export function LandingPricing() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from(".pricing-card", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
      },
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out"
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} id="pricing" className="py-16 bg-background">
      <div className="container px-4 md:px-6 mx-auto">
        
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight mb-3">Simple Pricing</h2>
          <p className="text-muted-foreground text-lg">
            Start for free. Upgrade when you need more power.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Free Plan */}
          <div className="pricing-card p-8 rounded-3xl border border-border bg-background flex flex-col shadow-sm hover:shadow-md transition-shadow">
             <div className="mb-6">
                <h3 className="font-bold text-xl mb-2">Free</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground">/ forever</span>
                </div>
                <p className="mt-4 text-muted-foreground text-sm">
                    Perfect for students and occasional research.
                </p>
             </div>
             <div className="flex-1 mb-8">
                <div className="font-medium text-sm mb-4">Includes:</div>
                <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm text-foreground">
                        <PiCheck className="text-green-600" /> 20 queries / mo
                    </li>
                     <li className="flex items-center gap-2 text-sm text-foreground">
                        <PiCheck className="text-green-600" /> Basic research depth
                    </li>
                </ul>
             </div>
             <Link href="/chat">
                <Button variant="outline" className="w-full rounded-xl h-12 font-semibold">
                    Get Started Free
                </Button>
             </Link>
          </div>

          {/* Pro Plan */}
          <div className="pricing-card relative p-8 rounded-3xl border border-foreground/10 bg-foreground text-background flex flex-col shadow-xl">
             <div className="absolute top-0 right-0 p-4">
                <span className="bg-background/20 text-background px-3 py-1 rounded-full text-xs font-bold">
                    MOST POPULAR
                </span>
             </div>
             <div className="mb-6">
                <h3 className="font-bold text-xl mb-2">Pro</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">$5.99</span>
                    <span className="text-background/80">/ month</span>
                </div>
                <p className="mt-4 text-background/80 text-sm">
                    For professionals who need serious depth.
                </p>
             </div>
             <div className="flex-1 mb-8">
                <div className="font-medium text-sm mb-4">Everything in Free, plus:</div>
                <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm">
                        <PiCheck className="text-emerald-400" /> 2,500 queries / mo
                    </li>
                    {FEATURES.map(f => (
                         <li key={f} className="flex items-center gap-2 text-sm">
                            <PiCheck className="text-emerald-400" /> {f}
                        </li>
                    ))}
                </ul>
             </div>
             <Link href="/login?callbackUrl=https://rynk.io/subscription">
                <Button className="w-full rounded-xl h-12 font-bold bg-background text-foreground hover:bg-background/90">
                    Upgrade to Pro
                </Button>
             </Link>
          </div>

        </div>

      </div>
    </section>
  );
}
