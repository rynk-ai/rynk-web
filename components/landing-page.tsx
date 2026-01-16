"use client";

import { useSession } from "next-auth/react";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingBento } from "@/components/landing/landing-bento";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  const { status } = useSession();

  if (status === "loading") {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background selection:bg-foreground selection:text-background text-foreground">
      <LandingNavbar />
      <main className="flex-1 flex flex-col">
        <LandingHero />
        <LandingBento />
        <LandingPricing />
      </main>
      <LandingFooter />
    </div>
  );
}

