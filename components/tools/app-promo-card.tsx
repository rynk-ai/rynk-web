"use client";

import Link from "next/link";
import { PiSparkleFill, PiArrowRight } from "react-icons/pi";
import { Button } from "@/components/ui/button";

interface AppPromoCardProps {
  variant?: "minimal" | "card";
}

export function AppPromoCard({ variant = "card" }: AppPromoCardProps) {
  if (variant === "minimal") {
    return (
      <div className="w-full flex items-center justify-center py-6">
        <Link 
          href="/chat" 
          className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <PiSparkleFill className="w-4 h-4 text-amber-500" />
          <span>Want more advanced features? Try the full Rynk App</span>
          <PiArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card to-secondary/30 p-6 md:p-8">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-lg md:text-xl font-bold flex items-center justify-center md:justify-start gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <PiSparkleFill className="w-5 h-5" /> 
              </span>
              Unlock Full Potential
            </h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Free tools are great, but Rynk&apos;s full workspace offers deep context, project memory, and advanced models like Claude 3.5 Sonnet.
            </p>
          </div>

          <div className="flex-shrink-0">
            <Link href="/chat">
              <Button className="rounded-full px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                Try Rynk for Free
                <PiArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
