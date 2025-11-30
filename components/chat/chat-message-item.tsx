'use client';

import { memo, useCallback } from 'react';
import type { CloudMessage as ChatMessage } from '@/lib/services/cloud-db';
import { Message, MessageContent, MessageActions, MessageAction } from '@/components/ui/message';
import { Button } from '@/components/ui/button';
import { Copy, GitBranch, Pencil, Trash, FolderIcon, MessageSquareDashedIcon, Paperclip, Loader2 } from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';
import { AssistantSkeleton } from '@/components/ui/assistant-skeleton';
import { cn } from '@/lib/utils';

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
  versions?: ChatMessage[];
  onSwitchVersion?: (messageId: string) => Promise<void>;
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
  versions = [],
  onSwitchVersion
}: ChatMessageItemProps) {
  const isAssistant = message.role === 'assistant';
  
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
    onDelete(message.id);
  }, [message.id, onDelete]);
  
  const handleEdit = useCallback(() => {
    onStartEdit(message);
  }, [message, onStartEdit]);
  
  if (isAssistant) {
    // Show skeleton only if it's the last message, we're sending, and content is empty (even if streaming started but has no tokens yet)
    const showSkeleton = isLastMessage && isSending && 
                         ((!isStreaming && (!message.content || message.content.trim().length < 3)) ||
                          (isStreaming && (!streamingContent || streamingContent.trim().length === 0)));
    
    if (showSkeleton) {
      return <AssistantSkeleton />;
    }
    
    const displayContent = isStreaming ? streamingContent : message.content;
    
    return (
      <div
        className="w-full px-3 animate-in-up"
      >
        <Message className={cn("mx-auto flex w-auto max-w-3xl flex-col gap-2 px-0 items-start")}>
          <div className="group flex w-fit flex-col gap-0">
            <div className="px-5 py-2 rounded-2xl bg-muted/35 hover:bg-muted/45 transition-colors duration-200 border border-border/30 shadow-sm">
              <Markdown className="prose prose-slate dark:prose-invert max-w-none leading-relaxed text-foreground/90">
                {displayContent}
              </Markdown>
            </div>
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
      <Message className={cn("mx-auto flex w-auto max-w-3xl flex-col gap-2 px-0 items-end")}>
        <div className="group flex flex-col items-end gap-1 w-full">
        
          
          {/* Message Content */}
          <div className="flex flex-col items-end w-full">
            <MessageContent className={cn(
              "text-foreground bg-secondary/60 hover:bg-secondary/85 backdrop-blur-sm rounded-2xl px-5 py-3 prose prose-slate dark:prose-invert shadow-sm transition-all duration-200 border border-border/20",
              isEditing && "opacity-50"
            )}>
              {message.content}
            </MessageContent>
          </div>
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
    prevProps.versions?.[0]?.id === nextProps.versions?.[0]?.id
  );
});
