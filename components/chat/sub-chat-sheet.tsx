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
import { Send, X, Quote, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/prompt-kit/markdown";
import type { SubChat, SubChatMessage } from "@/lib/services/cloud-db";

interface SearchResult {
  query: string;
  sources: Array<{
    type: string;
    url: string;
    title: string;
    snippet: string;
  }>;
  strategy: string[];
  totalResults: number;
}

interface SubChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subChat: SubChat | null;
  onSendMessage: (content: string) => Promise<void>;
  isLoading?: boolean;
  streamingContent?: string;
  searchResults?: SearchResult | null;
}

export function SubChatSheet({
  open,
  onOpenChange,
  subChat,
  onSendMessage,
  isLoading = false,
  streamingContent = "",
  searchResults = null,
}: SubChatSheetProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [subChat?.messages, streamingContent, searchResults]);

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
        {/* Header with full message context and highlighted text */}
        <SheetHeader className="px-4 py-3 border-b bg-muted/30 flex-shrink-0">
          <SheetTitle className="text-sm font-medium flex items-center gap-2">
            <Quote className="h-4 w-4 text-muted-foreground" />
            {""}
          </SheetTitle>

          {/* Highlighted text */}
          <p className="text-sm text-amber-900 dark:text-amber-200 italic">
            "{subChat.quotedText}"
          </p>
        </SheetHeader>

        {/* Messages area */}
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
          <div className="flex flex-col gap-3">
            {/* Search Results */}
            {searchResults && searchResults.sources.length > 0 && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/30 dark:border-blue-800/30">
                  <p className="text-xs text-blue-700 dark:text-blue-400 mb-2 font-medium">
                    Search Results ({searchResults.totalResults})
                  </p>
                  <div className="flex flex-col gap-2">
                    {searchResults.sources.slice(0, 3).map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/30 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <ExternalLink className="h-3 w-3 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                              {source.title}
                            </p>
                            <p className="text-xs text-blue-700/80 dark:text-blue-300/80 line-clamp-2 mt-0.5">
                              {source.snippet}
                            </p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
            {isLoading && !streamingContent && !searchResults && (
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
