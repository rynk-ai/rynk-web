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
    <div className="flex-1 w-full min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingTools />
        <LandingPricing />
      </main>
      <LandingFooter />
    </div>
  );
}

