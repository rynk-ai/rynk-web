"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PiArrowsClockwise, PiCopy, PiCheck, PiTextAa } from "react-icons/pi";
import { cn } from "@/lib/utils";

type ParaphraseMode = 'standard' | 'fluency' | 'formal' | 'simple' | 'creative';

type ParaphraseResult = {
  paraphrased: string;
  changes: number;
  mode: ParaphraseMode;
};

const MODES: { id: ParaphraseMode; label: string; description: string }[] = [
  { id: 'standard', label: 'Standard', description: 'Balanced rewriting' },
  { id: 'fluency', label: 'Fluency', description: 'Improve readability' },
  { id: 'formal', label: 'Formal', description: 'Professional tone' },
  { id: 'simple', label: 'Simple', description: 'Easy to understand' },
  { id: 'creative', label: 'Creative', description: 'More engaging' },
];

export default function ParaphraserPage() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<ParaphraseMode>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ParaphraseResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleParaphrase = async () => {
    if (!text.trim() || text.trim().length < 20) {
      toast.error("Please enter at least 20 characters to paraphrase.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/paraphraser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode }),
      });

      const data = await response.json() as { result?: ParaphraseResult; error?: string };

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please sign in for more credits.");
        } else {
          toast.error(data.error || "Paraphrasing failed");
        }
        return;
      }

      setResult(data.result ?? null);
    } catch (error) {
      toast.error("An error occurred during paraphrasing");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (result?.paraphrased) {
      navigator.clipboard.writeText(result.paraphrased);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ToolLayout toolId="paraphraser">
      <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-full mb-2">
            <PiArrowsClockwise className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Paraphrasing Tool
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Rewrite text in different styles while preserving the original meaning.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex flex-wrap justify-center gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                mode === m.id
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-card border border-border hover:border-emerald-500/50 text-foreground/70 hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Input/Output Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Input */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/20">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PiTextAa className="h-4 w-4" />
                Original Text
              </span>
              <span className="text-xs text-muted-foreground">
                {text.length} chars
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to paraphrase (minimum 20 characters)..."
              className="w-full min-h-[250px] bg-transparent px-4 py-3 outline-none text-foreground placeholder:text-muted-foreground/50 resize-none"
            />
          </div>

          {/* Output */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/20">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PiArrowsClockwise className="h-4 w-4" />
                Paraphrased
              </span>
              {result && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <PiCheck className="h-3.5 w-3.5" /> : <PiCopy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            <div className="w-full min-h-[250px] px-4 py-3">
              {isProcessing ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-6 w-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-sm">Paraphrasing...</span>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-3">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {result.paraphrased}
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md font-medium">
                      {result.changes}% changed
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {result.mode} mode
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground/50 italic">
                  Paraphrased text will appear here...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button 
            onClick={handleParaphrase} 
            disabled={isProcessing || text.trim().length < 20}
            className="min-w-[200px] h-[48px] rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Paraphrasing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <PiArrowsClockwise className="h-5 w-5" />
                <span>Paraphrase Text</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </ToolLayout>
  );
}
