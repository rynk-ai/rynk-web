"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useScroll, useMotionValueEvent, AnimatePresence } from "motion/react";
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
import { PiCaretDown, PiSparkle, PiYoutubeLogo } from "react-icons/pi";

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
            ? "bg-background/80 backdrop-blur-md border-border" 
            : "bg-transparent border-transparent py-2"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <nav className="flex items-center justify-between h-16">
          
          {/* Brand - Left */}
          <div className="flex-shrink-0">
            <Link href="/" className="nav-brand group block">
              <span className="font-display font-bold text-3xl tracking-normal leading-none group-hover:opacity-70 transition-opacity">
                rynk.
              </span>
            </Link>
          </div>

          {/* Center Nav - Desktop */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-12">
            {/* Tools Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="nav-item swiss-subhead text-sm uppercase hover:text-muted-foreground transition-colors outline-none flex items-center gap-1 group">
                Tools <PiCaretDown className="h-3 w-3 group-data-[state=open]:rotate-180 transition-transform" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56 p-1 rounded-xl bg-background border-border shadow-lg">
                <DropdownMenuItem asChild className="p-2 cursor-pointer rounded-lg focus:bg-secondary">
                  <Link href="/humanizer" className="flex items-center gap-3 w-full">
                    <div className="p-1.5 bg-green-500/10 rounded-md">
                      <PiSparkle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">AI Humanizer</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Free Tool</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-2 cursor-pointer rounded-lg focus:bg-secondary">
                  <Link href="/tools/youtube-title-generator" className="flex items-center gap-3 w-full">
                    <div className="p-1.5 bg-red-500/10 rounded-md">
                      <PiYoutubeLogo className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">Viral Title Gen</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Research Agent</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="#features" className="nav-item swiss-subhead text-sm uppercase hover:text-muted-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="nav-item swiss-subhead text-sm uppercase hover:text-muted-foreground transition-colors">Pricing</Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-6">
            
            {/* Theme Toggle - Minimal Text/Icon Hybrid */}
            {mounted && (
              <button
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                className="nav-item hidden md:flex items-center justify-center w-8 h-8 rounded-none hover:bg-secondary transition-colors"
                aria-label="Toggle Theme"
              >
                <PiSun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <PiMoon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </button>
            )}

            {/* Auth Buttons */}
            {isAuthenticated ? (
               <Link href="/chat" className="nav-item hidden md:flex">
                <Button size="sm" className="rounded-none h-9 px-6 font-medium text-xs uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90">
                  Dashboard <PiArrowRight className="ml-2 h-3 w-3" />
                </Button>
               </Link>
            ) : (
              <div className="nav-item hidden md:flex items-center gap-6">
                <Link href="/login" className="swiss-subhead text-sm uppercase hover:text-muted-foreground transition-colors">
                  Log in
                </Link>
                <Link href="/chat">
                    <Button size="sm" className="rounded-none h-9 px-6 font-medium text-xs uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90">
                    Get Started
                    </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu */}
            <div className="md:hidden flex items-center gap-4">
                 {mounted && (
                    <button
                        onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                        className="w-8 h-8 flex items-center justify-center"
                    >
                        <PiSun className="h-5 w-5 dark:hidden" />
                        <PiMoon className="h-5 w-5 hidden dark:block" />
                    </button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none hover:bg-transparent">
                            <PiList className="h-6 w-6" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[300px] p-0 rounded-none border-border bg-background shadow-none border-l border-b">
                         <div className="p-4 border-b border-border bg-secondary/50">
                            <span className="font-display font-bold text-lg tracking-normal">Menu</span>
                        </div>
                        <DropdownMenuItem asChild className="p-4 cursor-pointer rounded-none border-b border-border focus:bg-secondary">
                            <Link href="#features" className="w-full text-base font-medium uppercase tracking-wide">Features</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="p-4 cursor-pointer rounded-none border-b border-border focus:bg-secondary">
                            <Link href="#pricing" className="w-full text-base font-medium uppercase tracking-wide">Pricing</Link>
                        </DropdownMenuItem>
                        {!isAuthenticated ? (
                             <DropdownMenuItem asChild className="p-4 cursor-pointer rounded-none focus:bg-secondary">
                                <Link href="/login" className="w-full text-base font-medium uppercase tracking-wide">Log in</Link>
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem asChild className="p-4 cursor-pointer rounded-none focus:bg-secondary">
                                <Link href="/chat" className="w-full text-base font-medium uppercase tracking-wide">Enter App</Link>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

          </div>
        </nav>
      </div>
    </header>
  );
}
