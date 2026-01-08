"use client";

import { useSession } from "next-auth/react";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingTicker } from "@/components/landing/landing-ticker";
import { LandingBento } from "@/components/landing/landing-bento";
import { LandingSurfacesGrid } from "@/components/landing/landing-surfaces-grid";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  const { status } = useSession();

  if (status === "loading") {
    // Optional: Add a minimal loader here if needed, or just return null
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background selection:bg-foreground selection:text-background text-foreground">
      <LandingNavbar />
      <main className="flex-1 flex flex-col">
        <LandingHero />
        <LandingTicker />
        <LandingBento />
        <LandingSurfacesGrid />
        <LandingPricing />
      </main>
      <LandingFooter />
    </div>
  );
}
