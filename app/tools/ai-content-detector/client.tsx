"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { ConversionBanner } from "@/components/tools/conversion-banner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PiRobot, PiUser, PiWarningCircle, PiCheckCircle, PiSparkle } from "react-icons/pi";
import { cn } from "@/lib/utils";

type DetectionResult = {
  verdict: 'human' | 'ai' | 'mixed';
  confidence: number;
  analysis: string;
  signals: {
    type: string;
    description: string;
    weight: 'strong' | 'moderate' | 'weak';
  }[];
};

export default function AIDetectorClient() {
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim() || text.trim().length < 50) {
      toast.error("Please enter at least 50 characters to analyze.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/ai-detector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json() as { result?: DetectionResult; error?: string };

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please sign in for more credits.");
        } else {
          toast.error(data.error || "Analysis failed");
        }
        return;
      }

      setResult(data.result ?? null);
    } catch (error) {
      toast.error("An error occurred during analysis");
    } finally {
      setIsProcessing(false);
    }
  };

  const getVerdictDisplay = (verdict: string) => {
    switch (verdict) {
      case 'ai':
        return { 
          icon: <PiRobot className="h-6 w-6" />, 
          label: 'AI Generated', 
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30'
        };
      case 'human':
        return { 
          icon: <PiUser className="h-6 w-6" />, 
          label: 'Human Written', 
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30'
        };
      default:
        return { 
          icon: <PiWarningCircle className="h-6 w-6" />, 
          label: 'Mixed Content', 
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30'
        };
    }
  };

  const getWeightColor = (weight: string) => {
    switch (weight) {
      case 'strong': return 'bg-red-500';
      case 'moderate': return 'bg-amber-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <ToolLayout toolId="ai-detector">
      <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-violet-500/10 rounded-full mb-2">
            <PiSparkle className="h-8 w-8 text-violet-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            AI Content Detector
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Analyze text to determine if it was written by AI or a human.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-card border border-border rounded-xl p-1 shadow-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the text you want to analyze (minimum 50 characters)..."
            className="w-full min-h-[200px] bg-transparent px-4 py-3 outline-none text-foreground placeholder:text-muted-foreground/50 resize-none"
          />
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {text.length} characters
            </span>
            <Button 
              onClick={handleAnalyze} 
              disabled={isProcessing || text.trim().length < 50}
              className="min-w-[140px] h-[44px] rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white border-0 shadow-lg shadow-violet-500/20"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <PiSparkle className="h-5 w-5" />
                  <span>Analyze</span>
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Verdict Card */}
            {(() => {
              const verdict = getVerdictDisplay(result.verdict);
              return (
                <div className={cn(
                  "flex items-center gap-4 p-5 rounded-xl border",
                  verdict.bgColor,
                  verdict.borderColor
                )}>
                  <div className={cn("p-3 rounded-full", verdict.bgColor, verdict.color)}>
                    {verdict.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className={cn("text-xl font-bold", verdict.color)}>
                        {verdict.label}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        ({result.confidence}% confidence)
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.analysis}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Signals */}
            {result.signals && result.signals.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground px-1">
                  Detection Signals
                </h3>
                <div className="grid gap-2">
                  {result.signals.map((signal, i) => (
                    <div 
                      key={i}
                      className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg"
                    >
                      <div className={cn(
                        "h-2 w-2 rounded-full mt-1.5 flex-shrink-0",
                        getWeightColor(signal.weight)
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {signal.type}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            {signal.weight}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 mt-0.5">
                          {signal.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <ConversionBanner />
      </div>
    </ToolLayout>
  );
}
