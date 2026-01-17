"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { ConversionBanner } from "@/components/tools/conversion-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PiFire, PiLightning, PiShieldWarning, PiXCircle, PiTrendUp } from "react-icons/pi";
import { RoastResult } from "@/lib/services/tools/landing-roaster";
import { cn } from "@/lib/utils";

export default function LandingRoasterPage() {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);

  const handleRoast = async () => {
    if (!url.includes(".")) {
      toast.error("Please enter a valid URL.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/landing-roaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json() as { result?: RoastResult; error?: string };

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Daily roast limit reached.");
        } else {
          toast.error(data.error || "Roast failed");
        }
        return;
      }

      setResult(data.result || null);
    } catch (error) {
      toast.error("An error occurred. The roaster broke.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout toolId="landing-roaster">
      <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
        {/* Header - Fiery & Brutal */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center p-4 bg-orange-500/10 rounded-full mb-2 shadow-sm ring-1 ring-orange-500/20">
            <PiFire className="h-10 w-10 text-orange-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground font-mono">
            Landing Page Roaster
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg font-light">
            Brutal, data-driven audits. We don&apos;t sugarcoat your bad conversion rates.
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto w-full">
            <Input 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. https://yoursaas.com"
              className="font-mono text-base h-12 shadow-sm"
              disabled={isProcessing}
            />
            <Button 
                onClick={handleRoast} 
                disabled={isProcessing || !url}
                className="h-12 px-8 bg-orange-600 hover:bg-orange-700 text-white font-bold tracking-wide shadow-md"
            >
                {isProcessing ? "Roasting..." : "Roast It"}
            </Button>
        </div>

        {/* Results Area */}
        {result ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Score Card */}
                <div className="md:col-span-1 bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Conversion Score</h3>
                    <div className={cn(
                        "text-6xl font-black tabular-nums tracking-tighter mb-2",
                        result.score > 80 ? "text-green-500" : (result.score > 50 ? "text-amber-500" : "text-red-500")
                    )}>
                        {result.score}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                        {result.score > 80 ? "Solid." : (result.score > 50 ? "Mediocre." : "Disaster.")}
                    </p>
                </div>

                {/* The Roast */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-zinc-950 text-zinc-50 border border-zinc-800 rounded-xl p-6 shadow-lg">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-orange-500 mb-2 flex items-center gap-2">
                             The Brutal Truth
                        </h3>
                        <p className="text-lg font-sans leading-relaxed text-zinc-200">
                            "{result.brutalTruth}"
                        </p>
                    </div>

                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                         <h3 className="text-sm font-bold uppercase tracking-widest text-orange-600 mb-2">Headline Check</h3>
                         <p className="font-mono text-sm text-muted-foreground">{result.headlineCritique}</p>
                    </div>

                    <div className="space-y-3">
                         <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <PiLightning className="text-yellow-500" /> Actionable Fixes
                         </h3>
                         {result.fixes.map((fix, idx) => (
                             <div key={idx} className="bg-card/50 border rounded-lg p-4 flex gap-4">
                                 <div className="shrink-0 mt-1">
                                     <PiXCircle className="text-red-500 w-5 h-5" />
                                 </div>
                                 <div className="space-y-1">
                                     <p className="font-medium text-sm text-red-900 dark:text-red-200">{fix.issue}</p>
                                     <p className="text-sm text-muted-foreground flex items-center gap-1">
                                         <PiTrendUp className="text-green-500 w-4 h-4" /> 
                                         <span className="text-green-700 dark:text-green-300 font-medium">Fix:</span> {fix.fix}
                                     </p>
                                 </div>
                             </div>
                         ))}
                    </div>
                    
                    <ConversionBanner toolName="Landing Page Roaster" />
                </div>
            </div>
        ) : (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
                 <PiShieldWarning className="w-16 h-16" />
                 <p className="text-lg">Enter a URL to expose your conversion killers.</p>
            </div>
        )}

      </div>
    </ToolLayout>
  );
}
