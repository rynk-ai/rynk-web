import { motion } from "motion/react";
import { PiMagnifyingGlass, PiClock, PiNewspaper, PiStudent, PiTrendUp, PiBookOpen, PiGraduationCap, PiList, PiCheck, PiLink } from "react-icons/pi";

export function LandingSurfacesGrid() {
  return (
    <section className="py-16 bg-background">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold font-display tracking-tighter mb-4 text-foreground">
             Pick your format. <br/>We'll build the interface.
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
             Quizzes, timelines, comparisons, research reports—just pick what you need and it's generated instantly.
          </p>
        </div>

        <div className="grid md:grid-cols-6 gap-4 max-w-5xl mx-auto">
          {/* Card 1: Research (Spans top left 4 cols) */}
          <motion.div 
            whileHover={{ scale: 1.005 }}
            className="md:col-span-4 bg-secondary/30 rounded-2xl p-6 border border-border/50 flex flex-col items-center justify-center min-h-[320px] text-center relative overflow-hidden group"
          >
            {/* Visual: Detailed Research Layout */}
            <div className="bg-background shadow-lg rounded-xl p-0 w-full max-w-[320px] border border-border/40 relative z-10 overflow-hidden text-left">
                {/* Header */}
                <div className="border-b border-border/40 p-3 bg-secondary/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            <PiMagnifyingGlass className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold tracking-tight">Deep Research</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/40">Powered by Exa</span>
                </div>
                
                {/* Sources Strip */}
                <div className="flex gap-2 p-3 overflow-hidden border-b border-border/40 bg-secondary/5">
                     <div className="flex-shrink-0 w-24 h-14 bg-background border border-border/40 rounded-lg p-2 flex flex-col justify-between">
                        <div className="w-4 h-4 rounded bg-orange-500/10" />
                        <div className="h-1.5 w-12 bg-secondary rounded-full" />
                     </div>
                     <div className="flex-shrink-0 w-24 h-14 bg-background border border-border/40 rounded-lg p-2 flex flex-col justify-between">
                        <div className="w-4 h-4 rounded bg-blue-500/10" />
                        <div className="h-1.5 w-16 bg-secondary rounded-full" />
                     </div>
                     <div className="flex-shrink-0 w-24 h-14 bg-background border border-border/40 rounded-lg p-2 flex flex-col justify-between">
                        <div className="w-4 h-4 rounded bg-green-500/10" />
                        <div className="h-1.5 w-10 bg-secondary rounded-full" />
                     </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                    <div className="flex gap-1.5">
                        <span className="text-[10px] bg-secondary px-1 rounded text-muted-foreground font-mono inline-block">1</span>
                        <div className="space-y-1.5 flex-1">
                            <div className="h-2 w-full bg-foreground/10 rounded-full" />
                            <div className="h-2 w-[95%] bg-foreground/10 rounded-full" />
                            <div className="h-2 w-[85%] bg-foreground/10 rounded-full" />
                        </div>
                    </div>
                     <div className="flex gap-1.5 pt-1">
                        <span className="text-[10px] bg-secondary px-1 rounded text-muted-foreground font-mono inline-block">2</span>
                        <div className="space-y-1.5 flex-1">
                            <div className="h-2 w-full bg-foreground/10 rounded-full" />
                            <div className="h-2 w-[60%] bg-foreground/10 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-6">
                <h3 className="text-lg font-bold font-display tracking-tight mb-1">Deep Research</h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mx-auto">
                Executive summaries aggregated from the live web. Cited and verified.
                </p>
            </div>
          </motion.div>

          {/* Card 2: Wiki (Spans top right 2 cols) */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
             className="md:col-span-2 bg-secondary/30 rounded-2xl p-6 border border-border/50 flex flex-col items-center justify-center min-h-[320px] text-center"
          >
             {/* Visual: Wiki Layout */}
             <div className="bg-background shadow-sm rounded-lg w-full max-w-[200px] border border-border/40 aspect-[4/5] p-3 flex gap-3 mb-5 overflow-hidden">
                {/* Sidebar */}
                <div className="w-8 flex-shrink-0 space-y-2 pt-1 border-r border-border/40 pr-2">
                    <div className="h-1 w-full bg-primary/20 rounded-full" />
                    <div className="h-1 w-[80%] bg-muted rounded-full" />
                    <div className="h-1 w-[60%] bg-muted rounded-full" />
                    <div className="h-1 w-[70%] bg-muted rounded-full" />
                </div>
                {/* Main */}
                <div className="flex-1 space-y-2">
                    <div className="h-24 w-full bg-secondary/30 rounded-md mb-2" />
                    <div className="h-2 w-[70%] bg-foreground/10 rounded-full mb-2" />
                    <div className="space-y-1">
                        <div className="h-1.5 w-full bg-muted rounded-full" />
                        <div className="h-1.5 w-full bg-muted rounded-full" />
                        <div className="h-1.5 w-[90%] bg-muted rounded-full" />
                    </div>
                </div>
             </div>

            <h3 className="text-lg font-bold font-display tracking-tight mb-1">Instant Wiki</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
               Full Wikipedia-style articles generated for any niche topic.
            </p>
          </motion.div>

          {/* Row 2 */}

          {/* Card 3: Timeline (Spans bottom left 2 cols) */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="md:col-span-2 bg-secondary/30 rounded-2xl p-6 border border-border/50 flex flex-col items-center justify-center min-h-[320px] text-center relative overflow-hidden"
          >
            {/* Visual: Timeline */}
            <div className="w-full max-w-[200px] relative mb-5 flex flex-col gap-4">
                 {/* Event 1 */}
                 <div className="flex gap-3 items-start opacity-40">
                    <div className="flex flex-col items-center gap-1">
                         <div className="w-2 h-2 rounded-full border border-foreground/50" />
                         <div className="w-px h-6 bg-border" />
                    </div>
                    <div className="pt-0.5 text-left">
                        <div className="h-1.5 w-12 bg-muted-foreground/40 rounded-full mb-1" />
                        <div className="h-1 w-20 bg-muted/40 rounded-full" />
                    </div>
                 </div>
                 {/* Event 2 (Active) */}
                 <div className="flex gap-3 items-start">
                    <div className="flex flex-col items-center gap-1">
                         <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_-2px_var(--primary)]" />
                         <div className="w-px h-8 bg-gradient-to-b from-primary/50 to-transparent" />
                    </div>
                    <div className="pt-0.5 text-left">
                        <div className="h-2 w-16 bg-foreground/80 rounded-full mb-1.5" />
                        <div className="h-1.5 w-28 bg-muted-foreground/60 rounded-full" />
                    </div>
                 </div>
                 {/* Event 3 */}
                 <div className="flex gap-3 items-start opacity-40">
                    <div className="flex flex-col items-center gap-1">
                         <div className="w-2 h-2 rounded-full border border-foreground/50" />
                    </div>
                    <div className="pt-0.5 text-left">
                        <div className="h-1.5 w-10 bg-muted-foreground/40 rounded-full" />
                    </div>
                 </div>
            </div>

            <h3 className="text-lg font-bold font-display tracking-tight mb-1">Live Timeline</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Visual chronology of any event or history topic.
            </p>
          </motion.div>

          {/* Card 4: Study (Spans bottom middle 2 cols) */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="md:col-span-2 bg-secondary/30 rounded-2xl p-6 border border-border/50 flex flex-col items-center justify-center min-h-[320px] text-center relative overflow-hidden"
          >
             {/* Visual: Flashcard/Quiz */}
             <div className="relative z-10 w-full max-w-[180px] h-[120px] mb-5">
                 {/* Back card */}
                 <div className="absolute top-2 left-2 right-[-8px] bottom-[-8px] bg-background/50 border border-border/30 rounded-xl" />
                 {/* Main card */}
                 <div className="absolute inset-0 bg-background border border-border/60 rounded-xl shadow-sm p-4 flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                         <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Flashcard</span>
                         <PiGraduationCap className="h-3 w-3 text-indigo-500" />
                     </div>
                     <div className="text-left">
                         <div className="h-1.5 w-full bg-foreground/10 rounded-full mb-1.5" />
                         <div className="h-1.5 w-[80%] bg-foreground/10 rounded-full" />
                     </div>
                     <div className="flex gap-2">
                         <div className="h-4 flex-1 bg-secondary rounded-md" />
                         <div className="h-4 flex-1 bg-secondary rounded-md" />
                     </div>
                 </div>
             </div>

            <h3 className="text-lg font-bold font-display tracking-tight mb-1">Study Mode</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
               Quizzes, flashcards, and structured courses on demand.
            </p>
          </motion.div>

          {/* Card 5: Finance (Spans bottom right 2 cols) */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="md:col-span-2 bg-secondary/30 rounded-2xl p-6 border border-border/50 flex flex-col items-center justify-center min-h-[320px] text-center relative overflow-hidden"
          >
             {/* Visual: Chart */}
             <div className="bg-background shadow-sm rounded-xl p-4 mb-5 w-full max-w-[200px] border border-border/40 relative z-10 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                       <div className="flex flex-col items-start">
                           <span className="text-xl font-bold tracking-tighter tabular-nums">$182.43</span>
                           <span className="text-[10px] text-green-500 font-medium">+1.24% (Today)</span>
                       </div>
                       <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                           <PiTrendUp className="h-3.5 w-3.5" />
                       </div>
                  </div>
                  {/* Fake sparkline */}
                  <div className="w-full h-10 flex items-end gap-1 overflow-hidden">
                       {[40, 60, 45, 70, 65, 85, 80, 95, 90, 100].map((h, i) => (
                           <div key={i} className="flex-1 bg-primary/20 rounded-t-[1px] hover:bg-green-500 transition-colors" style={{ height: `${h}%` }} />
                       ))}
                  </div>
             </div>

            <h3 className="text-lg font-bold font-display tracking-tight mb-1">Market Insights</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
               Real-time data aggregation and news summaries.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
