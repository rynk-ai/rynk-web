"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { 
  PiCheck, 
  PiSparkle,
  PiInfinity,
  PiLightning,
  PiRocketLaunch
} from "react-icons/pi";
import Link from "next/link";

const PLANS = [
  {
    name: "Free",
    description: "For curious explorers",
    price: "$0",
    period: "forever",
    features: [
      "100 messages per month",
      "All 10+ surfaces",
      "Basic file upload (5MB)",
      "Standard response speed",
      "Community support",
    ],
    cta: "Get Started",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For power users & learners",
    price: "$5.99",
    period: "per month",
    features: [
      "2500 messages",
      "All 10+ surfaces",
      "Large file upload (50MB)",
      "Priority response speed",
      "Deep research mode",
      "Course creation & progress",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/login?callbackUrl=https://rynk.io/subscription",
    highlighted: true,
    badge: "Most Popular",
  },
];

export function LandingPricing() {
  return (
    <section className="py-24 bg-background" id="pricing">
      <div className="container px-4 mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <PiSparkle className="h-4 w-4" />
              Simple Pricing
            </span>
            <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tighter mb-4 text-foreground">
              Start free. <span className="text-muted-foreground">Scale when ready.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              No credit card required. Cancel anytime.
            </p>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className={`relative p-8 rounded-2xl border transition-all duration-300 flex flex-col ${
                plan.highlighted
                  ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5"
                  : "bg-secondary/30 border-border/50"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    <PiRocketLaunch className="h-3 w-3" />
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold font-display tracking-tight mb-2">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold font-display tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">/{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <PiCheck className={`h-5 w-5 shrink-0 mt-0.5 ${
                      plan.highlighted ? "text-primary" : "text-green-500"
                    }`} />
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={plan.href} className="block">
                <Button 
                  size="lg" 
                  className={`w-full rounded-xl h-12 text-base font-semibold transition-all ${
                    plan.highlighted
                      ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                  variant={plan.highlighted ? "default" : "secondary"}
                >
                  {plan.highlighted && <PiLightning className="h-4 w-4 mr-2" />}
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-muted-foreground">
            Need more? <Link href="mailto:farseenmanekhan1232@gmail.com" className="text-primary hover:underline">Contact us</Link> for team & enterprise plans.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
