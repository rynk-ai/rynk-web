"use client";

import { useState, useEffect, memo } from "react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/prompt-kit/prompt-input";
import {
  FileUpload,
  FileUploadTrigger,
} from "@/components/prompt-kit/file-upload";
import { FilePreviewList, Attachment } from "@/components/file-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Paperclip, Send, Folder, MessageSquare, Plus, X, Quote as QuoteIcon, Brain, Globe } from "lucide-react";
import { useContextSearch, SearchResultItem, ContextItem } from "@/lib/hooks/use-context-search";
import { Conversation, Folder as FolderType } from "@/lib/services/indexeddb";
import { ContextPicker } from "@/components/context-picker";
import { validateFile } from "@/lib/utils/file-converter";
import { ACCEPTED_FILE_TYPES } from "@/lib/constants/file-config";
import { textToFile, LONG_TEXT_THRESHOLD } from "@/lib/utils/text-to-file-converter";
import { toast } from "sonner";

type PromptInputWithFilesProps = {
  onSubmit?: (text: string, files: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  context?: ContextItem[];
  onContextChange?: (context: ContextItem[]) => void;
  currentConversationId?: string | null;
  conversations?: any[];
  folders?: any[];
  // Edit mode props
  editMode?: boolean;
  initialValue?: string;
  initialAttachments?: (File | Attachment)[];
  onCancelEdit?: () => void;
  onSaveEdit?: (text: string, files: (File | Attachment)[]) => Promise<void>;
  isSubmittingEdit?: boolean;
  // State sync props
  onValueChange?: (value: string) => void;
  onFilesChange?: (files: (File | Attachment)[]) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  // Hide attachment and context buttons
  hideActions?: boolean;
  // Hide only file upload button (keep context picker)
  hideFileUpload?: boolean;
  // Quote props
  quotedMessage?: {
    messageId: string;
    quotedText: string;
    authorRole: 'user' | 'assistant';
  } | null;
  onClearQuote?: () => void;
};

export const PromptInputWithFiles = memo(function
  PromptInputWithFiles({
  onSubmit,
  isLoading = false,
  placeholder = "Ask anything",
  disabled = false,
  className,
  context = [],
  onContextChange,
  currentConversationId,
  conversations = [],
  folders = [],
  editMode = false,
  initialValue = '',
  initialAttachments = [],
  onCancelEdit,
  onSaveEdit,
  isSubmittingEdit = false,
  onValueChange,
  onFilesChange,
  onKeyDown,
  hideActions = false,
  hideFileUpload = false,
  quotedMessage,
  onClearQuote,
}: PromptInputWithFilesProps) {
  const [prompt, setPrompt] = useState(initialValue);
  const [files, setFiles] = useState<(File | Attachment)[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Detect if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent.toLowerCase()) || window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update prompt and files when initial values change (for edit mode)
  useEffect(() => {
    setPrompt(initialValue);
  }, [initialValue]);

  // Handle entering edit mode or updating attachments while editing
  useEffect(() => {
    if (editMode) {
      setFiles(initialAttachments);
    }
  }, [editMode, initialAttachments]);

  // Handle exiting edit mode
  useEffect(() => {
    if (!editMode) {
      setFiles([]);
    }
  }, [editMode]);

  // Context search state
  const [cursorPosition, setCursorPosition] = useState(0);
  const { query, setQuery, results, isLoading: isSearching, allFolders } = useContextSearch(currentConversationId);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Add quote to input when quotedMessage changes
  useEffect(() => {
    if (quotedMessage && !editMode) {
      // Format the quote as markdown blockquote
      const quoteLines = quotedMessage.quotedText.split('\n').map(line => `> ${line}`).join('\n');
      const quoteText = `${quoteLines}\n\n`;
      
      // Add quote to the beginning of the input
      setPrompt(prev => {
        const newValue = quoteText + prev;
        onValueChange?.(newValue);
        return newValue;
      });
    }
  }, [quotedMessage?.messageId, editMode]); // Only trigger when a new quote is added

  const handleFilesAdded = (newFiles: File[]) => {
    // Validate each file
    const results = newFiles.map(file => ({
      file,
      validation: validateFile(file)
    }));
    
    const invalidFiles = results.filter(r => !r.validation.valid);
    
    if (invalidFiles.length > 0) {
      // Show error for each invalid file
      invalidFiles.forEach(({ file, validation }) => {
        toast.error(`${validation.error}`, {
          description: file.name,
        });
      });
      
      // Only add valid files
      const validFiles = results.filter(r => r.validation.valid).map(r => r.file);
      if (validFiles.length > 0) {
        setFiles((prev) => {
          const updated = [...prev, ...validFiles];
          onFilesChange?.(updated);
          return updated;
        });
      }
      return;
    }
    
    // All files valid
    setFiles((prev) => {
      const updated = [...prev, ...newFiles];
      onFilesChange?.(updated);
      return updated;
    });
  };

  const handleRemoveFile = (fileToRemove: File | Attachment) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f !== fileToRemove);
      onFilesChange?.(updated);
      return updated;
    });
  };

  const handleSubmit = async () => {
    if ((!prompt.trim() && files.length === 0) || (isLoading && currentConversationId)) return;

    const currentPrompt = prompt.trim();

    if (editMode && onSaveEdit) {
      // Edit mode: save the edit
      await onSaveEdit(currentPrompt, files);
      setPrompt("");
      setFiles([]);
    } else if (onSubmit) {
      // Normal mode: submit new message
      // Filter out Attachments (shouldn't be there in normal mode anyway)
      const newFiles = files.filter((f): f is File => f instanceof File);
      onSubmit(currentPrompt, newFiles);
      setPrompt("");
      setFiles([]);
    }
  };

  // Handle input changes to detect @
  const handlePromptChange = (value: string) => {
    setPrompt(value);
    onValueChange?.(value);
    
    // Find the last @ before cursor
    const lastAt = value.lastIndexOf('@');
    if (lastAt !== -1) {
      // Check if it's a valid mention start (start of string or preceded by space)
      const isValidStart = lastAt === 0 || value[lastAt - 1] === ' ';
      
      if (isValidStart) {
        const textAfterAt = value.slice(lastAt + 1);
        // Only show suggestions if there's no space after @ (unless we want multi-word search, which we do)
        // But typically we stop if there's a newline
        if (!textAfterAt.includes('\n')) {
          setQuery(textAfterAt);
          setSelectedIndex(0);
          return;
        }
      }
    }
    
    
  };

  const handleSelectContext = (item: SearchResultItem) => {
    if (!onContextChange) return;

    const contextItem: ContextItem = {
      type: item.type,
      id: item.data.id,
      title: item.type === 'folder' ? (item.data as FolderType).name : (item.data as Conversation).title
    };

    // Add to context
    if (item.type === 'folder') {
      const folder = allFolders.find(f => f.id === item.data.id);
      if (folder) {
        // Remove individual conversations that are in the folder
        const newContext = context.filter(c => !folder.conversationIds.includes(c.id));
        onContextChange([...newContext, contextItem]);
      } else {
        onContextChange([...context, contextItem]);
      }
    } else {
      // Check if already covered by a folder
      const isCovered = context.some(c => 
        c.type === 'folder' && 
        allFolders.find(f => f.id === c.id)?.conversationIds.includes(item.data.id)
      );
      
      if (!isCovered && !context.some(c => c.id === item.data.id)) {
        onContextChange([...context, contextItem]);
      }
    }

    // Remove the @mention text
    const lastAt = prompt.lastIndexOf('@');
    if (lastAt !== -1) {
      const newPrompt = prompt.slice(0, lastAt).trimEnd(); // Remove @ and text after it
      setPrompt(newPrompt + " "); // Add a space
      onValueChange?.(newPrompt + " ");
    }
    
    
    
    // Refocus input
    setTimeout(() => {
      const textarea = document.getElementById("main-chat-input");
      if (textarea) textarea.focus();
    }, 0);
  };

  // Handle keyboard navigation for suggestions and platform-specific Enter behavior
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Call parent's onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(e);
    }

    // Don't interfere if parent prevented default
    if (e.defaultPrevented) {
      return;
    }

    // Mobile: Prevent Enter from submitting (only send button should work)
    // Desktop: Default behavior in PromptInputTextarea will handle it (Enter = submit, Shift+Enter = newline)
    if (e.key === 'Enter' && isMobile && !e.shiftKey) {
      e.preventDefault();
      // Don't submit, just allow newline (default behavior)
    }
  };

  // Handle paste events to auto-convert long text to file
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Get pasted text from clipboard
    const pastedText = e.clipboardData.getData('text/plain');
    
    // Check if text exceeds threshold
    if (pastedText && pastedText.length > LONG_TEXT_THRESHOLD) {
      // Prevent default paste behavior
      e.preventDefault();
      
      // Convert text to .txt file
      const textFile = textToFile(pastedText);
      
      // Add file to attachments using existing handler
      handleFilesAdded([textFile]);
    }
    // If text is short, allow normal paste (don't prevent default)
  };

  return (
    <div className={cn("flex flex-col gap-2 relative", className)}>
      {/* Edit mode indicator */}
      {editMode && onCancelEdit && (
        <div className="absolute -top-8 right-2 z-30">
          <Button
            size="sm"
            onClick={onCancelEdit}
            disabled={isLoading || isSubmittingEdit}
            className="gap-1.5 h-7 px-2 text-xs bg-red-800/50 hover:bg-red-800/70 text-white"
          >
            <X size={14} />
            Cancel
          </Button>
        </div>
      )}
      
      {/* Quote Preview */}
      {quotedMessage && onClearQuote && (
        <div className="px-2.5 mt-2">
          <div className="flex items-start gap-2 bg-muted/50 border border-border/30 rounded-lg px-3 py-2.5 text-sm">
            <QuoteIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">
                Replying to {quotedMessage.authorRole === 'assistant' ? 'Assistant' : 'You'}
              </div>
              <div className="text-foreground/90 line-clamp-2 italic">
                {quotedMessage.quotedText}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-background/60 flex-shrink-0"
              onClick={(e) => {
                e.preventDefault();
                onClearQuote();
                // Remove quote from input
                setPrompt(prev => {
                  const lines = prev.split('\n');
                  const firstNonQuoteLine = lines.findIndex(line => !line.startsWith('>') && line.trim() !== '');
                  const newValue = firstNonQuoteLine >= 0 ? lines.slice(firstNonQuoteLine).join('\n') : '';
                  onValueChange?.(newValue);
                  return newValue;
                });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="px-2.5">
          <FilePreviewList
            files={files}
            onRemove={handleRemoveFile}
            showRemove={true}
          />
        </div>
      )}

      {/* Prompt input */}
      <FileUpload
        onFilesAdded={handleFilesAdded}
        multiple={true}
        accept={ACCEPTED_FILE_TYPES}
      >
        <PromptInput
          isLoading={isLoading || isSubmittingEdit}
          value={prompt}
          onValueChange={handlePromptChange}
          onSubmit={handleSubmit}
          disabled={disabled || isSubmittingEdit}

        >
          <div className="flex flex-col">
            <PromptInputTextarea
              id="main-chat-input"
              placeholder={
                editMode 
                  ? "Edit your message..." 
                  : isMobile 
                    ? placeholder 
                    : `${placeholder} (Shift+Enter for new line)`
              }
              className="min-h-[40px] pt-2.5 pl-3 text-base leading-[1.3] sm:text-base md:text-base dark:bg-background overscroll-contain"
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />

            <PromptInputActions className="mt-4 flex w-full items-center justify-between gap-1.5 px-2.5 pb-2.5">
              <div className="flex items-center gap-1.5">
                {!hideActions && !hideFileUpload && (
                  <PromptInputAction tooltip="Attach files">
                    <FileUploadTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                        disabled={isLoading || isSubmittingEdit || disabled}
                      >
                        <Paperclip size={16} />
                      </Button>
                    </FileUploadTrigger>
                  </PromptInputAction>
                )}
                
                {!hideActions && (
                  <ContextPicker
                    selectedItems={context}
                    onSelectionChange={onContextChange || (() => {})}
                    conversations={conversations}
                    folders={folders}
                    currentConversationId={currentConversationId}
                    tooltip="Add chats"
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                        disabled={isLoading || isSubmittingEdit || disabled}
                      >
                        <Plus size={16} />
                      </Button>
                    }
                  />
                )}
              </div>

              {/* Send Button */}
              <Button
                type="button"
                size="icon"
                className="size-8 shrink-0 rounded-full"
                onClick={handleSubmit}
                disabled={
                  (isLoading || isSubmittingEdit || disabled) ||
                  (!editMode && prompt.trim().length === 0 && files.length === 0)
                }
              >
                {(isLoading || isSubmittingEdit) ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                  <Send size={16} />
                )}
              </Button>
            </PromptInputActions>
          </div>
        </PromptInput>
      </FileUpload>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for fine-grained control over re-renders
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.editMode === nextProps.editMode &&
    prevProps.initialValue === nextProps.initialValue &&
    prevProps.isSubmittingEdit === nextProps.isSubmittingEdit &&
    prevProps.currentConversationId === nextProps.currentConversationId &&
    prevProps.context === nextProps.context &&
    prevProps.hideActions === nextProps.hideActions &&
    prevProps.quotedMessage?.messageId === nextProps.quotedMessage?.messageId &&
    prevProps.quotedMessage?.quotedText === nextProps.quotedMessage?.quotedText
  ); // Include reasoning mode check
});
