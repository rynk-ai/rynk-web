"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { 
  PiFilePdf, 
  PiCheck, 
  PiLink,
  PiGraph, 
  PiArticle, 
  PiMagicWand,
  PiGlobe,
  PiBookOpen,
} from "react-icons/pi";

// ==========================================
// 1. Deep Context Simulation (Compact)
// ==========================================
export function DeepContextSimulation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 2,
      defaults: { ease: "power3.out" }
    });

    // Reset
    tl.set(".ctx-card", { 
        x: (i) => i === 0 ? -10 : 10,
        opacity: 0.5, 
        scale: 0.9,
        borderColor: "transparent",
        backgroundColor: "rgb(255, 255, 255)", 
    });
    tl.set(".ctx-connection-line", { width: 0, opacity: 0 });
    tl.set(".ctx-badge", { scale: 0, opacity: 0 });

    // 1. Appear
    tl.to(".ctx-card", { 
      opacity: 1, 
      scale: 1, 
      duration: 0.6,
    });

    // 2. Converge & Highlight
    tl.to(".ctx-card", {
      x: 0,
      borderColor: "#d4d4d8", // zinc-300
      backgroundColor: "#f4f4f5", // zinc-100
      duration: 0.8,
      ease: "elastic.out(1, 0.9)"
    });

    // 3. Connect
    tl.to(".ctx-connection-line", {
        width: "40px",
        opacity: 1,
        duration: 0.4
    }, "-=0.6");

    // 4. Badge Pop
    tl.to(".ctx-badge", {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        ease: "back.out(2)"
    }, "-=0.2");

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="w-full h-full min-h-[100px] flex items-center justify-center relative overflow-hidden bg-secondary/10 border border-border/50 rounded-lg">
       {/* Simple dot pattern */}
       <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
       
       <div className="relative z-10 flex items-center gap-4">
          
          {/* Card 1 */}
          <div className="ctx-card relative w-24 h-28 bg-card border border-border/40 p-2.5 rounded-lg shadow-sm flex flex-col gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <PiGraph size={12} />
              </div>
              <div className="space-y-1.5 opacity-60">
                 <div className="h-1.5 w-full bg-foreground/20 rounded-full" />
                 <div className="h-1.5 w-2/3 bg-foreground/20 rounded-full" />
                 <div className="h-1.5 w-1/2 bg-foreground/20 rounded-full" />
              </div>
          </div>

          {/* Connection Line Container */}
          <div className="relative h-[2px] w-[40px] flex items-center justify-center">
              <div className="ctx-connection-line h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              <div className="ctx-badge absolute bg-primary text-primary-foreground p-1 rounded-full shadow-sm z-20">
                  <PiLink size={10} />
              </div>
          </div>

          {/* Card 2 */}
          <div className="ctx-card relative w-24 h-28 bg-card border border-border/40 p-2.5 rounded-lg shadow-sm flex flex-col gap-2">
              <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                <PiArticle size={12} />
              </div>
              <div className="space-y-1.5 opacity-60">
                 <div className="h-1.5 w-full bg-foreground/20 rounded-full" />
                 <div className="h-1.5 w-3/4 bg-foreground/20 rounded-full" />
                 <div className="h-1.5 w-1/2 bg-foreground/20 rounded-full" />
              </div>
          </div>
       </div>
    </div>
  );
}

// ==========================================
// 2. PDF Analysis Simulation (Compact)
// ==========================================
export function PdfAnalysisSimulation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 2,
      defaults: { ease: "power2.inOut" }
    });

    tl.set(".scan-bar", { top: "0%", opacity: 0 });
    tl.set(".pdf-row-highlight", { backgroundColor: "transparent" }); 
    tl.set(".extract-popover", { y: 10, opacity: 0, scale: 0.9 });
    tl.set(".extract-row", { width: 0, opacity: 0 });

    // 1. Scan
    tl.to(".scan-bar", { opacity: 1, duration: 0.2 });
    tl.to(".scan-bar", { top: "100%", duration: 1.2, ease: "linear" });
    
    // Highlight specific rows during scan
    tl.to(".pdf-row-2", { backgroundColor: "rgba(251, 191, 36, 0.15)", duration: 0.1 }, "-=0.9"); 
    tl.to(".pdf-row-4", { backgroundColor: "rgba(251, 191, 36, 0.15)", duration: 0.1 }, "-=0.5");
    
    tl.to(".scan-bar", { opacity: 0, duration: 0.2 });

    // 2. Extract Popover appears
    tl.to(".extract-popover", { 
      y: 0, 
      opacity: 1, 
      scale: 1,
      duration: 0.4,
      ease: "back.out(1.5)"
    });

    // 3. Text flow
    tl.to(".extract-row-1", { width: "80%", opacity: 1, duration: 0.3 });
    tl.to(".extract-row-2", { width: "60%", opacity: 1, duration: 0.3 });

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="w-full h-full min-h-[100px] flex items-center justify-center relative bg-secondary/10 border border-border/50 rounded-lg overflow-hidden">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-secondary/20" />

        {/* PDF Doc */}
        <div className="relative w-28 aspect-[3/4] bg-card border border-border shadow-sm rounded-md p-3 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-3">
               <PiFilePdf className="text-red-500 text-xs" />
               <div className="h-1 w-8 bg-muted rounded-full" />
            </div>
            
            <div className="space-y-1.5">
               <div className="h-1 w-full bg-muted/50 rounded-full" />
               <div className="h-1 w-full bg-muted/50 rounded-full pdf-row-highlight pdf-row-2 transition-colors" />
               <div className="h-1 w-2/3 bg-muted/50 rounded-full" />
               <div className="h-1 w-full bg-muted/50 rounded-full pdf-row-highlight pdf-row-4 transition-colors" />
               <div className="h-1 w-3/4 bg-muted/50 rounded-full" />
            </div>

            {/* Scan Bar */}
            <div className="scan-bar absolute left-0 right-0 h-[1px] bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] z-10" />
        </div>

        {/* Extraction Popover */}
        <div className="extract-popover absolute bottom-3 right-6 bg-foreground text-background p-3 rounded-lg shadow-xl z-20 w-32">
            <div className="flex items-center gap-2 mb-2">
                <PiMagicWand className="text-amber-400 text-xs" />
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Extracted</span>
            </div>
            <div className="space-y-1.5">
                <div className="extract-row extract-row-1 h-1 bg-background/40 rounded-full" />
                <div className="extract-row extract-row-2 h-1 bg-background/40 rounded-full" />
            </div>
        </div>
    </div>
  );
}


