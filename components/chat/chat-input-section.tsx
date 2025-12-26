"use client";

import { forwardRef, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";

export interface ChatInputSectionProps {
  /** Whether this is a new chat (no conversation) - controls vertical positioning */
  isNewChat: boolean;
  /** Whether currently sending a message */
  isSending?: boolean;
  /** Whether messages exist */
  hasMessages?: boolean;
  /** Children to render inside the input section */
  children: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * ChatInputSection - Layout wrapper for the chat input area.
 * Handles the animated positioning of the input between centered (new chat)
 * and bottom-anchored (conversation active) states.
 * 
 * Used by: chat page, guest-chat page, project page
 */
export const ChatInputSection = forwardRef<HTMLDivElement, ChatInputSectionProps>(
  function ChatInputSection(
    { isNewChat, isSending = false, hasMessages = false, children, className },
    ref
  ) {
    // Show centered when new chat AND not sending AND no messages
    const isCentered = isNewChat && !isSending && !hasMessages;

    return (
      <div
        ref={ref}
        className={cn(
          "absolute left-0 right-0 w-full transition-all duration-300 ease-out z-20",
          isCentered ? "bottom-1/3 sm:bottom-3/7" : "bottom-0",
          className
        )}
      >
        <div className="relative w-full max-w-2xl lg:max-w-3xl mx-auto pb-safe-bottom">
          {children}
        </div>
      </div>
    );
  }
);
