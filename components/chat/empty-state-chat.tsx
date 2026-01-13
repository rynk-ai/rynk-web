"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import {
  PiLightbulb,
  PiPencil,
  PiMagnifyingGlass,
  PiCode,
  PiChatCircle,
  PiSparkle,
} from "react-icons/pi";

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
    icon: <PiLightbulb className="h-5 w-5 text-amber-500" />,
    title: "Brainstorm",
    prompt: "Help me brainstorm ideas for ",
  },
  {
    id: "write",
    icon: <PiPencil className="h-5 w-5 text-blue-500" />,
    title: "Write",
    prompt: "Help me write ",
  },
  {
    id: "research",
    icon: <PiMagnifyingGlass className="h-5 w-5 text-green-500" />,
    title: "Research",
    prompt: "Research and explain ",
  },
  {
    id: "code",
    icon: <PiCode className="h-5 w-5 text-purple-500" />,
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
        "flex flex-col items-center justify-center",
        className
      )}
    >
      {/* Container to push content slightly up visually to balance with bottom input */}
      <div className="flex flex-col items-center justify-center w-full max-w-2xl">
        
        {/* Brand Logo - Minimalist */}
        <div className="relative z-10 mb-2">
          <TextShimmer
            spread={5}
            duration={4}
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-normal text-foreground selection:bg-primary/20"
          >
            {brandName}
          </TextShimmer>
        </div>

        {/* Subtitle */}
        <p className="text-muted-foreground mb-4 text-center max-w-md font-light tracking-wide">
          What would you like to explore today?
        </p>
      </div>

      
    </div>
  );
}

export default EmptyStateChat;
