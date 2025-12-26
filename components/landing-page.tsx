"use client";

import { useSession } from "next-auth/react";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingComparison } from "@/components/landing/landing-comparison";
import { LandingSurfacesGrid } from "@/components/landing/landing-surfaces-grid";
import { LandingModelRouting } from "@/components/landing/landing-model-routing";
import { LandingBottomCTA } from "@/components/landing/landing-bottom-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingBento } from "@/components/landing/landing-bento";
import { LandingPricing } from "@/components/landing/landing-pricing";

export function LandingPage() {
  const { data: session, status } = useSession();



  // Show nothing while loading
  if (status === "loading") {
    return null;
  }
  return (
    <div className="flex flex-col min-h-screen w-full">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <LandingComparison />
        <LandingSurfacesGrid />
        <LandingBento />
        <LandingModelRouting />
        <LandingPricing />
        <LandingBottomCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
