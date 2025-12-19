import { motion } from "motion/react";
import { PiMagnifyingGlass, PiClock, PiNewspaper, PiStudent, PiTrendUp, PiBookOpen, PiGraduationCap } from "react-icons/pi";

export function LandingSurfacesGrid() {
  return (
    <section className="py-24">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
             Every answer gets <br/> its own interface.
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
             Why read a paragraph when you can interact? We generate custom UI components based on what you ask.
          </p>
        </div>

        <div className="grid md:grid-cols-6 gap-6 max-w-5xl mx-auto">
          {/* Card 1: Research (Spans top left 4 cols) */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="md:col-span-4 bg-secondary/20 rounded-3xl p-8 border border-border/50 flex flex-col items-center justify-center min-h-[320px] text-center relative overflow-hidden"
          >
            {/* Visual */}
            <div className="bg-background shadow-xl rounded-2xl p-6 mb-6 w-full max-w-[280px] border border-border/40 relative z-10">
                <div className="flex items-center gap-3 mb-4 border-b border-border/30 pb-3">
                    <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                        <PiMagnifyingGlass className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-bold">Deep Research</div>
                        <div className="text-xs text-muted-foreground">Generated in seconds</div>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="h-2 w-full bg-secondary rounded-full" />
                    <div className="h-2 w-[80%] bg-secondary rounded-full" />
                    <div className="h-2 w-[90%] bg-secondary rounded-full" />
                </div>
                <div className="mt-4 flex gap-2">
                   <div className="h-6 px-2 rounded-full bg-green-500/10 text-green-600 text-[10px] flex items-center">Exa.ai</div>
                   <div className="h-6 px-2 rounded-full bg-blue-500/10 text-blue-600 text-[10px] flex items-center">Google</div>
                </div>
            </div>
            
            <h3 className="text-xl font-bold mb-2">Deep Research</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Executive summaries aggregated from the live web. Cited and verified.
            </p>
          </motion.div>

          {/* Card 2: Wiki (Spans top right 2 cols) */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
             className="md:col-span-2 bg-secondary/20 rounded-3xl p-8 border border-border/50 flex flex-col items-center justify-center min-h-[320px] text-center"
          >
             <div className="w-24 h-24 rounded-full bg-background shadow-lg flex items-center justify-center mb-6">
                <PiNewspaper className="h-10 w-10 text-primary" />
             </div>
            <h3 className="text-xl font-bold mb-2">Instant Wiki</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
               Full Wikipedia-style articles generated for any niche topic.
            </p>
          </motion.div>

          {/* Row 2 */}

          {/* Card 3: Timeline (Spans bottom left 2 cols) */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="md:col-span-2 bg-secondary/20 rounded-3xl p-8 border border-border/50 flex flex-col items-center justify-center min-h-[320px] text-center relative overflow-hidden"
          >
            {/* Visual - Simplified Timeline */}
            <div className="w-full max-w-[200px] h-[100px] relative mb-6">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2" />
                <motion.div 
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute top-1/2 left-[10%] -translate-y-1/2 bg-background border border-border p-1.5 rounded-lg shadow-lg flex items-center gap-2"
                >
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </motion.div>
                <motion.div 
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="absolute top-[20%] left-[50%] -translate-y-1/2 bg-background border border-border p-1.5 rounded-lg shadow-lg flex items-center gap-2"
                >
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                </motion.div>
                <motion.div 
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="absolute top-1/2 left-[90%] -translate-y-1/2 bg-background border border-border p-1.5 rounded-lg shadow-lg flex items-center gap-2"
                >
                   <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                </motion.div>
            </div>

            <h3 className="text-xl font-bold mb-2">Live Timeline</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Visual chronology of any event or history topic.
            </p>
          </motion.div>

          {/* Card 4: Study (Spans bottom middle 2 cols) */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="md:col-span-2 bg-secondary/20 rounded-3xl p-8 border border-border/50 flex flex-col items-center justify-center min-h-[320px] text-center relative overflow-hidden"
          >
             {/* Visual - Globe/Map effect */}
             <div className="absolute inset-0 opacity-10">
                 <div className="absolute top-10 right-10 w-40 h-40 border rounded-full" />
             </div>
             
             <div className="relative z-10 bg-background/80 backdrop-blur-md rounded-xl p-4 flex items-center gap-3 mb-6 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                    <PiGraduationCap className="h-4 w-4" />
                </div>
                <div className="text-left">
                    <div className="text-xs font-medium">Study Mode</div>
                </div>
             </div>

            <h3 className="text-xl font-bold mb-2">Study Mode</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
               Quizzes, flashcards, and structured courses on demand.
            </p>
          </motion.div>

          {/* Card 5: Finance (Spans bottom right 2 cols) */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="md:col-span-2 bg-secondary/20 rounded-3xl p-8 border border-border/50 flex flex-col items-center justify-center min-h-[320px] text-center relative overflow-hidden"
          >
             <div className="bg-background shadow-sm rounded-xl p-4 mb-6 w-full max-w-[200px] border border-border/40 relative z-10">
                  <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] text-muted-foreground">AAPL</span>
                       <span className="text-[10px] text-green-500">+1.2%</span>
                  </div>
                  <div className="h-12 w-full bg-secondary/30 rounded-md flex items-end overflow-hidden px-1 pb-1 gap-0.5">
                      <div className="w-1/6 h-[40%] bg-muted-foreground/20 rounded-t-sm" />
                      <div className="w-1/6 h-[60%] bg-muted-foreground/20 rounded-t-sm" />
                      <div className="w-1/6 h-[30%] bg-muted-foreground/20 rounded-t-sm" />
                      <div className="w-1/6 h-[70%] bg-green-500/50 rounded-t-sm" />
                      <div className="w-1/6 h-[50%] bg-green-500/50 rounded-t-sm" />
                      <div className="w-1/6 h-[80%] bg-green-500/50 rounded-t-sm" />
                  </div>
             </div>

            <h3 className="text-xl font-bold mb-2">Market Insights</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
               Real-time data aggregation and news summaries.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
