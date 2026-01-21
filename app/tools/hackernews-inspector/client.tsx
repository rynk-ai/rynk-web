"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { ConversionBanner } from "@/components/tools/conversion-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PiArrowRight, PiChatTeardropText, PiArrowUpRight } from "react-icons/pi";
import { HNInspectorResult } from "@/lib/services/tools/hn-inspector";
import { cn } from "@/lib/utils";

export default function HNInspectorClient() {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<HNInspectorResult | null>(null);

  const handleInspect = async () => {
    if (query.length < 2) {
      toast.error("Please enter a search topic.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/hn-inspector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await response.json() as { result?: HNInspectorResult; error?: string };

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Daily limit reached.");
        } else {
          toast.error(data.error || "Inspection failed");
        }
        return;
      }

      setResult(data.result || null);
    } catch (error) {
      toast.error("An error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout toolId="hn-inspector">
      <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full px-4">
        {/* Minimal Header */}
        <div className="space-y-4 pt-8 pb-4 border-b">
          <h1 className="text-3xl font-bold tracking-tight font-mono flex items-center gap-3">
            <PiChatTeardropText className="h-8 w-8 text-orange-600" />
            HN Consensus
          </h1>
          <p className="text-muted-foreground font-light max-w-xl">
            Query the hivemind. Summarizes sentiment and arguments from top HackerNews threads.
          </p>
        </div>

        {/* Input - Clean & Industrial */}
        <div className="flex flex-col sm:flex-row gap-3">
            <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Topic (e.g. 'DeepSeek vs OpenAI')"
                className="font-mono text-base h-12 rounded-none border-x-0 border-t-0 border-b-2 focus-visible:ring-0 focus-visible:border-orange-500 bg-transparent px-0"
                disabled={isProcessing}
                onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
            />
            <Button 
                onClick={handleInspect} 
                disabled={isProcessing || !query}
                className="h-12 px-6 rounded-none bg-foreground text-background hover:bg-muted-foreground font-mono"
            >
                {isProcessing ? "SCANNING..." : "ANALYZE"}
                {!isProcessing && <PiArrowRight className="ml-2" />}
            </Button>
        </div>

        {/* Results - Research Paper Style */}
        {result ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                
                {/* 1. Abstract / Summary */}
                <section>
                    <div className="flex items-baseline justify-between mb-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Abstract</h2>
                        <span className="font-mono text-xs text-muted-foreground">{result.storyCount} discussions scanned</span>
                    </div>
                    <div className="pl-4 border-l-2 border-orange-500">
                        <p className="text-xl leading-relaxed text-foreground">
                            {result.summary}
                        </p>
                    </div>
                </section>

                {/* 2. Key Arguments Grid */}
                <section>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">Key Arguments</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        {result.keyArguments.map((arg, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase px-1.5 py-0.5 border rounded-sm font-mono",
                                        arg.stance === "Pro" ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" :
                                        arg.stance === "Con" ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" :
                                        "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                                    )}>
                                        {arg.stance}
                                    </span>
                                </div>
                                <p className="text-base text-foreground/90 leading-snug">
                                    {arg.argument}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. Citations / Sources */}
                <section className="bg-muted/30 p-6 rounded-sm">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Sources</h2>
                    <ul className="space-y-3">
                        {result.topStories.map((story, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm font-mono">
                                <span className="text-muted-foreground select-none">[{idx + 1}]</span>
                                <a 
                                    href={story.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="hover:underline flex items-center gap-1 text-foreground/80 hover:text-orange-600 transition-colors"
                                >
                                    {story.title}
                                    <PiArrowUpRight className="w-3 h-3 text-muted-foreground" />
                                </a>
                                <span className="text-muted-foreground text-xs">({story.points} pts)</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <ConversionBanner toolName="HN Sentiment Inspector" />
            </div>
        ) : (
            <div className="py-20 text-center">
                 <p className="font-mono text-sm text-muted-foreground">Ready to query the index.</p>
            </div>
        )}

      </div>
    </ToolLayout>
  );
}
