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
        "empty-state-center px-4",
        className
      )}
    >
      {/* Brand Logo with Glow */}
      <div className="mb-8 brand-glow">
        <TextShimmer
          spread={5}
          duration={4}
          className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground/80 leading-tight"
        >
          {brandName}
        </TextShimmer>
      </div>

      {/* Subtitle */}
      <p className="text-muted-foreground text-lg mb-2 text-center max-w-md">
        What would you like to explore today?
      </p>

      {/* Suggestion Grid */}
      <div className="grid grid-cols-2 gap-3 max-w-md w-full mb-8">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onSelectSuggestion?.(suggestion.prompt)}
            className="suggestion-card group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary group-hover:bg-secondary/80 transition-colors">
              {suggestion.icon}
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium text-sm">{suggestion.title}</span>
              <span className="text-xs text-muted-foreground">
                {suggestion.id === "brainstorm" && "ideas for..."}
                {suggestion.id === "write" && "something..."}
                {suggestion.id === "research" && "about..."}
                {suggestion.id === "code" && "help with..."}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Recent Prompts */}
      {recentPrompts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 justify-center max-w-lg">
          <span className="text-xs text-muted-foreground/60 mr-1">Recent:</span>
          {recentPrompts.slice(0, 3).map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSelectRecent?.(prompt)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/50 truncate max-w-[150px]"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      )}

      {/* Feature Hints (subtle) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs text-muted-foreground/50">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          AI powered
        </span>
        <span className="flex items-center gap-1.5">
          <MessageSquare className="h-3 w-3" />
          Context aware
        </span>
        <span className="flex items-center gap-1.5 hidden sm:flex">
          <Search className="h-3 w-3" />
          Web search
        </span>
      </div>
    </div>
  );
}

export default EmptyStateChat;
