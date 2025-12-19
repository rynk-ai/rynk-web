"use client";

import { motion } from "motion/react";
import { PiFileText, PiLink, PiXCircle, PiCheckCircle, PiChatCircle } from "react-icons/pi";

export function LandingComparison() {
  return (
    <section id="features" className="py-24 bg-secondary/20">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Structured data beats <br/> walls of text.
          </h2>
          <p className="text-lg text-muted-foreground">
             Standard AIs give you paragraphs. We give you citations, visual timelines, and verified data.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto items-stretch">
          
          {/* Box 1: Standard LLM */}
          <motion.div 
            className="bg-secondary/20 rounded-3xl p-8 border border-border/50 flex flex-col h-full"
          >
             <div className="flex items-center gap-2 mb-6 opacity-50">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <div className="ml-2 text-xs font-medium uppercase tracking-wide">Standard Model</div>
             </div>

             <div className="flex-1 flex flex-col justify-center gap-4">
                 <div className="bg-background/40 p-4 rounded-xl rounded-tr-sm border border-border/30 self-end max-w-[80%] text-xs text-muted-foreground">
                    Analyze Q3 revenue.
                 </div>

                 <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0 flex items-center justify-center">
                        <PiChatCircle className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="bg-background border border-border/50 p-4 rounded-2xl rounded-tl-sm shadow-sm max-w-[90%]">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Revenue seems to be up throughout the board, but I'm not exact sure by how much. <br/><br/>
                            Maybe check the report?
                        </p>
                    </div>
                 </div>
             </div>
          </motion.div>

          {/* Box 2: rynk. (Structured Surface) */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-secondary/20 rounded-3xl p-8 border border-border/50 relative overflow-hidden flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                        <PiCheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-bold text-base">Deep Research</div>
                            <div className="text-xs text-muted-foreground">Generated instantly</div>
                        </div>
                </div>
            </div>

            {/* Content Mockup */}
            <div className="space-y-4 bg-background rounded-2xl p-5 border border-border/40 shadow-sm flex-1">
                 <h3 className="text-lg font-semibold">Q3 Fiscal Analysis: <span className="text-green-500">+12% YoY</span></h3>
                 
                 {/* Citations */}
                 <div className="flex gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 text-[10px] font-medium">
                        <PiLink className="h-3 w-3" /> Bloomberg
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 text-[10px] font-medium">
                        <PiLink className="h-3 w-3" /> Reuters
                    </span>
                 </div>

                 <div className="space-y-3 pt-2">
                    <div className="flex gap-3">
                        <div className="w-1 bg-primary/20 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <div className="h-2 w-full bg-secondary rounded-full" />
                            <div className="h-2 w-[90%] bg-secondary rounded-full" />
                        </div>
                    </div>
                 </div>
            </div>
          </motion.div>
        
        </div>
      </div>
    </section>
  );
}
