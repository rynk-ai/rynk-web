"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import {
  Lightbulb,
  Pencil,
  Search,
  Code,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export interface SuggestionItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  prompt: string;
}

interface EmptyStateChatProps {
  brandName?: string;
  suggestions?: SuggestionItem[];
  recentPrompts?: string[];
  onSelectSuggestion?: (prompt: string) => void;
  onSelectRecent?: (prompt: string) => void;
  className?: string;
}

const defaultSuggestions: SuggestionItem[] = [
  {
    id: "brainstorm",
    icon: <Lightbulb className="h-5 w-5 text-amber-500" />,
    title: "Brainstorm",
    prompt: "Help me brainstorm ideas for ",
  },
  {
    id: "write",
    icon: <Pencil className="h-5 w-5 text-blue-500" />,
    title: "Write",
    prompt: "Help me write ",
  },
  {
    id: "research",
    icon: <Search className="h-5 w-5 text-green-500" />,
    title: "Research",
    prompt: "Research and explain ",
  },
  {
    id: "code",
    icon: <Code className="h-5 w-5 text-purple-500" />,
    title: "Code",
    prompt: "Help me code ",
  },
];

export function EmptyStateChat({
  brandName = "rynk.",
  suggestions = defaultSuggestions,
  recentPrompts = [],
  onSelectSuggestion,
  onSelectRecent,
  className,
}: EmptyStateChatProps) {
  return (
    <div
      className={cn(
        // Use flex-col and justify-center to center vertically in available space
        // Add minimal padding to avoid edge collision
        "flex flex-col items-center justify-center p-4 min-h-full",
        className
      )}
    >
      {/* Container to push content slightly up visually to balance with bottom input */}
      <div className="flex flex-col items-center justify-center w-full max-w-2xl -mt-20">
        
        {/* Brand Logo with Glow */}
        <div className="mb-6 brand-glow relative z-10">
          <TextShimmer
            spread={5}
            duration={4}
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground/90 selection:bg-primary/20"
          >
            {brandName}
          </TextShimmer>
        </div>

        {/* Subtitle */}
        <p className="text-muted-foreground text-lg mb-8 text-center max-w-md font-light tracking-wide">
          What would you like to explore today?
        </p>

        {/* Suggestion Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full max-w-3xl mb-8">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => onSelectSuggestion?.(suggestion.prompt)}
              className="group flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 border border-transparent hover:border-border/40 transition-all duration-200 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/80 group-hover:bg-background shadow-sm ring-1 ring-black/5 transition-all">
                {React.isValidElement(suggestion.icon) && React.cloneElement(suggestion.icon as React.ReactElement<{ className?: string }>, {
                  className: "h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity"
                })}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-sm text-foreground/90">{suggestion.title}</span>
                <span className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">
                  {suggestion.id === "brainstorm" && "Generate ideas"}
                  {suggestion.id === "write" && "Draft content"}
                  {suggestion.id === "research" && "Deep dive"}
                  {suggestion.id === "code" && "Get help"}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Recent Prompts - Optional, keep if needed but make subtle */}
        {recentPrompts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 justify-center max-w-lg animate-in fade-in duration-500 delay-150 opacity-0 fill-mode-forwards">
            <span className="text-xs text-muted-foreground/40 mr-1 uppercase tracking-widest font-semibold">Recent</span>
            {recentPrompts.slice(0, 3).map((prompt, i) => (
              <button
                key={i}
                onClick={() => onSelectRecent?.(prompt)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1 rounded-full bg-secondary/30 hover:bg-secondary/60 truncate max-w-[150px]"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feature Hints (subtle footer) */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-6 text-[10px] uppercase tracking-widest text-muted-foreground/30 pointer-events-none select-none">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-2.5 w-2.5" />
          AI Powered
        </span>
        <span className="flex items-center gap-1.5">
          <MessageSquare className="h-2.5 w-2.5" />
          Context Aware
        </span>
      </div>
    </div>
  );
}

export default EmptyStateChat;
