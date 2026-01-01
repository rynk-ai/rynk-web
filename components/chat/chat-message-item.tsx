"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  CloudMessage as ChatMessage,
  SubChat,
} from "@/lib/services/cloud-db";
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
} from "@/components/prompt-kit/message";
import { Button } from "@/components/ui/button";
import {
  PiCopy,
  PiGitBranch,
  PiPencilSimple,
  PiTrash,
  PiFolder,
  PiChatCircleDots,
  PiPaperclip,
  PiSpinner,
  PiQuotes,
  PiChatTeardropText,
  PiDotsThree,
  PiArrowSquareOut,
} from "react-icons/pi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Markdown } from "@/components/prompt-kit/markdown";
import { AssistantSkeleton } from "@/components/ui/assistant-skeleton";
import { cn } from "@/lib/utils";
import { DeleteMessageDialog } from "@/components/delete-message-dialog";
import { ReasoningDisplay } from "@/components/chat/reasoning-display";
import { SourcesFooter } from "@/components/chat/sources-footer";
import { SourceImages, type SourceImage } from "@/components/chat/source-images";
import {
  formatCitationsFromSearchResults,
  type Citation,
} from "@/lib/types/citation";
import { ContextCardList, type ContextCardData } from "@/components/chat/context-card";
import { SurfaceTrigger } from "@/components/surfaces/surface-trigger";

import { VersionIndicator } from "@/components/ui/version-indicator";
import { InlineCreditIndicator } from "@/components/credit-warning";
import { UpgradeFooter } from "@/components/chat/upgrade-footer";

interface ChatMessageItemProps {
  message: ChatMessage;
  isLastMessage: boolean;
  isSending: boolean;
  isStreaming: boolean;
  streamingContent: string;
  isEditing: boolean;
  onStartEdit: (message: ChatMessage) => void;
  onDelete: (messageId: string) => void;
  onBranch: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onQuote?: (
    text: string,
    messageId: string,
    role: "user" | "assistant",
  ) => void;
  onOpenSubChat?: (
    text: string,
    messageId: string,
    role: "user" | "assistant",
    fullMessageContent: string,
  ) => void;
  hasSubChats?: boolean;
  messageSubChats?: SubChat[];
  onViewSubChats?: (messageId: string) => void;
  onOpenExistingSubChat?: (subChat: SubChat) => void;
  onDeleteSubChat?: (subChatId: string) => void;
  versions?: ChatMessage[];
  onSwitchVersion?: (messageId: string) => Promise<void>;
  streamingStatusPills?: any[];
  streamingSearchResults?: any;
  streamingContextCards?: ContextCardData[];
  // Surface trigger - needs conversationId and saved surfaces
  conversationId?: string | null;
  savedSurfaces?: Record<string, any>;
  // User query for LLM-based surface detection
  userQuery?: string;
  // Credit indicator
  userCredits?: number | null;
  // Upgrade prompt - message index for showing on every 8th message
  messageIndex?: number;
}

/**
 * Extract images from citations for display
 */
function extractImagesFromCitations(citations: Citation[]): SourceImage[] {
  const images: SourceImage[] = []
  for (const citation of citations) {
    // Primary image
    if (citation.image) {
      images.push({
        url: citation.image,
        sourceUrl: citation.url,
        sourceTitle: citation.title
      })
    }
    // Additional images
    if (citation.images) {
      for (const imgUrl of citation.images) {
        images.push({
          url: imgUrl,
          sourceUrl: citation.url,
          sourceTitle: citation.title
        })
      }
    }
  }
  return images
}

/**
 * Individual message component with aggressive memoization.
 * Only re-renders when its specific props change, not when parent re-renders.
 *
 * Custom comparison function ensures we don't re-render unnecessarily.
 */
export const ChatMessageItem = memo(
  function ChatMessageItem({
    message,
    isLastMessage,
    isSending,
    isStreaming,
    streamingContent,
    isEditing,
    onStartEdit,
    onDelete,
    onBranch,
    onCopy,
    onQuote,
    onOpenSubChat,
    hasSubChats = false,
    messageSubChats = [],
    onViewSubChats,
    onOpenExistingSubChat,
    onDeleteSubChat,
    versions = [],
    onSwitchVersion,
    streamingStatusPills,
    streamingSearchResults,
    streamingContextCards,
    // Surface trigger - needs conversationId and saved surfaces
    conversationId,
    savedSurfaces,
    // User query for LLM-based surface detection
    userQuery,
    // Credit indicator
    userCredits,
    // Upgrade prompt
    messageIndex,
  }: ChatMessageItemProps) {
    const isAssistant = message.role === "assistant";

    // Cache streaming content to bridge the gap between stream completion and message update
    // NOTE: We no longer cache statusPills/searchResults in refs because messages now persist
    // reasoning_metadata IMMEDIATELY during streaming (see handleSubmit in chat/page.tsx)
    const lastStreamingContentRef = useRef<string>('');

    // Update content ref during streaming to prevent flicker during transition
    useEffect(() => {
      if (isStreaming && streamingContent) {
        lastStreamingContentRef.current = streamingContent;
      } else if (message.content && message.content.length > 0) {
        // Clear once message has persisted content
        lastStreamingContentRef.current = '';
      }
    }, [isStreaming, streamingContent, message.content]);

    // Quote button state
    const [showQuoteButton, setShowQuoteButton] = useState(false);
    const [selectedText, setSelectedText] = useState("");
    const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });

    // Delete confirmation dialog state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Memoize handlers to prevent child re-renders
    const handleCopy = useCallback(() => {
      const content = isStreaming ? streamingContent : message.content;
      if (onCopy) {
        onCopy(content);
      } else {
        navigator.clipboard.writeText(content);
      }
    }, [message.content, isStreaming, streamingContent, onCopy]);

    const handleBranch = useCallback(() => {
      onBranch(message.id);
    }, [message.id, onBranch]);

    const handleDelete = useCallback(() => {
      setShowDeleteDialog(true);
    }, []);

    const handleConfirmDelete = useCallback(() => {
      onDelete(message.id);
      setShowDeleteDialog(false);
    }, [message.id, onDelete]);

    const handleEdit = useCallback(() => {
      onStartEdit(message);
    }, [message, onStartEdit]);

    const handleTextSelection = useCallback(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || "";

      if (text.length > 0 && selection && selection.rangeCount > 0) {
        // Get the bounding rectangle of the selection
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Position button at the bottom-right of the selection
        // Using absolute positioning with scroll offsets for document-level coordinates
        setButtonPosition({
          top: rect.bottom + window.scrollY,
          left: rect.right + window.scrollX,
        });

        setSelectedText(text);
        setShowQuoteButton(true);
      } else {
        setShowQuoteButton(false);
        setSelectedText("");
      }
    }, [message.id, message.role]);

    const handleQuoteClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (
          selectedText &&
          onQuote &&
          (message.role === "user" || message.role === "assistant")
        ) {
          onQuote(selectedText, message.id, message.role);
          setShowQuoteButton(false);
          setSelectedText("");
          // Clear selection
          window.getSelection()?.removeAllRanges();
        }
      },
      [selectedText, onQuote, message.id, message.role],
    );

    const handleSubChatClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (
          selectedText &&
          onOpenSubChat &&
          (message.role === "user" || message.role === "assistant")
        ) {
          onOpenSubChat(selectedText, message.id, message.role, message.content);
          setShowQuoteButton(false);
          setSelectedText("");
          // Clear selection
          window.getSelection()?.removeAllRanges();
        }
      },
      [selectedText, onOpenSubChat, message.id, message.role],
    );

    const handleViewSubChats = useCallback(() => {
      if (onViewSubChats) {
        onViewSubChats(message.id);
      }
    }, [message.id, onViewSubChats]);

    // Helper to highlight quoted text from sub-chats
    const highlightSubChatText = useCallback(
      (content: string) => {
        if (!messageSubChats.length || !onOpenExistingSubChat) {
          return content;
        }

        // Create segments with highlights
        const segments: { text: string; subChat?: SubChat }[] = [];
        let remainingText = content;
        let lastIndex = 0;

        // Sort sub-chats by position in text (find each quoted text)
        const matches: {
          start: number;
          end: number;
          subChat: SubChat;
          matchedText: string;
        }[] = [];
        for (const sc of messageSubChats) {
          const quotedTrimmed = sc.quotedText.trim();

          // Try exact match first
          let idx = content.indexOf(sc.quotedText);
          let matchedText = sc.quotedText;

          // If not found, try trimmed version
          if (idx === -1) {
            idx = content.indexOf(quotedTrimmed);
            matchedText = quotedTrimmed;
          }

          if (idx !== -1) {
            matches.push({
              start: idx,
              end: idx + matchedText.length,
              subChat: sc,
              matchedText,
            });
          }
        }

        // Sort by start position
        matches.sort((a, b) => a.start - b.start);

        // Remove overlapping matches (keep first occurrence)
        const nonOverlapping: typeof matches = [];
        for (const match of matches) {
          const overlaps = nonOverlapping.some(
            (m) =>
              (match.start >= m.start && match.start < m.end) ||
              (match.end > m.start && match.end <= m.end),
          );
          if (!overlaps) {
            nonOverlapping.push(match);
          }
        }

        // Build segments
        let currentIndex = 0;
        for (const match of nonOverlapping) {
          if (match.start > currentIndex) {
            segments.push({ text: content.slice(currentIndex, match.start) });
          }
          segments.push({
            text: match.matchedText,
            subChat: match.subChat,
          });
          currentIndex = match.end;
        }
        if (currentIndex < content.length) {
          segments.push({ text: content.slice(currentIndex) });
        }

        return segments;
      },
      [messageSubChats, onOpenExistingSubChat],
    );

    // Render content with highlighted sub-chat text for user messages
    const renderUserContentWithHighlights = useCallback(() => {
      const segments = highlightSubChatText(message.content);

      if (typeof segments === "string") {
        return segments;
      }

      return (
        <>
          {segments.map((seg, idx) => {
            if (seg.subChat) {
              return (
                <span
                  key={idx}
                  className="bg-accent/20 dark:bg-accent/30 hover:bg-accent/30 dark:hover:bg-accent/40 cursor-pointer rounded-sm px-0.5 transition-colors border-b border-accent/40"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenExistingSubChat?.(seg.subChat!);
                  }}
                  title="Click to open sub-chat"
                >
                  {seg.text}
                </span>
              );
            }
            return <span key={idx}>{seg.text}</span>;
          })}
        </>
      );
    }, [message.content, highlightSubChatText, onOpenExistingSubChat]);

    // Ref for assistant message content to apply highlights via DOM
    const assistantContentRef = useRef<HTMLDivElement>(null);

    // Apply highlights to assistant content after render
    useEffect(() => {
      if (!assistantContentRef.current) {
        return;
      }

      const container = assistantContentRef.current;

      // Remove any existing highlights first (always do this for cleanup)
      container.querySelectorAll(".subchat-highlight").forEach((el) => {
        const text = el.textContent || "";
        el.replaceWith(document.createTextNode(text));
      });

      // Early return if no sub-chats to highlight
      if (!messageSubChats.length || !onOpenExistingSubChat || isStreaming) {
        return;
      }

      // Apply highlights for each sub-chat
      for (const sc of messageSubChats) {
        const quotedText = sc.quotedText.trim();
        if (!quotedText) continue;

        // Walk through text nodes and find matches
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT,
          null,
        );

        const nodesToProcess: { node: Text; start: number; end: number }[] = [];
        let node: Text | null;

        while ((node = walker.nextNode() as Text | null)) {
          const text = node.textContent || "";
          const idx = text.indexOf(quotedText);
          if (idx !== -1) {
            nodesToProcess.push({
              node,
              start: idx,
              end: idx + quotedText.length,
            });
            break; // Only highlight first occurrence per sub-chat
          }
        }

        // Process nodes (in reverse to avoid index issues)
        for (const { node, start, end } of nodesToProcess.reverse()) {
          const text = node.textContent || "";
          const before = text.slice(0, start);
          const match = text.slice(start, end);
          const after = text.slice(end);

          const span = document.createElement("span");
          span.className = "subchat-highlight";
          span.textContent = match;
          span.style.cursor = "pointer";
          span.setAttribute("data-subchat-id", sc.id);
          span.title = "Click to open sub-chat";

          const fragment = document.createDocumentFragment();
          if (before) fragment.appendChild(document.createTextNode(before));
          fragment.appendChild(span);
          if (after) fragment.appendChild(document.createTextNode(after));

          node.replaceWith(fragment);
        }
      }

      // Add click handler for highlights
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains("subchat-highlight")) {
          const subChatId = target.getAttribute("data-subchat-id");
          if (subChatId) {
            const subChat = messageSubChats.find((sc) => sc.id === subChatId);
            if (subChat) {
              e.stopPropagation();
              onOpenExistingSubChat(subChat);
            }
          }
        }
      };

      container.addEventListener("click", handleClick);
      return () => container.removeEventListener("click", handleClick);
    }, [messageSubChats, onOpenExistingSubChat, isStreaming, message.content]);

    // Determine effective reasoning metadata - computed before any conditionals to maintain hook order
    // Priority: 1. streaming props (if streaming) 2. message metadata (persisted during streaming)
    // No more ref fallback - messages now persist reasoning_metadata immediately
    
    // Parse reasoning_metadata safely - it may be stored as a string in D1 (JSON handling quirk)
    const parsedMetadata = useMemo(() => {
      const raw = message.reasoning_metadata;
      if (!raw) return undefined;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          console.warn('[ChatMessageItem] Failed to parse reasoning_metadata string');
          return undefined;
        }
      }
      return raw;
    }, [message.reasoning_metadata]);
    
    const effectiveStatusPills = isStreaming
      ? streamingStatusPills
      : parsedMetadata?.statusPills;
    const effectiveSearchResults = isStreaming
      ? streamingSearchResults
      : parsedMetadata?.searchResults;

    // Move useMemo before any conditional returns to fix React hooks order
    const citations = useMemo(() => {
      if (!isAssistant) return [];
      return formatCitationsFromSearchResults(effectiveSearchResults);
    }, [effectiveSearchResults, isAssistant]);

    if (isAssistant) {
      // Use message.content if available, otherwise streaming content, otherwise cached content
      // This prevents flicker when transitioning from streaming to final state
      const displayContent = message.content || streamingContent || lastStreamingContentRef.current;

      // Debug logging removed - was causing console clutter on every render

      const hasReasoning =
        (effectiveStatusPills && effectiveStatusPills.length > 0) ||
        !!effectiveSearchResults;

      // Simplified skeleton logic:
      // Only show skeleton if it's the last message, we're sending, NOT yet streaming,
      // no content exists, AND no reasoning updates have arrived yet
      const showSkeleton =
        isLastMessage &&
        isSending &&
        !isStreaming &&
        !displayContent &&
        !hasReasoning;

      if (showSkeleton) {
        return <AssistantSkeleton />;
      }

      return (
        <div className="w-full px-3 animate-in-up">
          <Message
            className={cn(
              "py-0.5 mx-auto flex w-auto max-w-3xl flex-col gap-0 px-0 items-start",
            )}
          >
            <div className="group flex w-full flex-col gap-0 relative">
              <div className="w-full" onMouseUp={handleTextSelection}>

                {/* Reasoning Display - Shows current status during streaming */}
                <ReasoningDisplay
                  statuses={effectiveStatusPills || []}
                  searchResults={streamingSearchResults || effectiveSearchResults}
                  isComplete={!isStreaming}
                  isStreaming={isStreaming}
                  hasContent={!!displayContent}
                />

                {/* Hero Images - Show before content if available */}
                {citations && citations.length > 0 && !isStreaming && (
                  <SourceImages 
                    images={extractImagesFromCitations(citations)} 
                    maxImages={4}
                    className="mb-2"
                  />
                )}

                {/* Message content with inline citations */}
                <div ref={assistantContentRef}>
                  <Markdown
                    className="!bg-transparent !p-0 !text-foreground"
                    citations={citations}
                  >
                    {displayContent}
                  </Markdown>
                </div>

                {/* Search Sources - Show after content if available */}
                {citations && citations.length > 0 && !isStreaming && (
                  <SourcesFooter citations={citations} variant="compact" />
                )}

                {/* Surface Trigger - Open as Course/Guide buttons */}
                {conversationId && !isStreaming && parsedMetadata?.detectedSurfaces && parsedMetadata.detectedSurfaces.length > 0 && (
                  <SurfaceTrigger
                    surfaces={parsedMetadata.detectedSurfaces}
                    conversationId={conversationId}
                    userQuery={userQuery}
                  />
                )}

                {/* Upgrade Footer - For free users, every 8th message (subscription check is internal) */}
                {messageIndex !== undefined && messageIndex % 8 === 7 && !isStreaming && (
                  <UpgradeFooter />
                )}
              </div>

              {/* Floating Quote & SubChat Buttons - Rendered via Portal to avoid positioning issues */}
              {showQuoteButton &&
                selectedText &&
                typeof window !== "undefined" &&
                createPortal(
                  <div
                    className="absolute z-[9999] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
                    style={{
                      top: `${buttonPosition.top + 8}px`,
                      left: `${buttonPosition.left + 8}px`,
                    }}
                  >
                    {onQuote && (
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 px-2 bg-background text-foreground hover:bg-secondary border border-border shadow-sm rounded-md"
                        onClick={handleQuoteClick}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <PiQuotes className="h-3.5 w-3.5 opacity-70" />
                        <span className="text-xs font-medium">Quote</span>
                      </Button>
                    )}
                    {onOpenSubChat && (
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 px-2 bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent shadow-sm rounded-md"
                        onClick={handleSubChatClick}
                        onMouseDown={(e) => e.preventDefault()}
                        title="Ask about this"
                      >
                        <PiChatTeardropText className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Deep dive</span>
                      </Button>
                    )}
                  </div>,
                  document.body,
                )}

              {/* Sub-chat dropdown */}
              {hasSubChats && messageSubChats.length > 0 && (
                <div className="absolute -left-12 top-0 h-full w-10">
                  <div className="sticky top-6 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0 rounded-xl shadow-md bg-[hsl(var(--surface))] text-foreground hover:bg-[hsl(var(--surface-hover))] border border-border/30 transition-all select-none"
                          title="View sub-chats"
                        >
                          <PiChatTeardropText className="h-4 w-4 text-primary" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-72">
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
                          <PiChatTeardropText className="h-3.5 w-3.5" />
                          <span>{messageSubChats.length} deep dive{messageSubChats.length > 1 ? 's' : ''}</span>
                        </div>
                        <DropdownMenuSeparator />
                        {messageSubChats.map((sc) => (
                          <DropdownMenuItem
                            key={sc.id}
                            className="flex items-start gap-3 cursor-pointer py-3 px-3"
                            onClick={() => onOpenExistingSubChat?.(sc)}
                          >
                            <div className="mt-0.5 min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground line-clamp-2 italic">
                                "{sc.quotedText}"
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSubChat?.(sc.id);
                              }}
                            >
                              <PiTrash className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}

              <MessageActions
                className={cn(
                  "flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 pt-1 pl-1",
                  isLastMessage && !isStreaming && "opacity-100",
                )}
              >
                <MessageAction tooltip="Copy" delayDuration={100}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))]"
                    onClick={handleCopy}
                  >
                    <PiCopy className="h-3.5 w-3.5" />
                  </Button>
                </MessageAction>
                <MessageAction tooltip="Branch from here" delayDuration={100}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))]"
                    onClick={handleBranch}
                  >
                    <PiGitBranch className="h-3.5 w-3.5" />
                  </Button>
                </MessageAction>

                {/* Inline Credit Indicator - shows beside actions for last message */}
                {isLastMessage && !isStreaming && (
                  <InlineCreditIndicator credits={userCredits ?? null} className="ml-2" />
                )}
              </MessageActions>
            </div>
          </Message>
        </div>
      );
    }

    // User message
    const isLoading = isLastMessage && isSending && !isStreaming;

    return (
      <div className="w-full px-3 animate-in-up">
        <Message
          className={cn(
            "py-0.5 mx-auto flex w-auto max-w-3xl flex-col gap-1 px-0 items-end",
          )}
        >
          <div className="group flex flex-col items-end gap-0.5 w-full relative">
            {/* Message Content */}
            <div className="flex flex-col items-end w-full">
              <MessageContent
                className={cn(
                  "text-foreground bg-secondary hover:bg-secondary/80 rounded-lg px-3 py-1.5 prose prose-slate dark:prose-invert transition-all duration-200 border border-border/50 selection:bg-primary/10",
                  isEditing && "opacity-50",
                )}
                onMouseUp={handleTextSelection}
              >
                {messageSubChats.length > 0
                  ? renderUserContentWithHighlights()
                  : message.content}
              </MessageContent>
            </div>

            {/* Floating Quote & SubChat Buttons - Rendered via Portal to avoid positioning issues */}
            {showQuoteButton &&
              selectedText &&
              typeof window !== "undefined" &&
              createPortal(
                <div
                  className="absolute z-[9999] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
                  style={{
                    top: `${buttonPosition.top + 8}px`,
                    left: `${buttonPosition.left + 8}px`,
                  }}
                >
                  {onQuote && (
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 px-3 shadow-xl bg-background text-foreground hover:bg-secondary/80 border-none rounded-xl ring-1 ring-black/5"
                      onClick={handleQuoteClick}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <PiQuotes className="h-3.5 w-3.5 opacity-70" />
                      <span className="text-xs font-medium">Quote</span>
                    </Button>
                  )}
                  {onOpenSubChat && (
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 px-3 shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 border-none rounded-xl"
                      onClick={handleSubChatClick}
                      onMouseDown={(e) => e.preventDefault()}
                      title="Ask about this"
                    >
                      <PiChatTeardropText className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Deep dive</span>
                    </Button>
                  )}
                </div>,
                document.body,
              )}

            {/* Sub-chat dropdown for user messages */}
            {hasSubChats && messageSubChats.length > 0 && (
              <div className="absolute -left-2 top-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 rounded-full bg-primary/10 hover:bg-primary/20"
                      title="View sub-chats"
                    >
                      <PiChatTeardropText className="h-3 w-3 text-primary" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Sub-chats ({messageSubChats.length})
                    </div>
                    <DropdownMenuSeparator />
                    {messageSubChats.map((sc) => (
                      <DropdownMenuItem
                        key={sc.id}
                        className="flex items-center justify-between gap-2 cursor-pointer"
                        onClick={() => onOpenExistingSubChat?.(sc)}
                      >
                        <span className="truncate text-sm flex-1">
                          "{sc.quotedText.slice(0, 40)}{sc.quotedText.length > 40 ? '...' : ''}"
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSubChat?.(sc.id);
                            }}
                          >
                            <PiTrash className="h-3 w-3" />
                          </Button>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Context Badges */}
            {((message.referencedConversations?.length ?? 0) > 0 ||
              (message.referencedFolders?.length ?? 0) > 0) && (
              <div className="flex flex-wrap gap-1.5 justify-end mb-1 max-w-[85%] sm:max-w-[75%]">
                {message.referencedFolders?.map((f) => (
                  <div
                    key={`f-${f.id}`}
                    className="flex items-center gap-1 bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full text-[10px] border border-border/30"
                  >
                    {isLoading ? (
                      <PiSpinner className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <PiFolder size={10} />
                    )}
                    <span className="font-medium truncate max-w-[100px]">
                      {f.name}
                    </span>
                  </div>
                ))}
                {message.referencedConversations?.map((c) => (
                  <div
                    key={`c-${c.id}`}
                    className="flex items-center gap-1 bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full text-[10px] border border-border/30"
                  >
                    {isLoading ? (
                      <PiSpinner className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <PiChatCircleDots size={10} />
                    )}
                    <span className="font-medium truncate max-w-[100px]">
                      {c.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* File Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-end max-w-[85%] sm:max-w-[75%] mt-1">
                {message.attachments.map((file, i) => (
                  <div key={i} className="relative group/file">
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg text-xs border border-border/30 hover:bg-muted/80 transition-colors">
                      {isLoading ? (
                        <PiSpinner className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : (
                        <PiPaperclip className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="truncate max-w-[120px]">
                        {file.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {!isEditing && (
              <div className="flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {/* Version Indicator */}
                {onSwitchVersion && versions.length > 1 && (
                  <VersionIndicator
                    message={message}
                    versions={versions}
                    onSwitchVersion={onSwitchVersion}
                  />
                )}

                <MessageActions className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))]"
                    onClick={handleEdit}
                  >
                    <PiPencilSimple className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                  >
                    <PiTrash className="h-3.5 w-3.5" />
                  </Button>
                </MessageActions>
              </div>
            )}
          </div>
        </Message>

        {/* Delete Confirmation Dialog */}
        <DeleteMessageDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          messageRole={message.role as "user" | "assistant"}
          onConfirm={handleConfirmDelete}
        />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for fine-grained control over re-renders
    // Only re-render if these specific props actually changed
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.isLastMessage === nextProps.isLastMessage &&
      prevProps.isSending === nextProps.isSending &&
      prevProps.isStreaming === nextProps.isStreaming &&
      prevProps.streamingContent === nextProps.streamingContent &&
      prevProps.isEditing === nextProps.isEditing &&
      prevProps.hasSubChats === nextProps.hasSubChats &&
      prevProps.messageSubChats === nextProps.messageSubChats &&
      // Deep check for attachments and references
      JSON.stringify(prevProps.message.attachments) ===
        JSON.stringify(nextProps.message.attachments) &&
      JSON.stringify(prevProps.message.referencedConversations) ===
        JSON.stringify(nextProps.message.referencedConversations) &&
      JSON.stringify(prevProps.message.referencedFolders) ===
        JSON.stringify(nextProps.message.referencedFolders) &&
      // Version check
      prevProps.versions?.length === nextProps.versions?.length &&
      prevProps.versions?.[0]?.id === nextProps.versions?.[0]?.id &&
      // Reasoning metadata check
      JSON.stringify(prevProps.message.reasoning_metadata) ===
        JSON.stringify(nextProps.message.reasoning_metadata) &&
      // Streaming status pills and search results
      JSON.stringify(prevProps.streamingStatusPills) ===
        JSON.stringify(nextProps.streamingStatusPills) &&
      JSON.stringify(prevProps.streamingSearchResults) ===
        JSON.stringify(nextProps.streamingSearchResults) &&
      // Conversation ID for surface trigger
      prevProps.conversationId === nextProps.conversationId &&
      // User query for surface detection
      prevProps.userQuery === nextProps.userQuery
    );
  },
);
