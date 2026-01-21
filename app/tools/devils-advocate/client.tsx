"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { ConversionBanner } from "@/components/tools/conversion-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PiSkull, PiGavel, PiXCircle, PiWarningCircle, PiShieldWarning } from "react-icons/pi";
import { AnalysisResult } from "@/lib/services/tools/devils-advocate";
import { cn } from "@/lib/utils";

export default function DevilsAdvocateClient() {
  const [argument, setArgument] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!argument.trim() || argument.length < 50) {
      toast.error("Please provide a substantial argument (at least 50 chars).");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/devils-advocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ argument }),
      });

      const data = await response.json() as { result?: AnalysisResult; error?: string };

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Daily limit reached. The Advocate rests.");
        } else {
          toast.error(data.error || "Analysis failed");
        }
        return;
      }

      setResult(data.result || null);
    } catch (error) {
      toast.error("An error occurred. The court is adjourned.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout toolId="devils-advocate">
      <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full">
        {/* Header - Dark & Serious Tone */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center p-4 bg-zinc-900 rounded-full mb-2 shadow-2xl ring-1 ring-zinc-800">
            <PiSkull className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground font-mono">
            The Devil&apos;s Advocate
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg font-light italic">
            "I do not seek to be right. I seek to find where you are wrong."
          </p>
        </div>

        {/* Split Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Input (The Proponent) */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[500px] flex flex-col">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-blue-500">I.</span> The Argument
              </h2>
              <Textarea
                value={argument}
                onChange={(e) => setArgument(e.target.value)}
                placeholder="Paste your essay, startup idea, or opinion here for rigorous stress-testing..."
                className="flex-1 text-base resize-none font-mono leading-relaxed p-4 bg-background/50 border-input/50 focus:border-blue-500/50 transition-colors"
              />
              <div className="pt-6 mt-4 border-t border-border/50">
                 <Button 
                    onClick={handleAnalyze} 
                    disabled={isProcessing || argument.length < 50}
                    className="w-full h-14 text-lg font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg transition-transform active:scale-[0.98]"
                  >
                    {isProcessing ? "Summoning the Advocate..." : "Stress Test My Logic"}
                  </Button>
                  <p className="text-xs text-center mt-3 text-muted-foreground">
                    Warning: The feedback will be blunt and purely logical.
                  </p>
              </div>
            </div>
          </div>

          {/* Right Column: Output (The Advocate) */}
          <div className="space-y-6">
             {result ? (
               <div className="bg-zinc-950 text-zinc-50 border border-zinc-800 rounded-xl p-8 shadow-2xl min-h-[500px] animate-in fade-in slide-in-from-right-8 duration-700">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-zinc-900">
                    <h2 className="text-xl font-bold font-mono text-red-500 flex items-center gap-2">
                      <PiGavel className="w-6 h-6" /> II. The Verdict
                    </h2>
                    <div className="flex flex-col items-end">
                      <span className="text-xs uppercase tracking-widest text-zinc-500">Logic Score</span>
                      <span className={cn(
                        "text-3xl font-black tabular-nums",
                        result.score > 80 ? "text-green-500" : (result.score > 50 ? "text-amber-500" : "text-red-600")
                      )}>
                        {result.score}/100
                      </span>
                    </div>
                  </div>

                  <div className="space-y-8">
                     {/* Critique */}
                     <div className="space-y-2">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 border-l-2 border-red-900 pl-3">Critique</h3>
                        <p className="text-lg leading-relaxed font-sans text-zinc-300">
                           {result.critique}
                        </p>
                     </div>

                     {/* Counter Points */}
                     {result.counterPoints.length > 0 && (
                       <div className="space-y-4">
                          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 border-l-2 border-red-900 pl-3">Rebuttals</h3>
                          <ul className="space-y-4">
                            {result.counterPoints.map((cp, idx) => (
                              <li key={idx} className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
                                <p className="font-semibold text-red-400 mb-1">"{cp.point}"</p>
                                <p className="text-zinc-400 text-sm leading-relaxed">{cp.rebuttal}</p>
                              </li>
                            ))}
                          </ul>
                       </div>
                     )}

                     {/* Fallacies */}
                     {result.fallacies.length > 0 && (
                       <div className="space-y-3 pt-4 border-t border-zinc-900">
                          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                             <PiWarningCircle className="text-amber-600" /> Detected Fallacies
                          </h3>
                          <div className="flex flex-wrap gap-2">
                             {result.fallacies.map((f, idx) => (
                               <span key={idx} className="px-3 py-1 bg-red-950/30 text-red-400 border border-red-900/30 rounded text-xs font-mono">
                                 {f}
                               </span>
                             ))}
                          </div>
                       </div>
                     )}
                  </div>
               </div>
             ) : (
               /* Empty State */
               <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-border border-dashed rounded-xl p-8 min-h-[500px] flex flex-col items-center justify-center text-center text-muted-foreground opacity-70">
                  <PiShieldWarning className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium"> The Advocate is waiting.</p>
                  <p className="text-sm max-w-xs mt-2">
                    Submit your argument to receive a comprehensive logical breakdown.
                  </p>
               </div>
             )}
          </div>
        </div>

        <ConversionBanner toolName="The Devil's Advocate" />
      </div>
    </ToolLayout>
  );
}
