'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CloudMessage as ChatMessage } from '@/lib/services/cloud-db';
import { Message, MessageContent, MessageActions, MessageAction } from '@/components/prompt-kit/message';
import { Button } from '@/components/ui/button';
import { Copy, GitBranch, Pencil, Trash, FolderIcon, MessageSquareDashedIcon, Paperclip, Loader2, Quote } from 'lucide-react';
import { Markdown } from '@/components/prompt-kit/markdown';
import { AssistantSkeleton } from '@/components/ui/assistant-skeleton';
import { cn } from '@/lib/utils';
import { DeleteMessageDialog } from '@/components/delete-message-dialog';
import { ReasoningDisplay } from '@/components/chat/reasoning-display';
import { SourcesFooter } from '@/components/chat/sources-footer';
import { formatCitationsFromSearchResults, type Citation } from '@/lib/types/citation';
import { useStreamingContext } from '@/lib/hooks/chat-context';

import { VersionIndicator } from '@/components/ui/version-indicator';

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
  onQuote?: (text: string, messageId: string, role: 'user' | 'assistant') => void;
  versions?: ChatMessage[];
  onSwitchVersion?: (messageId: string) => Promise<void>;
  streamingStatusPills?: any[];
  streamingSearchResults?: any;
}

/**
 * Individual message component with aggressive memoization.
 * Only re-renders when its specific props change, not when parent re-renders.
 * 
 * Custom comparison function ensures we don't re-render unnecessarily.
 */
export const ChatMessageItem = memo(function ChatMessageItem({
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
  versions = [],
  onSwitchVersion,
  streamingStatusPills,
  streamingSearchResults
}: ChatMessageItemProps) {
  const isAssistant = message.role === 'assistant';

  // Get streaming context for status pills and search results
  const streamingContext = useStreamingContext();

  // Persist streaming metadata until message has its own
  // This fixes the race condition between finishStreaming() and message refetch
  const lastStreamingStatusPills = useRef<any[]>([]);
  const lastStreamingSearchResults = useRef<any>(null);

  // Update refs when streaming props are available
  // Also update from context for pending assistant messages (last message, isSending)
  if (streamingStatusPills && streamingStatusPills.length > 0) {
    lastStreamingStatusPills.current = streamingStatusPills;
  } else if (isLastMessage && isSending && streamingContext.statusPills) {
    // For pending assistant messages, get status pills from context even if prop is undefined
    lastStreamingStatusPills.current = streamingContext.statusPills;
  }
  if (streamingSearchResults) {
    lastStreamingSearchResults.current = streamingSearchResults;
  } else if (isLastMessage && isSending && streamingContext.searchResults) {
    // For pending assistant messages, get search results from context even if prop is undefined
    lastStreamingSearchResults.current = streamingContext.searchResults;
  }
  
  // Quote button state
  const [showQuoteButton, setShowQuoteButton] = useState(false);
  const [selectedText, setSelectedText] = useState('');
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
    const text = selection?.toString().trim() || '';
    
    if (text.length > 0 && selection && selection.rangeCount > 0) {
      // Get the bounding rectangle of the selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Position button at the bottom-right of the selection
      // Using absolute positioning with scroll offsets for document-level coordinates
      setButtonPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX
      });
      
      setSelectedText(text);
      setShowQuoteButton(true);
    } else {
      setShowQuoteButton(false);
      setSelectedText('');
    }
  }, [message.id, message.role]);
  
  const handleQuoteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (selectedText && onQuote && (message.role === 'user' || message.role === 'assistant')) {
      onQuote(selectedText, message.id, message.role);
      setShowQuoteButton(false);
      setSelectedText('');
      // Clear selection
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText, onQuote, message.id, message.role]);
  
  if (isAssistant) {
    const displayContent = isStreaming ? streamingContent : message.content;
    
    // Determine effective reasoning metadata
    // Priority: 1. streaming props (if streaming) 2. message metadata 3. cached refs (bridge the gap)
    const effectiveStatusPills = isStreaming 
      ? streamingStatusPills 
      : (message.reasoning_metadata?.statusPills || lastStreamingStatusPills.current);
    const effectiveSearchResults = isStreaming 
      ? streamingSearchResults 
      : (message.reasoning_metadata?.searchResults || lastStreamingSearchResults.current);
    const hasReasoning = (effectiveStatusPills && effectiveStatusPills.length > 0) || !!effectiveSearchResults;
    
    // Convert search results to citations for the citation system
    const citations = useMemo(
      () => formatCitationsFromSearchResults(effectiveSearchResults),
      [effectiveSearchResults]
    );

    // Debug logging
    console.log('[ChatMessageItem] Reasoning metadata:', {
      isStreaming,
      messageId: message.id,
      streamingStatusPillsCount: streamingStatusPills?.length || 0,
      cachedStatusPillsCount: lastStreamingStatusPills.current?.length || 0,
      messageReasoningMetadata: !!message.reasoning_metadata,
      effectiveStatusPillsCount: effectiveStatusPills?.length || 0,
      effectiveSearchResultsSources: effectiveSearchResults?.sources?.length || 0,
      hasReasoning,
      citationsCount: citations?.length || 0
    })

    // Show skeleton only if: last message, sending, AND no content at all AND no reasoning status
    const showSkeleton = isLastMessage && isSending &&
                         ((!isStreaming && (!message.content || message.content.trim().length < 3)) ||
                          (isStreaming && (!displayContent || displayContent.trim().length === 0))) &&
                         !hasReasoning; // Don't show skeleton if we have reasoning updates to show
    
    if (showSkeleton) {
      return <AssistantSkeleton />;
    }


    return (
      <div
        className="w-full px-3 animate-in-up"
      >
        <Message className={cn("py-2 mx-auto flex w-auto max-w-3xl flex-col gap-2 px-0 items-start")}>
          <div className="group flex w-full flex-col gap-0 relative">
            <div 
              className="w-full"
              onMouseUp={handleTextSelection}
            >
              {/* Reasoning Display - Shows current status during streaming */}
              <ReasoningDisplay 
                statuses={effectiveStatusPills || []}
                searchResults={null}
                isComplete={!isStreaming}
                defaultCollapsed={false}
              />
              
              {/* Message content with inline citations */}
              <Markdown 
                className="!bg-transparent !p-0 !text-foreground"
                citations={citations}
              >
                {displayContent}
              </Markdown>
              
              {/* Search Sources - Show after content if available */}
              {citations && citations.length > 0 && !isStreaming && (
                <SourcesFooter 
                  citations={citations}
                  variant="compact"
                />
              )}
            </div>
            
            {/* Floating Quote Button - Rendered via Portal to avoid positioning issues */}
            {showQuoteButton && onQuote && selectedText && typeof window !== 'undefined' && createPortal(
              <Button
                size="sm"
                variant="secondary"
                className="absolute z-[9999] h-7 gap-1.5 px-2.5 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
                style={{
                  top: `${buttonPosition.top + 4}px`,
                  left: `${buttonPosition.left + 8}px`
                }}
                onClick={handleQuoteClick}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Quote className="h-3.5 w-3.5" />
                Quote
              </Button>,
              document.body
            )}
            
            <MessageActions className={cn(
              "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 pt-1 pl-1",
              isLastMessage && "opacity-100"
            )}>
              <MessageAction tooltip="Copy" delayDuration={100} >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50" 
                  onClick={handleCopy}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </MessageAction>
              <MessageAction tooltip="Branch from here" delayDuration={100}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50" 
                  onClick={handleBranch}
                >
                  <GitBranch className="h-3.5 w-3.5" />
                </Button>
              </MessageAction>
            </MessageActions>
          </div>
        </Message>
      </div>
    );
  }
  
  // User message
  const isLoading = isLastMessage && isSending && !isStreaming;

  return (
    <div
      className="w-full px-3 animate-in-up"
    >
      <Message className={cn("py-2 mx-auto flex w-auto max-w-3xl flex-col gap-2 px-0 items-end")}>
        <div className="group flex flex-col items-end gap-1 w-full relative">
        
          
          {/* Message Content */}
          <div className="flex flex-col items-end w-full">
            <MessageContent 
              className={cn(
                "text-foreground bg-secondary/60 hover:bg-secondary/85 backdrop-blur-sm rounded-2xl px-5 py-3 prose prose-slate dark:prose-invert shadow-sm transition-all duration-200 border border-border/20",
                isEditing && "opacity-50"
              )}
              onMouseUp={handleTextSelection}
            >
              {message.content}
            </MessageContent>
          </div>
          
          {/* Floating Quote Button - Rendered via Portal to avoid positioning issues */}
          {showQuoteButton && onQuote && selectedText && typeof window !== 'undefined' && createPortal(
            <Button
              size="sm"
              variant="secondary"
              className="absolute z-[9999] h-7 gap-1.5 px-2.5 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
              style={{
                top: `${buttonPosition.top + 4}px`,
                left: `${buttonPosition.left + 8}px`
              }}
              onClick={handleQuoteClick}
              onMouseDown={(e) => e.preventDefault()}
            >
              <Quote className="h-3.5 w-3.5" />
              Quote
            </Button>,
            document.body
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
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <FolderIcon size={10} />
                  )}
                  <span className="font-medium truncate max-w-[100px]">{f.name}</span>
                </div>
              ))}
              {message.referencedConversations?.map((c) => (
                <div
                  key={`c-${c.id}`}
                  className="flex items-center gap-1 bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full text-[10px] border border-border/30"
                >
                  {isLoading ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <MessageSquareDashedIcon size={10} />
                  )}
                  <span className="font-medium truncate max-w-[100px]">{c.title}</span>
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
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : (
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="truncate max-w-[120px]">{file.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Action Buttons */}
          {!isEditing && (
            <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {/* Version Indicator */}
              {onSwitchVersion && versions.length > 1 && (
                <VersionIndicator
                  message={message}
                  versions={versions}
                  onSwitchVersion={onSwitchVersion}
                />
              )}

              <MessageActions className="flex gap-0">
                
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50" 
                    onClick={handleEdit}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                
                
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                    onClick={handleDelete}
                  >
                    <Trash className="h-3 w-3" />
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
        messageRole={message.role as 'user' | 'assistant'}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}, (prevProps, nextProps) => {
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
    // Deep check for attachments and references
    JSON.stringify(prevProps.message.attachments) === JSON.stringify(nextProps.message.attachments) &&
    JSON.stringify(prevProps.message.referencedConversations) === JSON.stringify(nextProps.message.referencedConversations) &&
    JSON.stringify(prevProps.message.referencedFolders) === JSON.stringify(nextProps.message.referencedFolders) &&
    // Version check
    prevProps.versions?.length === nextProps.versions?.length &&
    prevProps.versions?.[0]?.id === nextProps.versions?.[0]?.id &&
    // Reasoning metadata check
    JSON.stringify(prevProps.message.reasoning_metadata) === JSON.stringify(nextProps.message.reasoning_metadata)
  );
});
