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
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 60%",
      }
    });

    tl.from(".cta-line", {
        y: 100,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power4.out"
    })
    .from(".cta-actions", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
    }, "-=0.5");

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-32 bg-foreground text-background relative overflow-hidden">
      
      <div className="container px-4 mx-auto text-center">
        
        <div className="mb-16">
             <h2 className="text-6xl md:text-8xl lg:text-[8rem] font-bold tracking-tighter leading-[0.85] mb-8 overflow-hidden">
                <div className="overflow-hidden"><span className="cta-line block">YOUR RESEARCH.</span></div>
                <div className="overflow-hidden"><span className="cta-line block text-muted-foreground/50">YOUR FORMAT.</span></div>
             </h2>
        </div>
            
        <div className="cta-actions flex flex-col items-center">
             <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-md">
                <Button 
                    size="lg" 
                    onClick={() => router.push('/chat')}
                    className="w-full h-16 rounded-none bg-background text-foreground hover:bg-background/90 text-lg font-bold uppercase tracking-widest border border-transparent"
                >
                    {isAuthenticated ? "Back to Chat" : "Start now"}
                    <PiArrowRight className="ml-3 h-5 w-5" />
                </Button>
                
                <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full h-16 rounded-none border-background/20 text-background hover:bg-background/10 hover:text-background bg-transparent text-lg font-bold uppercase tracking-widest"
                >
                    See Demo
                </Button>
            </div>
            
            {!isAuthenticated && (
              <p className="mt-8 text-xs font-mono uppercase tracking-widest text-background/40">
                  No credit card required • 100 searches free
              </p>
            )}
        </div>
      </div>
    </section>
  );
}
