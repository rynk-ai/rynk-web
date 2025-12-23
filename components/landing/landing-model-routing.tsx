"use client";

import { motion } from "motion/react";
import { PiLightning, PiBrain, PiCpu, PiArrowRight, PiShareNetwork, PiCode, PiFunction } from "react-icons/pi";



export function LandingModelRouting() {
  return (
    <section className="py-16 bg-background">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tighter mb-4 text-foreground">
            We switch AI models so you don't have to.
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Simple questions route to ultra-fast models. Complex logic routes to deep reasoning models. Automatic and optimized.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 max-w-6xl mx-auto items-stretch">
          
          {/* Col 1: Feature Text */}
          <div className="bg-secondary/30 rounded-2xl p-6 flex flex-col justify-end min-h-[360px] border border-border/50 group">
             <div className="mb-auto">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center mb-6">
                    <PiLightning className="h-5 w-5" />
                </div>
             </div>
             <h3 className="text-xl font-bold font-display tracking-tight mb-3">Instant Latency. <br/> 800+ Tokens/sec.</h3>
             <p className="text-muted-foreground text-sm leading-relaxed">
                For simple queries, we route to <strong>Ultra-High Speed</strong> models. No waiting for "Thinking..." states when you just need a quick fact.
             </p>
          </div>

          {/* Col 2: The Router Visual (Center) */}
          <div className="bg-secondary/40 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[360px] border border-border/50">
             {/* Decorative Background Grid */}
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px] opacity-50" />
             
             <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-[240px]">
                
                {/* Center Node */}
                <div className="w-16 h-16 rounded-full bg-background border-2 border-primary/20 shadow-lg flex items-center justify-center relative z-20">
                     <PiShareNetwork className="h-8 w-8 text-primary" />
                     {/* Pulsing rings */}
                     <div className="absolute inset-0 rounded-full border border-primary/10 animate-ping" />
                </div>

                <div className="grid grid-cols-2 gap-4 w-full text-center">
                    {/* Node Left */}
                    <div className="bg-background border border-border/60 p-3 rounded-xl flex flex-col items-center gap-2 shadow-sm">
                         <div className="w-2 h-2 rounded-full bg-green-500" />
                         <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Speed</span>
                         <span className="text-xs font-medium">Llama 3 70B</span>
                    </div>

                    {/* Node Right */}
                    <div className="bg-background border border-border/60 p-3 rounded-xl flex flex-col items-center gap-2 shadow-sm">
                         <div className="w-2 h-2 rounded-full bg-orange-500" />
                         <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Reasoning</span>
                         <span className="text-xs font-medium">Claude 3.5</span>
                    </div>
                </div>
             </div>
             
             <div className="mt-8 text-center relative z-10">
                <h4 className="font-bold text-base tracking-tight mb-1">Smart Routing</h4>
                <p className="text-[10px] text-muted-foreground">Dynamically selects the optimal model path.</p>
             </div>
          </div>

          {/* Col 3: Mockup (Right) */}
          <div className="bg-secondary/30 rounded-2xl p-6 flex flex-col min-h-[360px] border border-border/50 group">
              <div className="bg-background rounded-xl p-0 shadow-sm border border-border/50 mb-6 flex-1 overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-border/30 bg-secondary/5">
                     <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                         <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Routing to Logic Mode</span>
                     </div>
                 </div>
                 
                 <div className="p-4 space-y-4">
                     <div className="flex gap-3">
                         <div className="w-6 h-6 rounded-full bg-secondary flex-shrink-0" />
                         <p className="text-[11px] bg-secondary/30 p-2 rounded-lg text-muted-foreground">
                             Write a Rust function to reverse a binary tree.
                         </p>
                     </div>

                     <div className="flex gap-3">
                         <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                             <PiCpu className="h-3 w-3 text-primary" />
                         </div>
                         <div className="flex-1 space-y-2">
                             <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 font-mono text-[9px] text-neutral-400 overflow-hidden">
                                 <div className="flex gap-2">
                                     <span className="text-purple-400">fn</span>
                                     <span className="text-blue-400">reverse_tree</span>
                                     <span className="text-neutral-500">(</span>
                                     <span className="text-orange-300">node</span>
                                     <span className="text-neutral-500">:</span>
                                     <span className="text-neutral-300">Option</span>
                                     <span className="text-neutral-500">...</span>
                                 </div>
                                 <div className="pl-4 text-green-600/50"> // Recursive safe inversion</div>
                                 <div className="pl-4"> match node {'{'} </div>
                                 <div className="pl-8"> Some(n) ={'>'} ... </div>
                             </div>
                         </div>
                     </div>
                 </div>
              </div>

             <h3 className="text-xl font-bold font-display tracking-tight mb-3">Code? Logic? <br/> Routed to Reasoning.</h3>
             <p className="text-muted-foreground text-sm leading-relaxed">
                Complex reasoning, math, and safety-critical tasks are automatically handled by the most capable models available.
             </p>
          </div>

        </div>
      </div>
    </section>
  );
}
