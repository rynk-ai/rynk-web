"use client";

import { useSession } from "next-auth/react";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingBottomCTA } from "@/components/landing/landing-bottom-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  const { status } = useSession();

  if (status === "loading") {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingPricing />
        <LandingBottomCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
