"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X, Quote, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/prompt-kit/markdown";
import type { SubChat, SubChatMessage } from "@/lib/services/cloud-db";

interface SubChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subChat: SubChat | null;
  onSendMessage: (content: string) => Promise<void>;
  isLoading?: boolean;
  streamingContent?: string;
}

export function SubChatSheet({
  open,
  onOpenChange,
  subChat,
  onSendMessage,
  isLoading = false,
  streamingContent = "",
}: SubChatSheetProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [subChat?.messages, streamingContent]);

  // Focus input when sheet opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const content = input.trim();
    setInput("");
    await onSendMessage(content);
  }, [input, isLoading, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  if (!subChat) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full lg:min-w-3xl sm:max-w-md  flex flex-col p-0 gap-0 focus:outline-0"
      >
        {/* Header with quoted text */}
        <SheetHeader className="px-4 py-3 border-b bg-muted/30 flex-shrink-0">
          <SheetTitle className="text-sm font-medium flex items-center gap-2">
            <Quote className="h-4 w-4 text-muted-foreground" />
            {""}
          </SheetTitle>
          <div className="mt-2 p-2.5 bg-muted/50 rounded-lg border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Context:</p>
            <p className="text-sm text-foreground/90 italic line-clamp-3">
              "{subChat.quotedText}"
            </p>
          </div>
        </SheetHeader>

        {/* Messages area */}
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
          <div className="flex flex-col gap-3">
            {subChat.messages.map((msg) => (
              <SubChatMessageBubble key={msg.id} message={msg} />
            ))}

            {/* Streaming message */}
            {isLoading && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 bg-muted/50">
                  <Markdown className="!bg-transparent !p-0 text-sm">
                    {streamingContent}
                  </Markdown>
                </div>
              </div>
            )}

            {/* Loading indicator when no content yet */}
            {isLoading && !streamingContent && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-muted/50 rounded-2xl">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="px-4 py-3 border-t bg-background flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this ..."
              className={cn(
                "flex-1 resize-none rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5",
                "text-sm placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-1 focus:ring-ring",
                "min-h-[40px] max-h-[120px]",
              )}
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="h-10 w-10 rounded-full flex-shrink-0"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SubChatMessageBubble({ message }: { message: SubChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50 text-foreground",
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <Markdown className="!bg-transparent !p-0 text-sm">
            {message.content}
          </Markdown>
        )}
      </div>
    </div>
  );
}
