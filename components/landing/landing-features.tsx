"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PiBookOpen, PiFiles, PiBrain } from "react-icons/pi";
import { DeepContextSimulation, PdfAnalysisSimulation } from "./feature-simulations";
import { TimelineSimulation } from "./timeline-simulation";

gsap.registerPlugin(ScrollTrigger);

export function LandingFeatures() {
  const containerRef = useRef(null);

  return (
    <section ref={containerRef} id="features" className="py-12 bg-background">
      <div className="container px-4 md:px-6 mx-auto">
        
        {/* Section Header */}
        <div className="mb-12 text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">Core Capabilities</h2>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
                How it helps.
            </h3>
            <p className="text-base text-muted-foreground leading-relaxed text-balance">
                Built on a foundation of verifiable truth. Rynk combines deep retrieval with semantic synthesis.
            </p>
        </div>
        
        <div className="space-y-16 md:space-y-24">
            
            {/* Feature 1: Context Persistence (Text Left, Visual Right) */}
            <div className="feature-section flex flex-col items-center gap-4">
               <div className="text-center max-w-xl mx-auto space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                    <PiBookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">Full Context.</h3>
                  <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                      <p>
                        <span className="text-foreground font-medium">Problem:</span> You lose context when you switch chats.
                      </p>
                      <p>
                        <span className="text-foreground font-medium">Solution:</span> Rynk uses your entire project history to inform its answers.
                      </p>
                  </div>
               </div>
               
               <div className="w-full max-w-lg mx-auto h-64 md:h-auto md:aspect-[3/1] relative rounded-lg overflow-hidden bg-secondary/20 shadow-sm border border-border/50">
                   <DeepContextSimulation />
               </div>
            </div>

            {/* Feature 2: Document Extraction (Visual Left, Text Right) */}
            <div className="feature-section flex flex-col items-center gap-4">
                 <div className="text-center max-w-xl mx-auto space-y-3">
                     <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                        <PiFiles className="w-5 h-5 text-amber-600" />
                     </div>
                     <h3 className="text-xl font-bold tracking-tight">Document Analysis.</h3>
                     <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                          <p>
                            <span className="text-foreground font-medium">Problem:</span> PDFs are black boxes.
                          </p>
                          <p>
                            <span className="text-foreground font-medium">Solution:</span> Extract specific data from hundreds of PDFs instantly.
                          </p>
                     </div>
                 </div>
                 
                 <div className="w-full max-w-lg mx-auto h-64 md:h-auto md:aspect-[3/1] relative rounded-lg overflow-hidden bg-secondary/20 shadow-sm border border-border/50">
                    <PdfAnalysisSimulation />
                 </div>
            </div>

            {/* Feature 3: Synthesized Intelligence (Text Left, Visual Right - Wide) */}
            <div className="feature-section flex flex-col items-center gap-4">
                 <div className="text-center max-w-xl mx-auto space-y-3">
                     <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                        <PiBrain className="w-5 h-5 text-purple-600" />
                     </div>
                     <h3 className="text-xl font-bold tracking-tight">Automated Writing.</h3>
                     <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                        <p>
                            <span className="text-foreground font-medium">Problem:</span> Chatbots just chat.
                        </p>
                        <p>
                            <span className="text-foreground font-medium">Solution:</span> Rynk doesn't just chat. It writes full reports that you can export.
                        </p>
                     </div>
                 </div>
                 
                 {/* Wide Container for Timeline */}
                 <div className="w-full max-w-lg mx-auto h-64 md:h-auto md:aspect-[3/1] relative rounded-lg overflow-hidden bg-secondary/20 shadow-sm border border-border/50">
                    <TimelineSimulation />
                 </div>
            </div>
 
        </div>

      </div>
    </section>
  );
}
