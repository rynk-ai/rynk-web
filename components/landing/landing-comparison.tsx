"use client";

import { motion } from "motion/react";
import { PiFileText, PiLink, PiXCircle, PiCheckCircle, PiChatCircle, PiChartBar } from "react-icons/pi";

export function LandingComparison() {
  return (
    <section id="features" className="py-16 bg-background">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tighter mb-4 text-foreground">
            Structured data beats <br/> walls of text.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
             Standard AIs give you paragraphs. We give you citations, visual timelines, and verified data.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto items-stretch">
          
          {/* Box 1: Standard LLM */}
          <motion.div 
            className="bg-secondary/30 rounded-2xl p-6 border border-border/50 flex flex-col h-full"
          >
             <div className="flex items-center gap-2 mb-6 opacity-50">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <div className="ml-2 text-[10px] font-medium uppercase tracking-wide">Standard Model</div>
             </div>

             <div className="flex-1 flex flex-col justify-center gap-4">
                 <div className="bg-background/40 p-3 rounded-xl rounded-tr-sm border border-border/30 self-end max-w-[80%] text-xs text-muted-foreground">
                    Compare iPhone 15 Pro vs Pixel 9 Pro
                 </div>

                 <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0 flex items-center justify-center">
                        <PiChatCircle className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="bg-background border border-border/50 p-4 rounded-2xl rounded-tl-sm shadow-sm max-w-[90%]">
                        <div className="space-y-2">
                             <div className="h-2 w-full bg-secondary rounded-full" />
                             <div className="h-2 w-[90%] bg-secondary rounded-full" />
                             <div className="h-2 w-[95%] bg-secondary rounded-full" />
                             <div className="h-2 w-[80%] bg-secondary rounded-full" />
                             <div className="h-2 w-full bg-secondary rounded-full" />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                            The iPhone 15 Pro features the A17 Pro chip and a titanium frame. Meanwhile, the Pixel 9 Pro runs on the Tensor G4 and offers advanced AI features...
                        </p>
                    </div>
                 </div>
             </div>
          </motion.div>

          {/* Box 2: rynk. (Structured Surface) */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-secondary/30 rounded-2xl p-6 border border-border/50 relative overflow-hidden flex flex-col h-full group"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                            <PiCheckCircle className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="font-bold text-sm tracking-tight">Structured Comparison</div>
                            <div className="text-[10px] text-muted-foreground">Generated instantly</div>
                        </div>
                </div>
            </div>

            {/* Content Mockup */}
            <div className="bg-background rounded-xl p-0 border border-border/40 shadow-sm flex-1 overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-border/40">
                     <h3 className="text-sm font-bold tracking-tight mb-2">Tech Specs Comparison</h3>
                     
                     <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2 px-2">
                        <span>Feature</span>
                        <div className="flex gap-4">
                            <span className="w-12 text-center">iPhone</span>
                            <span className="w-12 text-center">Pixel</span>
                        </div>
                     </div>

                     <div className="space-y-2">
                         {/* Row 1 */}
                         <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
                             <span className="text-[10px] font-medium">Chipset</span>
                             <div className="flex gap-4 text-[10px]">
                                 <span className="w-12 text-center font-semibold">A17 Pro</span>
                                 <span className="w-12 text-center text-muted-foreground">Tensor G4</span>
                             </div>
                         </div>
                         {/* Row 2 */}
                         <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
                             <span className="text-[10px] font-medium">Material</span>
                             <div className="flex gap-4 text-[10px]">
                                 <span className="w-12 text-center font-semibold">Titanium</span>
                                 <span className="w-12 text-center text-muted-foreground">Aluminum</span>
                             </div>
                         </div>
                         {/* Row 3 */}
                         <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
                             <span className="text-[10px] font-medium">RAM</span>
                             <div className="flex gap-4 text-[10px]">
                                 <span className="w-12 text-center text-muted-foreground">8 GB</span>
                                 <span className="w-12 text-center font-semibold">16 GB</span>
                             </div>
                         </div>
                     </div>
                 </div>
                 
                 <div className="p-4 bg-secondary/5 flex-1 flex flex-col justify-end">
                     <div className="flex gap-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 text-[9px] font-medium border border-blue-100 dark:border-blue-900/30">
                            <PiLink className="h-3 w-3" /> GSM Arena
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 text-[9px] font-medium border border-orange-100 dark:border-orange-900/30">
                            <PiLink className="h-3 w-3" /> The Verge
                        </span>
                     </div>
                 </div>
            </div>
          </motion.div>
        
        </div>
      </div>
    </section>
  );
}
