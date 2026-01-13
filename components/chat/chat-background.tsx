"use client";

import { useChatBackground } from "@/lib/hooks/use-chat-background";
import { cn } from "@/lib/utils";

interface ChatBackgroundProps {
  className?: string;
}

/**
 * Renders the chat background image with smooth fade-in effect.
 * Should be placed as the first child of the chat container with absolute positioning.
 */
export function ChatBackground({ className }: ChatBackgroundProps) {
  const { currentBackground, isLoaded } = useChatBackground();

  if (!isLoaded || !currentBackground) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-0 pointer-events-none overflow-hidden",
        className
      )}
    >
      {/* Background image with gradient overlay for better text readability */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.08] dark:opacity-[0.12] transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${currentBackground.src})`,
        }}
      />
      {/* Subtle gradient overlay to blend with the UI */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/80" />
    </div>
  );
}
