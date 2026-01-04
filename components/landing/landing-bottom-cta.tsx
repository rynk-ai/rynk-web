"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { PiArrowRight } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

gsap.registerPlugin(ScrollTrigger);

export function LandingBottomCTA() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session;
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from(".cta-content", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 70%",
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-32 bg-foreground text-background">
      
      <div className="container px-4 mx-auto text-center cta-content">
        
        <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-8">
           Ready to try it?
        </h2>
            
        <Button 
            size="lg" 
            onClick={() => router.push('/chat')}
            className="h-14 px-10 rounded-none bg-background text-foreground hover:bg-background/90 text-base font-medium"
        >
            {isAuthenticated ? "Open App" : "Start for free"}
            <PiArrowRight className="ml-2 h-5 w-5" />
        </Button>
        
        {!isAuthenticated && (
          <p className="mt-6 text-sm text-background/50">
              No credit card required
          </p>
        )}

      </div>
    </section>
  );
}
