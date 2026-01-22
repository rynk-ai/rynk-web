"use client";

import { useState, useEffect, memo, useRef } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilePreviewList, FilePreview, Attachment } from "@/components/file-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  PiPaperclip, 
  PiPaperPlaneRight, 
  PiFolder, 
  PiChatCircle, 
  PiPlus, 
  PiX, 
  PiQuotes, 
  PiBookOpen, 
  PiListChecks, 
  PiCaretDown, 
  PiTarget, 
  PiScales, 
  PiCards, 
  PiCalendar, 
  PiArrowRight, 
  PiTrendUp, 
  PiLock, 
  PiMagnifyingGlass,
  PiFilePdf,
  PiFileImage,
  PiFileText,
  PiFileCode,
  PiFile,
  PiGlobe
} from "react-icons/pi";
import { ContextItem } from "@/lib/hooks/use-context-search";
import { Folder as FolderType } from "@/lib/services/indexeddb";
import { InputAttachmentList } from "@/components/chat/input/input-attachment-list";
import { ContextPicker } from "@/components/context-picker";
import { validateFile, formatFileSize, getFileCategory } from "@/lib/utils/file-converter";
import { ACCEPTED_FILE_TYPES } from "@/lib/constants/file-config";
import { textToFile, LONG_TEXT_THRESHOLD } from "@/lib/utils/text-to-file-converter";
import { toast } from "sonner";
import EmptyStateChat from "./chat/empty-state-chat";
import { useSmartInput } from "@/lib/hooks/use-smart-input";

const EMPTY_ARRAY: any[] = [];

type PromptInputWithFilesProps = {
  onSubmit?: (text: string, files: File[], options?: { deepResearch?: boolean }) => void;
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
  // Guest mode
  isGuest?: boolean;
  
  // Deep Research
  isDeepResearch?: boolean;
  onDeepResearchChange?: (enabled: boolean) => void;
  // Hide empty state branding
  hideEmptyState?: boolean;
};



   export const PromptInputWithFiles = memo(function
  PromptInputWithFiles({
  onSubmit,
  isLoading = false,
  placeholder = "Ask anything",
  disabled = false,
  className,
  context: initialContextProp = EMPTY_ARRAY,
  onContextChange,
  currentConversationId,
  conversations = EMPTY_ARRAY,
  folders = EMPTY_ARRAY,
  editMode = false,
  initialValue = '',
  initialAttachments = EMPTY_ARRAY,
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
  isGuest = false,
  isDeepResearch = false,
  onDeepResearchChange,
  hideEmptyState = false
}: PromptInputWithFilesProps) {
  // Use the new smart input hook
  const {
    prompt,
    setPrompt,
    files,
    setFiles,
    context,
    setContext,
    isMobile,
    handlePromptChange,
    handleFilesAdded,
    handleRemoveFile,
    handleRemoveContext,
    handlePaste,
    handleKeyDown: hookHandleKeyDown
  } = useSmartInput({
    initialValue,
    initialAttachments,
    initialContext: initialContextProp,
    onValueChange,
    onFilesChange,
    onContextChange,
    isGuest,
    currentConversationId
  });

  // Plus dropdown state (unified file/context menu)
  const [plusDropdownOpen, setPlusDropdownOpen] = useState(false);
  const plusDropdownRef = useRef<HTMLDivElement>(null);
  
  // Context Picker state
  const [contextPickerOpen, setContextPickerOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!plusDropdownOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (plusDropdownOpen && plusDropdownRef.current && !plusDropdownRef.current.contains(event.target as Node)) {
        setPlusDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [plusDropdownOpen]);

  // Add quote to input when quotedMessage changes
  useEffect(() => {
    if (quotedMessage && !editMode) {
      // Format the quote as markdown blockquote
      const quoteLines = quotedMessage.quotedText.split('\n').map(line => `> ${line}`).join('\n');
      const quoteText = `${quoteLines}\n\n`;
      
      // Add quote to the beginning of the input
      setPrompt(quoteText + prompt);
      onValueChange?.(quoteText + prompt);
    }
  }, [quotedMessage?.messageId, editMode]); // Only trigger when a new quote is added

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
      onSubmit(currentPrompt, newFiles, { deepResearch: isDeepResearch });
      setPrompt("");
      setFiles([]);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Call parent's onKeyDown if provided
    onKeyDown?.(e);

    if (!e.defaultPrevented) {
      hookHandleKeyDown(e);
    }
  };

  return (
    <div className={cn("relative flex flex-col gap-2 relative", className)}>
       {/* Empty State - Shows when no conversation is active and not loading */}
                  <div
                    className={cn(
                      "absolute inset-0 transition-all duration-500 ease-in-out -z-10",
                      (!currentConversationId && !isLoading && !hideEmptyState)
                        ? "opacity-100 translate-y-0 pointer-events-auto -top-50 lg:-top-40"
                        : "opacity-0 -translate-y-10 pointer-events-none",
                    )}
                  >
                    <EmptyStateChat
                      brandName="rynk."
                      onSelectSuggestion={(prompt:any) => {
                        // Set the prompt in the input
                        const textarea = document.getElementById("main-chat-input") as HTMLTextAreaElement;
                        if (textarea) {
                          textarea.value = prompt;
                          textarea.focus();
                          // Trigger input event to update state
                          const event = new Event('input', { bubbles: true });
                          textarea.dispatchEvent(event);
                        }
                      }}
                    />
                  </div>

      


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
          className="bg-card/50 shadow-none rounded-xl border border-border ring-0 backdrop-blur-sm"
        >
          <div className="flex flex-col">
            {/* Edit Mode Banner (Inline) */}
            {editMode && onCancelEdit && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-primary/5 text-primary text-xs font-medium border-b border-primary/10 rounded-t-xl animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Editing message
                </div>
                <button 
                  onClick={onCancelEdit}
                  disabled={isLoading || isSubmittingEdit}
                  className="text-primary/60 hover:text-primary transition-colors flex items-center gap-1 hover:bg-primary/5 rounded px-1.5 py-0.5"
                >
                  <PiX size={12} />
                  <span>Cancel</span>
                </button>
              </div>
            )}

            {/* Quote Preview (Inline) */}
            {quotedMessage && onClearQuote && (
              <div className="px-3 pt-3">
                <div className="flex items-start gap-2 pl-2 border-l-2 border-primary/40 py-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5 flex items-center gap-1">
                      <PiQuotes className="h-3 w-3" />
                      Replying to {quotedMessage.authorRole === 'assistant' ? 'Assistant' : 'You'}
                    </div>
                    <div className="text-xs text-foreground/80 line-clamp-1 italic">
                      {quotedMessage.quotedText}
                    </div>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-background/50 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      onClearQuote();
                      // Remove quote from input logic
                      const lines = prompt.split('\n');
                      const firstNonQuoteLine = lines.findIndex(line => !line.startsWith('>') && line.trim() !== '');
                      const newValue = firstNonQuoteLine >= 0 ? lines.slice(firstNonQuoteLine).join('\n') : '';
                      setPrompt(newValue);
                    }}
                  >
                    <PiX className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Attachments List (Inline) */}
            <div className={cn(editMode ? "" : "rounded-t-xl overflow-hidden")}>
                <InputAttachmentList
                  files={files}
                  context={context}
                  onRemoveFile={handleRemoveFile}
                  onRemoveContext={handleRemoveContext}
                />
            </div>
            <PromptInputTextarea
              id="main-chat-input"
              placeholder={
                editMode 
                  ? "Edit your message..." 
                  : (context.length > 0 || files.length > 0)
                    ? "Ask a question..."
                    : isMobile 
                      ? "Ask anything"
                      : "Ask anything (Shift+Enter for new line)"
              }
              className="min-h-[44px] pt-3 pl-3 text-base leading-[1.5] sm:text-base md:text-base overscroll-contain bg-transparent border-none focus:ring-0 resize-none placeholder:text-muted-foreground/40"
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />

            <PromptInputActions className="flex w-full items-center justify-between gap-2 px-2 pb-2 pt-2">
              <div className="flex items-center gap-1">
                
                {/* Unified Plus Button Dropdown */}
                {!hideActions && (
                  <div className="relative" ref={plusDropdownRef}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-8 rounded-lg transition-all",
                        (context.length > 0 || files.length > 0)
                          ? "text-primary hover:text-primary hover:bg-primary/10" 
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                      )}
                      onClick={() => setPlusDropdownOpen(!plusDropdownOpen)}
                      disabled={isLoading || isSubmittingEdit || disabled}
                      title="Add attachments"
                    >
                      <PiPlus size={16} />
                    </Button>
                    
                    {/* Plus Dropdown Menu */}
                    {plusDropdownOpen && (
                      <div className="absolute bottom-full left-0 mb-2 z-[200] animate-in slide-in-from-bottom-2 duration-150">
                        <div className="bg-popover border border-border/40 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                          <div className="p-1">
                            {/* File Upload Option */}
                            {!hideFileUpload && (
                              <FileUploadTrigger asChild>
                                <button
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors text-left text-foreground hover:bg-muted/50"
                                  onClick={() => setPlusDropdownOpen(false)}
                                >
                                  <PiPaperclip className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Attach files</span>
                                </button>
                              </FileUploadTrigger>
                            )}
                            
                            
                            {/* Context Picker Options */}
                            <button
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors text-left text-foreground hover:bg-muted/50"
                              onClick={() => {
                                setContextPickerOpen(true);
                                setPlusDropdownOpen(false);
                              }}
                            >
                              <PiChatCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Add conversation</span>
                            </button>
                            
                            <button
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors text-left text-foreground hover:bg-muted/50"
                              onClick={() => {
                                setContextPickerOpen(true);
                                setPlusDropdownOpen(false);
                              }}
                            >
                              <PiFolder className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Add folder</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

               {/* Controlled Context Picker */}
              <ContextPicker
                open={contextPickerOpen}
                onOpenChange={setContextPickerOpen}
                selectedItems={context}
                onSelectionChange={(items) => {
                  onContextChange?.(items);
                }}
                conversations={conversations}
                folders={folders}
                currentConversationId={currentConversationId}
                tooltip=""
                trigger={null}
              />

              <div className="flex items-center gap-2">
                 {/* Deep Research Toggle */}
                 {!isGuest && !editMode && onDeepResearchChange && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-8 rounded-lg transition-all",
                         isDeepResearch
                          ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20" 
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                      )}
                      onClick={() => onDeepResearchChange(!isDeepResearch)}
                      disabled={isLoading || isSubmittingEdit || disabled}
                      title={isDeepResearch ? "Deep Research Enabled" : "Enable Deep Research"}
                    >
                      <PiGlobe size={16} />
                    </Button>
                 )}

                <Button
                  type="button"
                  size="icon"
                  className={cn(
                    "size-10 shrink-0 rounded-xl transition-all duration-150",
                    (prompt.trim().length > 0 || files.length > 0) && !isLoading
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  onClick={handleSubmit}
                  disabled={
                    (isLoading || isSubmittingEdit || disabled) ||
                    (!editMode && prompt.trim().length === 0 && files.length === 0)
                  }
                >
                  {(isLoading || isSubmittingEdit) ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  ) : (
                    <PiArrowRight size={20} />
                  )}
                </Button>
              </div>
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
    prevProps.quotedMessage?.quotedText === nextProps.quotedMessage?.quotedText &&
    prevProps.isDeepResearch === nextProps.isDeepResearch &&
    prevProps.hideEmptyState === nextProps.hideEmptyState
  ); 
});
