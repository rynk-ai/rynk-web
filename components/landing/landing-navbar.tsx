"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useScroll, useMotionValueEvent, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { PiSun, PiMoon, PiDesktop, PiList, PiArrowRight, PiX } from "react-icons/pi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export function LandingNavbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [showCta, setShowCta] = useState(false);
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
    setShowCta(latest > 600);
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
            ? "py-3 bg-background border-border" 
            : "py-5 bg-background border-transparent"
      )}
    >
      <div className="container px-4 mx-auto">
        <nav className="grid grid-cols-12 items-center gap-4">
          
          {/* Logo - Spans 3 columns */}
          <div className="col-span-6 md:col-span-3">
            <Link href="/" className="nav-brand flex items-center gap-2 group">
              <span className="font-display font-bold text-2xl tracking-tighter group-hover:opacity-70 transition-opacity">rynk.</span>
            </Link>
          </div>

          {/* Desktop Nav - Middle */}
          <div className="hidden md:flex col-span-6 justify-center items-center gap-8">
            <Link href="#features" className="nav-item text-xs font-medium uppercase tracking-widest hover:text-muted-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="nav-item text-xs font-medium uppercase tracking-widest hover:text-muted-foreground transition-colors">Pricing</Link>
          </div>

          {/* Desktop Actions - Right - Spans 3 columns */}
          <div className="hidden md:flex col-span-3 justify-end items-center gap-4">
            
            {mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="nav-item h-8 w-8 rounded-none hover:bg-transparent">
                    <PiSun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <PiMoon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-none border-border">
                  <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-none cursor-pointer">
                    <PiSun className="mr-2 h-4 w-4" /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-none cursor-pointer">
                     <PiMoon className="mr-2 h-4 w-4" /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-none cursor-pointer">
                     <PiDesktop className="mr-2 h-4 w-4" /> System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isAuthenticated ? (
              <Button size="default" className="nav-item rounded-none px-6 font-medium bg-foreground text-background hover:bg-foreground/90 h-10" asChild>
                <Link href="/chat">
                  ACCOUNT
                  <PiArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Link href="/login" className="nav-item text-xs font-medium uppercase tracking-widest hover:text-muted-foreground transition-colors mr-2">
                  Log in
                </Link>
                
                <AnimatePresence>
                    {showCta && (
                       <Button size="default" className="nav-item rounded-none px-6 font-medium bg-foreground text-background hover:bg-foreground/90 h-10" asChild>
                           <Link href="/chat">START FREE</Link>
                       </Button>
                    )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle - Right */}
          <div className="flex md:hidden col-span-6 justify-end items-center gap-4">
             {mounted && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-none"
                    onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                >
                    <PiSun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <PiMoon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none">
                        <PiList className="h-6 w-6" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[300px] p-0 rounded-none border-border bg-background">
                    <div className="p-4 border-b border-border">
                        <span className="font-display font-bold text-lg">Menu</span>
                    </div>
                    <DropdownMenuItem asChild className="p-4 cursor-pointer rounded-none border-b border-border focus:bg-secondary">
                        <Link href="#features" className="w-full text-base font-medium">Features</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="p-4 cursor-pointer rounded-none border-b border-border focus:bg-secondary">
                        <Link href="#pricing" className="w-full text-base font-medium">Pricing</Link>
                    </DropdownMenuItem>
                    {!isAuthenticated ? (
                         <DropdownMenuItem asChild className="p-4 cursor-pointer rounded-none focus:bg-secondary">
                            <Link href="/login" className="w-full text-base font-medium">Log in</Link>
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem asChild className="p-4 cursor-pointer rounded-none focus:bg-secondary">
                            <Link href="/chat" className="w-full text-base font-medium">Open App</Link>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </nav>
      </div>
    </header>
  );
}
