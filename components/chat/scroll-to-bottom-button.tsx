"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { PiCaretDown } from "react-icons/pi";
import { cn } from "@/lib/utils";

export interface ScrollToBottomButtonProps {
  /** Called when the button is clicked */
  onClick: () => void;
  /** Controls visibility of the button */
  visible: boolean;
  /** Optional className to override styles */
  className?: string;
}

/**
 * ScrollToBottomButton - A floating button that appears when the user scrolls up
 * and allows them to quickly scroll back to the bottom of the chat.
 * 
 * Used by: chat page, guest-chat page, project page
 */
export const ScrollToBottomButton = memo(function ScrollToBottomButton({
  onClick,
  visible,
  className,
}: ScrollToBottomButtonProps) {
  if (!visible) return null;

  return (
    <Button
      variant="ghost"
      className={cn(
        "absolute bottom-32 z-30 rounded-full bg-background/80 backdrop-blur-sm hover:bg-accent transition-all duration-300 animate-in slide-in-from-bottom-2 fade-in right-4 h-9 w-9 p-0 md:right-auto md:left-1/2 md:-translate-x-1/2 md:h-8 md:w-auto md:px-3 md:gap-1.5",
        className
      )}
      onClick={onClick}
      title="Scroll to bottom"
    >
      <PiCaretDown className="h-4 w-4 md:h-3.5 md:w-3.5" />
      <span className="hidden md:inline text-xs font-medium">
        Scroll to Bottom
      </span>
    </Button>
  );
});
