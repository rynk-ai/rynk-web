"use client";

import { motion } from "motion/react";
import { PiLightning, PiBrain, PiCpu, PiArrowRight } from "react-icons/pi";



export function LandingModelRouting() {
  return (
    <section className="py-24 bg-secondary/20">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            We switch AI models so you don't have to.
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Simple questions route to ultra-fast models. Complex logic routes to deep reasoning models. Automatic and optimized.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          
          {/* Col 1: Feature Text */}
          <div className="bg-secondary/20 rounded-3xl p-8 flex flex-col justify-end min-h-[400px]">
             <div className="mb-auto">
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center mb-6">
                    <PiLightning className="h-6 w-6" />
                </div>
             </div>
             <h3 className="text-2xl font-bold mb-3">Instant Latency. <br/> 800+ Tokens/sec.</h3>
             <p className="text-muted-foreground text-sm leading-relaxed">
                For simple queries, we route to <strong>Ultra-High Speed</strong> models. No waiting for "Thinking..." states when you just need a quick fact.
             </p>
          </div>

          {/* Col 2: The Router Visual (Center) */}
          <div className="bg-secondary/40 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[400px]">
             {/* Decorative Background Grid */}
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
             
             <div className="relative z-10 flex flex-col gap-4 w-full max-w-[240px]">
                {/* Provider Badges - Claude */}
                <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-background shadow-sm border border-border/60 p-4 rounded-xl flex items-center gap-3"
                >
                    <div className="w-8 h-8 rounded-lg bg-[#d97757] text-white flex items-center justify-center">
                        <PiBrain className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-sm">Reasoning Models</span>
                </motion.div>

                {/* Provider Badges - OpenAI */}
                <motion.div 
                    initial={{ x: 50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-background shadow-sm border border-border/60 p-4 rounded-xl flex items-center gap-3"
                >
                    <div className="w-8 h-8 rounded-lg bg-[#10a37f] text-white flex items-center justify-center">
                        <PiCpu className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-sm">Advanced Logic</span>
                </motion.div>

                {/* Provider Badges - Meta */}
                <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-background shadow-sm border border-border/60 p-4 rounded-xl flex items-center gap-3"
                >
                    <div className="w-8 h-8 rounded-lg bg-[#0668E1] text-white flex items-center justify-center">
                        <PiLightning className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-sm">High Speed</span>
                </motion.div>
             </div>
             
             <div className="mt-8 text-center relative z-10">
                <h4 className="font-bold text-lg">Smart Routing</h4>
                <p className="text-xs text-muted-foreground mt-1">Connects to the best model for the job.</p>
             </div>
          </div>

          {/* Col 3: Mockup (Right) */}
          <div className="bg-secondary/20 rounded-3xl p-8 flex flex-col min-h-[400px]">
              <div className="bg-background rounded-2xl p-4 shadow-sm border border-border/50 mb-6 flex-1">
                 <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-secondary" />
                    <div className="bg-secondary/30 rounded-lg p-2 text-xs flex-1">
                        How do I implement a binary search tree in Rust?
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <PiCpu className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">Routing to Logic Mode...</span>
                        </div>
                        <div className="bg-primary/5 rounded-lg p-2 text-xs text-muted-foreground h-20">
                            Here is a safe implementation...
                        </div>
                    </div>
                 </div>
              </div>

             <h3 className="text-2xl font-bold mb-3">Code? Logic? <br/> Routed to Reasoning.</h3>
             <p className="text-muted-foreground text-sm leading-relaxed">
                Complex reasoning, math, and safety-critical tasks are automatically handled by the most capable models available.
             </p>
          </div>

        </div>
      </div>
    </section>
  );
}
