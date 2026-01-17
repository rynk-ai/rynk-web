import type { Metadata } from "next";
import SubscriptionClient from "./client";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Pricing & Plans | rynk.",
  description: "Simple, transparent pricing for deep research and AI tools. Choose the plan that fits your workflow. 2,500+ queries per month with rynk+.",
  openGraph: {
    title: "Pricing & Plans | rynk.",
    description: "Unlock the full power of rynk. with our Pro plans.",
    url: "https://rynk.io/subscription",
  }
};

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SubscriptionClient />
    </Suspense>
  );
}
