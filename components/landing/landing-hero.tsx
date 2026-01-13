"use client";

import { useRef, useState } from "react";
import { PiArrowRight } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { useSession } from "next-auth/react";
import gsap from "gsap";
import Link from "next/link";

export function LandingHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/chat?q=${encodeURIComponent(query)}` : "/chat");
  };

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.from(".hero-line", {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: "power3.out",
      delay: 0.2
    })
    .from(".hero-search", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
    }, "-=0.4");

  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef} 
      className="relative min-h-[90vh] flex flex-col justify-center items-center pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden"
    >
      {/* Gradient Mesh Background */}
      <div className="gradient-mesh" />

      {/* Top right auth button */}
      <div className="absolute top-6 right-6 z-20">
        {isAuthenticated ? (
          <Link href="/chat">
            <Button size="sm" className="rounded-none h-9 px-5 font-medium text-xs uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90">
              Dashboard <PiArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button size="sm" variant="outline" className="rounded-none h-9 px-5 font-medium text-xs uppercase tracking-wider border-foreground/20 hover:bg-secondary">
              Log in
            </Button>
          </Link>
        )}
      </div>
      
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="max-w-2xl mx-auto">
          
          {/* Direct, confident copy - rynk's own voice */}
          <div className="mb-12 space-y-6">
            <h1 className="hero-line text-5xl md:text-7xl font-bold tracking-tighter text-foreground leading-[0.9]">
              rynk
            </h1>
            <p className="hero-line text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-md">
              Ask. Read. Done.
            </p>
          </div>
          
          {/* Search Input */}
          <div className="hero-search w-full max-w-md">
            <form onSubmit={handleSearch} className="relative group">
              <div className="relative flex items-center bg-background border border-border hover:border-foreground/20 transition-colors">
                <Input 
                  placeholder="Ask anything..." 
                  className="h-14 rounded-none pl-5 pr-14 bg-transparent border-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground/50"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button 
                  type="submit"
                  size="icon"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-none bg-foreground text-background hover:bg-foreground/90"
                >
                  <PiArrowRight className="h-4 w-4" />
                  <span className="sr-only">Go</span>
                </Button>
              </div>
            </form>
            <p className="mt-4 text-sm text-muted-foreground">
              Free to try. No account needed.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

