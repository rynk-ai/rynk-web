"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PiYoutubeLogo, PiTrendUp, PiLightbulb, PiMagicWand, PiCheckCircle } from "react-icons/pi";

export default function YouTubeGeneratorClient() {
  const [niche, setNiche] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!niche.trim()) return;

    setIsProcessing(true);
    setStatus("Initializing research agent...");
    setResult(null);

    try {
      const response = await fetch("/api/tools/youtube-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche }),
      });

      if (!response.ok) {
        if (response.status === 429) {
            toast.error("Rate limit exceeded. Please sign in for more credits.");
        } else {
            toast.error("Failed to start research");
        }
        setIsProcessing(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "status") {
              setStatus(data.message);
            } else if (data.type === "result") {
              setResult(data.data);
            } else if (data.type === "error") {
              toast.error(data.message);
            }
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsProcessing(false);
      setStatus("");
    }
  };

  return (
    <ToolLayout toolId="youtube-research">
      <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full mb-2">
            <PiYoutubeLogo className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Viral Title Generator
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Deep research into your niche to generate scientifically proven viral titles.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-card border border-border rounded-xl p-1 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-2 p-2">
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Enter your niche (e.g. 'Vegan Meal Prep', 'Indie Hacking')"
              className="flex-1 bg-transparent px-4 py-3 outline-none text-foreground placeholder:text-muted-foreground/50"
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <Button 
              onClick={handleGenerate} 
              disabled={isProcessing || !niche.trim()}
              className="min-w-[140px] h-[48px] rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white border-0 shadow-lg shadow-red-500/20"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Researching...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <PiMagicWand className="h-5 w-5" />
                  <span>Generate</span>
                </div>
              )}
            </Button>
          </div>
          
          {/* Status Bar */}
          {isProcessing && (
            <div className="px-4 py-3 border-t border-border/50 bg-secondary/20 flex items-center gap-3 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-1">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </div>
              {status}
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-5">
                <h3 className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400 mb-3">
                  <PiLightbulb className="h-5 w-5" />
                  Request & Gaps
                </h3>
                <ul className="space-y-2">
                  {result.insights.content_gaps.slice(0, 3).map((gap: string, i: number) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500/50 flex-shrink-0" />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-xl p-5">
                <h3 className="flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400 mb-3">
                  <PiTrendUp className="h-5 w-5" />
                  Viral Hooks
                </h3>
                 <ul className="space-y-2">
                  {result.insights.viral_hooks.slice(0, 3).map((hook: string, i: number) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500/50 flex-shrink-0" />
                      {hook}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Titles List */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold px-1">Generated Titles</h2>
              {result.titles.map((item: any, i: number) => (
                <div 
                  key={i}
                  className="group bg-card hover:bg-accent/5 border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:border-accent/30 cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(item.title);
                    toast.success("Title copied!");
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg leading-tight group-hover:text-red-500 transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="bg-secondary px-2 py-0.5 rounded-md text-foreground/70">
                          {item.strategy}
                        </span>
                        <span>
                          Score: <span className="text-green-600 font-medium">{item.score}/100</span>
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0"
                    >
                      <PiCheckCircle className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
