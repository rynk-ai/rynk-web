"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useScroll, useMotionValueEvent, AnimatePresence, motion } from "motion/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { PiSun, PiMoon, PiDesktop, PiList, PiArrowRight } from "react-icons/pi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LandingNavbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session;

  useEffect(() => {
    setMounted(true);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
    setShowCta(latest > 600); // Show CTA after scrolling past approx Hero height
  });

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        scrolled 
            ? "py-2 bg-background/95 border-border/40 shadow-sm" 
            : "py-4 bg-background border-transparent"
      )}
    >
      <div className="container px-4 mx-auto">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl tracking-tight z-50 relative">
            <span>rynk.</span>
          </Link>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mr-2">Features</Link>
            
            {mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <PiSun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <PiMoon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <PiSun className="mr-2 h-4 w-4" /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                     <PiMoon className="mr-2 h-4 w-4" /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                     <PiDesktop className="mr-2 h-4 w-4" /> System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isAuthenticated ? (
              <Button size="sm" className="rounded-full px-5 font-medium" asChild>
                <Link href="/chat">
                  Go to Chat
                  <PiArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                
                <AnimatePresence>
                    {showCta && (
                        <motion.div
                            initial={{ opacity: 0, width: 0, scale: 0.9 }}
                            animate={{ opacity: 1, width: "auto", scale: 1 }}
                            exit={{ opacity: 0, width: 0, scale: 0.9 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <Button size="sm" className="rounded-full px-5 font-medium whitespace-nowrap ml-2" asChild>
                               <Link href="/chat">Get Started</Link>
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated ? (
              <Button size="sm" className="rounded-full px-4 h-8 text-xs font-medium" asChild>
                <Link href="/chat">
                  Go to Chat
                  <PiArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            ) : (
              <AnimatePresence>
                  {showCta && (
                      <motion.div
                          initial={{ opacity: 0, width: 0, scale: 0.9 }}
                          animate={{ opacity: 1, width: "auto", scale: 1 }}
                          exit={{ opacity: 0, width: 0, scale: 0.9 }}
                          className="overflow-hidden mr-1"
                      >
                          <Button size="sm" className="rounded-full px-4 h-8 text-xs font-medium" asChild>
                             <Link href="/chat">Get Started</Link>
                          </Button>
                      </motion.div>
                  )}
              </AnimatePresence>
            )}

            {mounted && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9"
                    onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                >
                    <PiSun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <PiMoon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
            )}

            {!isAuthenticated && (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                          <PiList className="h-5 w-5" />
                          <span className="sr-only">Open menu</span>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px] p-2 space-y-1">
                      <DropdownMenuItem asChild className="p-2 cursor-pointer">
                          <Link href="#features" className="w-full">Features</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="p-2 cursor-pointer">
                          <Link href="/login" className="w-full">Log in</Link>
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

