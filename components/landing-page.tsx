"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if user explicitly wants to view landing page
  const isExplicit = searchParams.get("explicit") === "true";

  useEffect(() => {
    // Only redirect if authenticated and NOT explicitly viewing landing page
    if (status === "authenticated" && session && !isExplicit) {
      router.replace("/chat");
    }
  }, [status, session, router, isExplicit]);

  // Show nothing while loading or redirecting (only when not explicit)
  if (status === "loading" || (status === "authenticated" && session && !isExplicit)) {
    return null;
  }
  return (
    <div className="flex flex-col min-h-screen">
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
