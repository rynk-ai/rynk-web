"use client";

import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingTools } from "@/components/landing/landing-tools";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  return (
    <div className="flex-1 w-full min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground flex flex-col items-center">
      <div className="w-full max-w-3xl mx-auto border-x border-dashed border-border/50 min-h-screen bg-background shadow-2xl shadow-black/5">
        <LandingNavbar />
        <main>
          <LandingHero />
          <LandingHowItWorks />
          <LandingFeatures />
          <LandingPricing />
          <LandingTools />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}

