"use client";

import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingComparison } from "@/components/landing/landing-comparison";
import { LandingSurfacesGrid } from "@/components/landing/landing-surfaces-grid";
import { LandingModelRouting } from "@/components/landing/landing-model-routing";
import { LandingBottomCTA } from "@/components/landing/landing-bottom-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingBento } from "@/components/landing/landing-bento";

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <LandingComparison />
        <LandingSurfacesGrid />
        <LandingBento />
        <LandingModelRouting />
        <LandingBottomCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
