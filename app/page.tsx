import { Suspense } from "react";
import { LandingPage } from "@/components/landing-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "rynk. - AI for Deep Research & Projects",
  description: "An AI interface designed for deep work. Conduct deep research, manage complex projects, and work without distractions. Free to start.",
  alternates: {
    canonical: "https://rynk.io",
  }
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  );
}
