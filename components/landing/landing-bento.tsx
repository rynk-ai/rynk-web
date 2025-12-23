"use client";

import { motion } from "motion/react";
import { PiBrain, PiFiles, PiChatCircle, PiCheckCircle, PiFilePdf, PiFileCsv } from "react-icons/pi";

export function LandingBento() {
  return (
    <section className="py-20 bg-background border-t border-border/40">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tighter mb-6 text-foreground">
             A memory system that <br/> <span className="text-muted-foreground">actually remembers.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
             Project-scoped memory, infinite context, and instant file analysis. Stop repeating yourself to the AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            
            {/* Feature 1: Memory */}
            <motion.div 
                whileHover={{ y: -5 }}
                className="group p-6 rounded-2xl bg-secondary/30 border border-border/50 hover:bg-secondary/40 transition-all duration-300 flex flex-col"
            >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
                    <PiBrain className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold font-display tracking-tight mb-3">Infinite Context</h3>
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm flex-1">
                    It remembers your preferences, projects, and tech stack. Stop repeating yourself.
                </p>
                <div className="h-40 rounded-xl bg-background border border-border/50 shadow-sm p-4 relative overflow-hidden flex flex-col justify-center gap-3">
                    <div className="flex flex-wrap gap-2 justify-center">
                        <span className="px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-medium border border-purple-200 dark:border-purple-800">React.js</span>
                        <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium border border-blue-200 dark:border-blue-800">Tailwind CSS</span>
                        <span className="px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-medium border border-orange-200 dark:border-orange-800">Next.js 14</span>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center opacity-60">
                         <span className="px-2 py-1 rounded-md bg-secondary text-muted-foreground text-[10px] font-medium border border-border">PostgreSQL</span>
                         <span className="px-2 py-1 rounded-md bg-secondary text-muted-foreground text-[10px] font-medium border border-border">Prisma</span>
                    </div>
                </div>
            </motion.div>

            {/* Feature 2: Files */}
            <motion.div 
                whileHover={{ y: -5 }}
                className="group p-6 rounded-2xl bg-secondary/30 border border-border/50 hover:bg-secondary/40 transition-all duration-300 flex flex-col"
            >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                    <PiFiles className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold font-display tracking-tight mb-3">File Analysis</h3>
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm flex-1">
                    Drop PDFs, spreadsheets (CSV/XLSX), or docs. It analyzes the entire file instantly.
                </p>
                <div className="h-40 rounded-xl bg-background border border-border/50 shadow-sm flex flex-col items-center justify-center relative overflow-hidden p-4">
                    <div className="w-full max-w-[180px] bg-secondary/20 border border-border/50 rounded-lg p-3 flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
                            <PiFilePdf className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium truncate">Quarterly_Report.pdf</div>
                            <div className="text-[8px] text-muted-foreground">2.4 MB • Parsed</div>
                        </div>
                        <PiCheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                     <div className="w-full max-w-[180px] bg-secondary/20 border border-border/50 rounded-lg p-3 flex items-center gap-3 opacity-60">
                        <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/20 text-green-600 flex items-center justify-center">
                            <PiFileCsv className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium truncate">data_export.csv</div>
                            <div className="text-[8px] text-muted-foreground">Processed</div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Feature 3: Threads */}
            <motion.div 
                whileHover={{ y: -5 }}
                className="group p-6 rounded-2xl bg-secondary/30 border border-border/50 hover:bg-secondary/40 transition-all duration-300 flex flex-col"
            >
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-6">
                    <PiChatCircle className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold font-display tracking-tight mb-3">Threaded Context</h3>
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm flex-1">
                    Dive deep into any topic without losing your main flow. Just select and ask.
                </p>
                <div className="h-40 rounded-xl bg-background border border-border/50 shadow-sm p-4 relative overflow-hidden flex flex-col justify-center">
                     <div className="space-y-4">
                        {/* Main Message */}
                        <div className="flex gap-2 opacity-40">
                             <div className="w-6 h-6 rounded-full bg-secondary flex-shrink-0" />
                             <div className="bg-secondary/50 rounded-lg rounded-tl-none p-2 text-[8px] w-3/4">
                                 The mitochondria is the powerhouse of the cell.
                             </div>
                        </div>
                        {/* Recursive Line */}
                        <div className="absolute left-[26px] top-[40px] bottom-[40px] w-px bg-border border-l border-dashed" />

                        {/* Thread Message */}
                        <div className="flex gap-2 ml-8">
                             <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex-shrink-0 flex items-center justify-center">
                                 <PiChatCircle className="h-3 w-3" />
                             </div>
                             <div className="bg-secondary/30 border border-border/50 rounded-lg rounded-tl-none p-2 text-[9px] font-medium w-full">
                                 Wait, how exactly does it produce energy?
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
