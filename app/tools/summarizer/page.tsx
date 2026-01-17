"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PiTextAlignLeft, PiCopy, PiCheck, PiListBullets, PiListNumbers, PiParagraph } from "react-icons/pi";
import { cn } from "@/lib/utils";

type SummaryLength = 'brief' | 'standard' | 'detailed';
type SummaryFormat = 'paragraph' | 'bullets' | 'numbered';

type SummaryResult = {
  summary: string;
  originalWordCount: number;
  summaryWordCount: number;
  compressionRatio: number;
};

const LENGTHS: { id: SummaryLength; label: string }[] = [
  { id: 'brief', label: 'Brief' },
  { id: 'standard', label: 'Standard' },
  { id: 'detailed', label: 'Detailed' },
];

const FORMATS: { id: SummaryFormat; label: string; icon: React.ReactNode }[] = [
  { id: 'paragraph', label: 'Paragraph', icon: <PiParagraph className="h-4 w-4" /> },
  { id: 'bullets', label: 'Bullets', icon: <PiListBullets className="h-4 w-4" /> },
  { id: 'numbered', label: 'Numbered', icon: <PiListNumbers className="h-4 w-4" /> },
];

export default function SummarizerPage() {
  const [text, setText] = useState("");
  const [length, setLength] = useState<SummaryLength>('standard');
  const [format, setFormat] = useState<SummaryFormat>('paragraph');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSummarize = async () => {
    if (!text.trim() || text.trim().length < 50) {
      toast.error("Please enter at least 50 characters to summarize.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/summarizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, length, format }),
      });

      const data = await response.json() as { result?: SummaryResult; error?: string };

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please sign in for more credits.");
        } else {
          toast.error(data.error || "Summarization failed");
        }
        return;
      }

      setResult(data.result ?? null);
    } catch (error) {
      toast.error("An error occurred during summarization");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (result?.summary) {
      navigator.clipboard.writeText(result.summary);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <ToolLayout toolId="summarizer">
      <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-full mb-2">
            <PiTextAlignLeft className="h-8 w-8 text-blue-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Text Summarizer
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Condense long articles and documents into clear, concise summaries.
          </p>
        </div>

        {/* Options Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Length Selector */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {LENGTHS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLength(l.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  length === l.id
                    ? "bg-blue-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Format Selector */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  format === f.id
                    ? "bg-blue-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.icon}
                <span className="hidden sm:inline">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/20">
            <span className="text-sm font-medium text-muted-foreground">
              Original Text
            </span>
            <span className="text-xs text-muted-foreground">
              {wordCount} words
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the text you want to summarize (minimum 50 characters)..."
            className="w-full min-h-[200px] bg-transparent px-4 py-3 outline-none text-foreground placeholder:text-muted-foreground/50 resize-none"
          />
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button 
            onClick={handleSummarize} 
            disabled={isProcessing || text.trim().length < 50}
            className="min-w-[200px] h-[48px] rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white border-0 shadow-lg shadow-blue-500/20"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Summarizing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <PiTextAlignLeft className="h-5 w-5" />
                <span>Summarize</span>
              </div>
            )}
          </Button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-card border border-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/20">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Summary</span>
                <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md font-medium">
                  {result.compressionRatio}% shorter
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
                {result.summary}
              </p>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                <span>Original: {result.originalWordCount} words</span>
                <span>Summary: {result.summaryWordCount} words</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
