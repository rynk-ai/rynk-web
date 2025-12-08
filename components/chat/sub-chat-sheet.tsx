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
        className="w-full lg:min-w-[500px] sm:max-w-md flex flex-col p-0 gap-0 focus:outline-0 border-l border-border bg-background shadow-2xl"
      >
        {/* Header with full message context and highlighted text */}
        <SheetHeader className="px-6 py-4 border-b border-border bg-background flex-shrink-0">
          <SheetTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Quote className="h-4 w-4 text-primary" />
            Context
          </SheetTitle>

          {/* Highlighted text */}
          <div className="mt-3 relative pl-4 border-l-2 border-primary/50">
            <p className="text-sm text-foreground/90 italic leading-relaxed">
              "{subChat.quotedText}"
            </p>
          </div>
        </SheetHeader>

        {/* Messages area */}
        <ScrollArea className="flex-1 px-6 py-4 bg-background" ref={scrollRef}>
          <div className="flex flex-col gap-4 pb-4">
            {/* Search Results */}
            {searchResults && searchResults.sources.length > 0 && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                <div className="max-w-[90%] rounded-xl px-4 py-3 bg-muted/30 border border-border/50">
                  <p className="text-xs text-primary mb-3 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="h-3 w-3" />
                    Sources ({searchResults.totalResults})
                  </p>
                  <div className="flex flex-col gap-2">
                    {searchResults.sources.slice(0, 3).map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2.5 rounded-lg bg-background hover:bg-muted/50 border border-border/40 transition-colors group"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                              {source.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {source.url}
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
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                <div className="max-w-[90%] rounded-xl px-4 py-3 bg-muted/30 text-foreground">
                  <Markdown className="!bg-transparent !p-0 text-sm">
                    {streamingContent}
                  </Markdown>
                </div>
              </div>
            )}

            {/* Loading indicator when no content yet */}
            {isLoading && !streamingContent && !searchResults && (
              <div className="flex justify-start animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-full border border-border/40">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="px-6 py-4 border-t border-border bg-background flex-shrink-0">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up..."
              className={cn(
                "w-full resize-none rounded-xl border border-input bg-background pl-4 pr-12 py-3",
                "text-sm placeholder:text-muted-foreground/70",
                "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all",
                "min-h-[48px] max-h-[120px] shadow-sm",
              )}
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              className={cn(
                "absolute right-1.5 bottom-1.5 h-9 w-9 rounded-lg transition-all",
                input.trim() 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-muted text-muted-foreground hover:bg-muted"
              )}
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
    <div className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-4 py-2.5 text-sm shadow-sm",
          isUser
            ? "bg-secondary text-secondary-foreground border border-border/50"
            : "bg-transparent -ml-2",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <Markdown className="!bg-transparent !p-0 text-foreground">
            {message.content}
          </Markdown>
        )}
      </div>
    </div>
  );
}
