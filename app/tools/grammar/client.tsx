"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PiTextAa, PiCopy, PiCheck, PiCheckCircle, PiWarningCircle } from "react-icons/pi";
import { cn } from "@/lib/utils";

type GrammarTone = 'neutral' | 'professional' | 'casual' | 'academic';

type GrammarResult = {
  corrected: string;
  issues: {
    type: 'grammar' | 'spelling' | 'punctuation' | 'style' | 'clarity';
    original: string;
    correction: string;
    explanation: string;
  }[];
  score: number;
  tone: GrammarTone;
};

const TONES: { id: GrammarTone; label: string }[] = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'academic', label: 'Academic' },
];

const ISSUE_COLORS: Record<string, string> = {
  grammar: 'bg-red-500/10 text-red-600 dark:text-red-400',
  spelling: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  punctuation: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  clarity: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

export default function GrammarClient() {
  const [text, setText] = useState("");
  const [tone, setTone] = useState<GrammarTone>('neutral');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<GrammarResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCheck = async () => {
    if (!text.trim() || text.trim().length < 10) {
      toast.error("Please enter at least 10 characters to check.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tone }),
      });

      const data = await response.json() as { result?: GrammarResult; error?: string };

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please sign in for more credits.");
        } else {
          toast.error(data.error || "Grammar check failed");
        }
        return;
      }

      setResult(data.result ?? null);
    } catch (error) {
      toast.error("An error occurred during grammar check");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (result?.corrected) {
      navigator.clipboard.writeText(result.corrected);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <ToolLayout toolId="grammar">
      <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-full mb-2">
            <PiTextAa className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Grammar Polisher
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Fix grammar, spelling, and punctuation with detailed explanations.
          </p>
        </div>

        {/* Tone Selector */}
        <div className="flex flex-wrap justify-center gap-2">
          {TONES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tone === t.id
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                  : "bg-card border border-border hover:border-amber-500/50 text-foreground/70 hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Input Section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/20">
            <span className="text-sm font-medium text-muted-foreground">
              Your Text
            </span>
            <span className="text-xs text-muted-foreground">
              {text.length} chars
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to check for grammar and style issues..."
            className="w-full min-h-[180px] bg-transparent px-4 py-3 outline-none text-foreground placeholder:text-muted-foreground/50 resize-none"
          />
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button 
            onClick={handleCheck} 
            disabled={isProcessing || text.trim().length < 10}
            className="min-w-[200px] h-[48px] rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white border-0 shadow-lg shadow-amber-500/20"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Checking...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <PiCheckCircle className="h-5 w-5" />
                <span>Check Grammar</span>
              </div>
            )}
          </Button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Score & Corrected Text */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/20">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Corrected Text</span>
                  <span className={cn("text-lg font-bold", getScoreColor(result.score))}>
                    {result.score}/100
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <PiCheck className="h-3.5 w-3.5" /> : <PiCopy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="px-4 py-4">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {result.corrected}
                </p>
              </div>
            </div>

            {/* Issues List */}
            {result.issues && result.issues.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground px-1">
                  Issues Found ({result.issues.length})
                </h3>
                <div className="grid gap-2">
                  {result.issues.map((issue, i) => (
                    <div 
                      key={i}
                      className="p-3 bg-card border border-border rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                          ISSUE_COLORS[issue.type] || 'bg-gray-500/10 text-gray-500'
                        )}>
                          {issue.type}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="line-through text-red-500/70">{issue.original}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">{issue.correction}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{issue.explanation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600 dark:text-green-400">
                <PiCheckCircle className="h-5 w-5" />
                <span className="font-medium">Perfect! No issues found.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
