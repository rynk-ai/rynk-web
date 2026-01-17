"use client";

import { useState, useMemo } from "react";
import { ToolLayout } from "@/components/tools/tool-layout";
import { PiHash, PiTextAa, PiClock, PiParagraph, PiTextAlignLeft } from "react-icons/pi";
import { cn } from "@/lib/utils";

export default function WordCounterPage() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const trimmed = text.trim();
    
    // Words: split by whitespace, filter empties
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
    
    // Characters
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    
    // Sentences: split by . ! ? (simplified)
    const sentences = trimmed ? trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0) : [];
    
    // Paragraphs: split by double newlines or more
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0) : [];
    
    // Reading time: ~200 words per minute
    const readingTimeMinutes = Math.ceil(words.length / 200);
    
    // Speaking time: ~150 words per minute
    const speakingTimeMinutes = Math.ceil(words.length / 150);
    
    // Average word length
    const avgWordLength = words.length > 0 
      ? (words.reduce((sum, w) => sum + w.length, 0) / words.length).toFixed(1)
      : 0;

    return {
      words: words.length,
      characters,
      charactersNoSpaces,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      readingTime: readingTimeMinutes,
      speakingTime: speakingTimeMinutes,
      avgWordLength,
    };
  }, [text]);

  const statCards = [
    { label: "Words", value: stats.words, icon: <PiTextAa className="h-5 w-5" />, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Characters", value: stats.characters, icon: <PiHash className="h-5 w-5" />, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "No Spaces", value: stats.charactersNoSpaces, icon: <PiHash className="h-5 w-5" />, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Sentences", value: stats.sentences, icon: <PiTextAlignLeft className="h-5 w-5" />, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Paragraphs", value: stats.paragraphs, icon: <PiParagraph className="h-5 w-5" />, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Reading Time", value: `${stats.readingTime} min`, icon: <PiClock className="h-5 w-5" />, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <ToolLayout toolId="word-counter">
      <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-full mb-2">
            <PiHash className="h-8 w-8 text-blue-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Word Counter
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Count words, characters, sentences, and estimate reading time instantly.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((stat) => (
            <div 
              key={stat.label}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card",
                "transition-all hover:shadow-md"
              )}
            >
              <div className={cn("p-2 rounded-lg mb-2", stat.bg, stat.color)}>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Input Section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/20">
            <span className="text-sm font-medium text-muted-foreground">
              Your Text
            </span>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Avg word: {stats.avgWordLength} chars</span>
              <span>Speaking: ~{stats.speakingTime} min</span>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing or paste your text here..."
            className="w-full min-h-[300px] bg-transparent px-4 py-3 outline-none text-foreground placeholder:text-muted-foreground/50 resize-none"
            autoFocus
          />
        </div>

        {/* Keyboard Shortcut Hint */}
        <p className="text-center text-xs text-muted-foreground">
          Tip: Paste with <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono">⌘V</kbd> or <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono">Ctrl+V</kbd>
        </p>
      </div>
    </ToolLayout>
  );
}
