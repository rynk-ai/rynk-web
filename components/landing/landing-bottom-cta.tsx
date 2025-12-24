"use client";

import { motion } from "motion/react";
import { PiArrowRight } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function LandingBottomCTA() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session;

  return (
    <section className="py-20 relative overflow-hidden bg-neutral-950 text-white">
      {/* Star Field Background Effect - subtle */}
      <div className="absolute inset-0 opacity-20">
         <div className="absolute top-[10%] left-[20%] w-0.5 h-0.5 bg-white rounded-full animate-pulse" />
         <div className="absolute top-[30%] right-[20%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
         <div className="absolute bottom-[20%] left-[40%] w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
         <div className="absolute top-[50%] right-[40%] w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent" />
      </div>

      <div className="container px-4 mx-auto relative z-10 text-center">
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8 }}
        >
            <h2 className="text-4xl md:text-5xl font-bold font-display tracking-tighter mb-8 text-white">
              Modern research <br/>
              <span className="text-white/60">for everyone.</span>
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                    size="lg" 
                    onClick={() => router.push('/chat')}
                    className="h-11 px-8 rounded-full bg-white text-black hover:bg-white/90 text-sm font-medium tracking-tight"
                >
                    {isAuthenticated ? "Back to Chat" : "Start for free"}
                    <PiArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <Button 
                    size="lg" 
                    variant="outline"
                    className="h-11 px-8 rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent text-sm font-medium tracking-tight"
                >
                    See the demo
                </Button>
            </div>
            
            {!isAuthenticated && (
              <p className="mt-8 text-xs text-white/40 font-medium">
                  No credit card required. Up to 100 searches/month free.
              </p>
            )}
        </motion.div>
      </div>
    </section>
  );
}

