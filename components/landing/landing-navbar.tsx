"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useScroll, useMotionValueEvent } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function LandingNavbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "py-4" : "py-6"
      )}
    >
      <div className="container px-4 mx-auto">
        <nav 
          className={cn(
            "flex items-center justify-between px-6 transition-all duration-300 w-full mx-auto",
            scrolled 
              ? "py-3 bg-background/70 backdrop-blur-lg border border-border/40 rounded-full shadow-sm max-w-4xl" 
              : "py-0 bg-transparent border-transparent max-w-7xl"
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg lg:text-2xl tracking-tight">
            <span>rynk.</span>
          </Link>



          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link href="#features" className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mr-2">Features</Link>
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" className="rounded-full px-5" asChild>
              <Link href="/chat">Get Started</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
