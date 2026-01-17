"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useScroll, useMotionValueEvent } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { PiSun, PiMoon, PiList, PiArrowRight } from "react-icons/pi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { PiCaretDown, PiSparkle, PiYoutubeLogo, PiTextAa, PiArrowsClockwise, PiTextAlignLeft, PiMagnifyingGlass } from "react-icons/pi";

export function LandingNavbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session;
  const navRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.from(".nav-brand", {
      y: -20,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    })
    .from(".nav-item", {
      y: -20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power3.out"
    }, "-=0.6");
  }, { scope: navRef });

  return (
    <header 
      ref={navRef}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        scrolled 
            ? "bg-background/80 backdrop-blur-md border-border shadow-sm" 
            : "bg-transparent border-transparent py-4"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <nav className="flex items-center justify-between h-14">
          
          {/* Brand */}
          <div className="flex-shrink-0">
            <Link href="/" className="nav-brand group block">
              <span className="font-bold text-2xl tracking-tight leading-none text-foreground">
                rynk.
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-8 items-center bg-card/50 px-6 py-2 rounded-full border border-border/40 backdrop-blur-sm shadow-sm">
            {/* Tools Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="nav-item text-sm font-medium text-muted-foreground hover:text-foreground transition-colors outline-none flex items-center gap-1.5 focus:text-foreground">
                Tools <PiCaretDown className="h-3 w-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" sideOffset={8} className="w-80 p-2 rounded-xl bg-background border-border shadow-lg ring-1 ring-black/5">
                <DropdownMenuItem asChild className="p-2 cursor-pointer rounded-lg focus:bg-secondary">
                  <Link href="/humanizer" className="flex items-start gap-3 w-full group">
                    <div className="mt-0.5 p-1.5 bg-purple-500/10 rounded-md group-hover:bg-purple-500/20 transition-colors">
                      <PiSparkle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">AI Humanizer</span>
                        <span className="text-xs text-muted-foreground">Make AI text undetectable</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-2 cursor-pointer rounded-lg focus:bg-secondary">
                  <Link href="/tools/ai-content-detector" className="flex items-start gap-3 w-full group">
                    <div className="mt-0.5 p-1.5 bg-violet-500/10 rounded-md group-hover:bg-violet-500/20 transition-colors">
                      <PiMagnifyingGlass className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">AI Detector</span>
                        <span className="text-xs text-muted-foreground">Check if text is AI</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-2 cursor-pointer rounded-lg focus:bg-secondary">
                  <Link href="/tools/paraphraser" className="flex items-start gap-3 w-full group">
                    <div className="mt-0.5 p-1.5 bg-emerald-500/10 rounded-md group-hover:bg-emerald-500/20 transition-colors">
                      <PiArrowsClockwise className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">Paraphraser</span>
                        <span className="text-xs text-muted-foreground">Rewrite in any style</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                
                <div className="border-t border-border mt-1 pt-1">
                  <DropdownMenuItem asChild className="p-2 cursor-pointer rounded-lg focus:bg-secondary justify-center">
                    <Link href="/tools" className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                      View All Tools <PiArrowRight className="h-3 w-3" />
                    </Link>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="#features" className="nav-item text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="nav-item text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                className="nav-item w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                aria-label="Toggle Theme"
              >
                <PiSun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <PiMoon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </button>
            )}

            {/* Auth */}
            {isAuthenticated ? (
               <Link href="/chat" className="nav-item hidden md:flex">
                <Button size="sm" className="font-semibold text-xs h-9 px-5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm">
                  Dashboard <PiArrowRight className="ml-2 h-3 w-3" />
                </Button>
               </Link>
            ) : (
              <div className="nav-item hidden md:flex items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Log in
                </Link>
                <Link href="/chat">
                    <Button size="sm" className="font-semibold text-xs h-9 px-5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm">
                    Get Started
                    </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-secondary">
                            <PiList className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[280px] p-2 rounded-xl border-border bg-background shadow-xl">
                        <div className="px-2 py-2 mb-2 border-b border-border/50">
                            <span className="font-bold text-sm text-muted-foreground">Menu</span>
                        </div>
                        <DropdownMenuItem asChild className="p-2 cursor-pointer rounded-lg focus:bg-secondary">
                            <Link href="#features" className="w-full text-sm font-medium">Features</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="p-2 cursor-pointer rounded-lg focus:bg-secondary">
                            <Link href="#pricing" className="w-full text-sm font-medium">Pricing</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="p-2 cursor-pointer rounded-lg focus:bg-secondary border-t border-border/50 mt-2 pt-2">
                             {!isAuthenticated ? (
                                <Link href="/login" className="w-full text-sm font-semibold">Log in</Link>
                             ) : (
                                <Link href="/chat" className="w-full text-sm font-semibold">Dashboard</Link>
                             )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

          </div>
        </nav>
      </div>
    </header>
  );
}
