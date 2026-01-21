"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PiPencilSimple, PiCopy, PiCheck, PiSparkle } from "react-icons/pi";
import { cn } from "@/lib/utils";

type TitleStyle = 'viral' | 'professional' | 'curiosity' | 'how-to' | 'listicle';

type TitleResult = {
  titles: {
    title: string;
    style: string;
    hook: string;
  }[];
};

const STYLES: { id: TitleStyle; label: string; emoji: string }[] = [
  { id: 'viral', label: 'Viral', emoji: '🔥' },
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'curiosity', label: 'Curiosity', emoji: '🤔' },
  { id: 'how-to', label: 'How-To', emoji: '📖' },
  { id: 'listicle', label: 'Listicle', emoji: '📝' },
];

export default function BlogTitleClient() {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<TitleStyle>('viral');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TitleResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim() || topic.trim().length < 3) {
      toast.error("Please enter a topic (at least 3 characters).");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/blog-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, style }),
      });

      const data = await response.json() as { result?: TitleResult; error?: string };

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please sign in for more credits.");
        } else {
          toast.error(data.error || "Generation failed");
        }
        return;
      }

      setResult(data.result ?? null);
    } catch (error) {
      toast.error("An error occurred during generation");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (title: string, index: number) => {
    navigator.clipboard.writeText(title);
    setCopiedIndex(index);
    toast.success("Title copied!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <ToolLayout toolId="blog-title">
      <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-orange-500/10 rounded-full mb-2">
            <PiPencilSimple className="h-8 w-8 text-orange-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Blog Title Generator
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Generate click-worthy blog titles that drive traffic.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-card border border-border rounded-xl p-1 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-2 p-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your blog topic (e.g. 'remote work productivity')"
              className="flex-1 bg-transparent px-4 py-3 outline-none text-foreground placeholder:text-muted-foreground/50"
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <Button 
              onClick={handleGenerate} 
              disabled={isProcessing || topic.trim().length < 3}
              className="min-w-[140px] h-[48px] rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <PiSparkle className="h-5 w-5" />
                  <span>Generate</span>
                </div>
              )}
            </Button>
          </div>

          {/* Style Selector */}
          <div className="flex flex-wrap justify-center gap-2 px-4 py-3 border-t border-border/50">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                  style === s.id
                    ? "bg-orange-500 text-white"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Section */}
        {result && result.titles && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-medium text-sm text-muted-foreground px-1">
              Generated Titles ({result.titles.length})
            </h3>
            <div className="grid gap-2">
              {result.titles.map((item, i) => (
                <div 
                  key={i}
                  className="group flex items-start justify-between gap-3 p-4 bg-card border border-border rounded-xl hover:border-orange-500/30 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleCopy(item.title, i)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground group-hover:text-orange-500 transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded text-muted-foreground">
                        {item.style}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.hook}
                      </span>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
                    {copiedIndex === i ? (
                      <PiCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <PiCopy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
