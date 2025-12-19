"use client";

import { motion } from "motion/react";
import { PiBrain, PiFiles, PiChatCircle } from "react-icons/pi";

export function LandingBento() {
  return (
    <section className="py-32 bg-background border-t border-border/40">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
             A memory system that <br/> <span className="text-muted-foreground">actually remembers.</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
             Project-scoped memory, infinite context, and instant file analysis. Stop repeating yourself to the AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            
            {/* Feature 1: Memory */}
            <motion.div 
                whileHover={{ y: -5 }}
                className="group p-8 rounded-3xl bg-secondary/10 border border-border/50 hover:bg-secondary/20 transition-all duration-300"
            >
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-8">
                    <PiBrain className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Infinite Context</h3>
                <p className="text-muted-foreground leading-relaxed mb-8">
                    It remembers your preferences, projects, and tech stack. Stop repeating yourself.
                </p>
                <div className="h-32 rounded-xl bg-background border border-border/50 shadow-sm p-4 relative overflow-hidden">
                    <div className="absolute top-4 left-4 right-4 space-y-3 opacity-60 group-hover:opacity-100 transition-opacity">
                        <div className="h-2 w-1/2 bg-purple-500/20 rounded-full" />
                        <div className="h-2 w-3/4 bg-muted rounded-full" />
                        <div className="h-2 w-full bg-muted rounded-full" />
                    </div>
                </div>
            </motion.div>

            {/* Feature 2: Files */}
            <motion.div 
                whileHover={{ y: -5 }}
                className="group p-8 rounded-3xl bg-secondary/10 border border-border/50 hover:bg-secondary/20 transition-all duration-300"
            >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-8">
                    <PiFiles className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">File Analysis</h3>
                <p className="text-muted-foreground leading-relaxed mb-8">
                    Drop PDFs, spreadsheets (CSV/XLSX), or docs. It analyzes the entire file instantly.
                </p>
                <div className="h-32 rounded-xl bg-background border border-border/50 shadow-sm flex items-center justify-center relative overflow-hidden">
                    <div className="text-xs font-medium text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border/50 group-hover:scale-105 transition-transform">
                        Annual_Report_2024.pdf
                    </div>
                </div>
            </motion.div>

            {/* Feature 3: Threads */}
            <motion.div 
                whileHover={{ y: -5 }}
                className="group p-8 rounded-3xl bg-secondary/10 border border-border/50 hover:bg-secondary/20 transition-all duration-300"
            >
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-8">
                    <PiChatCircle className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Threaded Context</h3>
                <p className="text-muted-foreground leading-relaxed mb-8">
                    Dive deep into any topic without losing your main flow. Just select and ask.
                </p>
                <div className="h-32 rounded-xl bg-background border border-border/50 shadow-sm p-4 relative overflow-hidden flex flex-col justify-end">
                     <div className="bg-secondary/50 rounded-lg p-2 text-[10px] text-muted-foreground w-3/4 ml-auto border border-border/50">
                        Can you explain this specific part?
                     </div>
                </div>
            </motion.div>

        </div>
      </div>
    </section>
  );
}
