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
  PiFile
} from "react-icons/pi";
import { ContextItem } from "@/lib/hooks/use-context-search";
import { Folder as FolderType } from "@/lib/services/indexeddb";
import { InputAttachmentList } from "@/components/chat/input/input-attachment-list";
import { ContextPicker } from "@/components/context-picker";
import { validateFile, formatFileSize, getFileCategory } from "@/lib/utils/file-converter";
import { ACCEPTED_FILE_TYPES } from "@/lib/constants/file-config";
import { textToFile, LONG_TEXT_THRESHOLD } from "@/lib/utils/text-to-file-converter";
import { toast } from "sonner";
import type { SurfaceType } from "@/lib/services/domain-types";
import EmptyStateChat from "./chat/empty-state-chat";
import { useSmartInput } from "@/lib/hooks/use-smart-input";

// Surface Mode Configuration
const SURFACE_MODES: Array<{
  type: SurfaceType | 'chat';
  icon: typeof PiChatCircle;
  label: string;
  placeholder: string;
  color: string;
  category: string;
}> = [
  { type: 'chat', icon: PiChatCircle, label: 'Chat', placeholder: 'Ask anything', color: 'text-foreground', category: 'General' },
  { type: 'wiki', icon: PiBookOpen, label: 'Wiki', placeholder: 'Explain topic...', color: 'text-orange-500', category: 'General' },
  { type: 'learning', icon: PiBookOpen, label: 'Course', placeholder: 'Teach me about...', color: 'text-blue-500', category: 'Learning' },
  { type: 'guide', icon: PiListChecks, label: 'Guide', placeholder: 'Guide me through...', color: 'text-green-500', category: 'Learning' },
  { type: 'quiz', icon: PiTarget, label: 'Quiz', placeholder: 'Test me on...', color: 'text-pink-500', category: 'Learning' },
  { type: 'flashcard', icon: PiCards, label: 'Flashcards', placeholder: 'Create flashcards about...', color: 'text-teal-500', category: 'Learning' },
  { type: 'comparison', icon: PiScales, label: 'Compare', placeholder: 'Compare A vs B...', color: 'text-indigo-500', category: 'Analysis' },
  { type: 'timeline', icon: PiCalendar, label: 'Timeline', placeholder: 'Show timeline of...', color: 'text-amber-500', category: 'Analysis' },
  { type: 'finance', icon: PiTrendUp, label: 'Finance', placeholder: 'Show price of...', color: 'text-emerald-500', category: 'Analysis' },
  { type: 'research', icon: PiMagnifyingGlass, label: 'Research', placeholder: 'Research topic in depth...', color: 'text-purple-500', category: 'General' },
];

// Surfaces allowed for guest users (no authentication required)
const GUEST_ALLOWED_SURFACES: (SurfaceType | 'chat')[] = ['chat', 'wiki', 'quiz'];

// Debounce delay for surface suggestion API calls
const SURFACE_SUGGESTION_DEBOUNCE_MS = 600;

const EMPTY_ARRAY: any[] = [];

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

  // Surface mode props
  surfaceMode?: SurfaceType | 'chat';
  onSurfaceModeChange?: (mode: SurfaceType | 'chat') => void;
  // Guest mode - restricts available surfaces
  isGuest?: boolean;
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
  surfaceMode = 'chat',
  onSurfaceModeChange,
  isGuest = false,
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
    suggestedSurface,
    isFetchingSuggestion,
    handlePromptChange,
    handleFilesAdded,
    handleRemoveFile,
    handleRemoveContext,
    handlePaste,
    handleAcceptSuggestion,
    handleDismissSuggestion,
    handleKeyDown: hookHandleKeyDown
  } = useSmartInput({
    initialValue,
    initialAttachments,
    initialContext: initialContextProp,
    onValueChange,
    onFilesChange,
    onContextChange,
    surfaceMode,
    onSurfaceModeChange,
    isGuest,
    currentConversationId
  });

  // Surface Mode dropdown state
  const [surfaceModeOpen, setSurfaceModeOpen] = useState(false);
  const currentSurfaceMode = SURFACE_MODES.find(m => m.type === surfaceMode) || SURFACE_MODES[0];
  const surfaceDropdownRef = useRef<HTMLDivElement>(null);
  
  // Plus dropdown state (unified file/context menu)
  const [plusDropdownOpen, setPlusDropdownOpen] = useState(false);
  const plusDropdownRef = useRef<HTMLDivElement>(null);
  
  // Context Picker state
  const [contextPickerOpen, setContextPickerOpen] = useState(false);

  // Close surface dropdown when clicking outside
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





  // Context search state

  
  // Add quote to input when quotedMessage changes
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
      onSubmit(currentPrompt, newFiles);
      setPrompt("");
      setFiles([]);
    }
  };

  // NOTE: suggestion logic moved to hook



  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Call parent's onKeyDown if provided
    onKeyDown?.(e);

    if (!e.defaultPrevented) {
      hookHandleKeyDown(e);
    }
  };

  // Handle paste events to auto-convert long text to file






  return (
    <div className={cn("relative flex flex-col gap-2 relative", className)}>
       {/* Empty State - Shows when no conversation is active and not loading */}
                  <div
                    className={cn(
                      "absolute inset-0 transition-all duration-500 ease-in-out -z-10",
                      (!currentConversationId && !isLoading)
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
      {/* Edit mode indicator */}
      {editMode && onCancelEdit && (
        <div className="absolute -top-8 right-2 z-30">
          <Button
            size="sm"
            onClick={onCancelEdit}
            disabled={isLoading || isSubmittingEdit}
            className="gap-1.5 h-7 px-2 text-xs bg-red-800/50 hover:bg-red-800/70 text-white"
          >
            <PiX size={14} />
            Cancel
          </Button>
        </div>
      )}
      
      {/* Quote Preview */}
      {quotedMessage && onClearQuote && (
        <div className="px-2.5 mt-2">
          <div className="flex items-start gap-2 bg-muted/50 border border-border/30 rounded-lg px-3 py-2.5 text-sm">
            <PiQuotes className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
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
                // Remove quote from input
                const lines = prompt.split('\n');
                const firstNonQuoteLine = lines.findIndex(line => !line.startsWith('>') && line.trim() !== '');
                const newValue = firstNonQuoteLine >= 0 ? lines.slice(firstNonQuoteLine).join('\n') : '';
                setPrompt(newValue);
              }}
            >
              <PiX className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Expanded Context and Files Display */}
      <InputAttachmentList
        files={files}
        context={context}
        onRemoveFile={handleRemoveFile}
        onRemoveContext={handleRemoveContext}
      />

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
          className="bg-card shadow-lg rounded-xl border border-border/40 ring-0"
        >
          <div className="flex flex-col">
            <PromptInputTextarea
              id="main-chat-input"
              placeholder={
                editMode 
                  ? "Edit your message..." 
                  : (context.length > 0 || files.length > 0)
                    ? "Ask a question..."
                    : isMobile 
                      ? currentSurfaceMode.placeholder 
                      : `${currentSurfaceMode.placeholder} (Shift+Enter for new line)`
              }
              className="min-h-[44px] pt-3 pl-3 text-base leading-[1.5] sm:text-base md:text-base overscroll-contain bg-card border-none focus:ring-0 resize-none placeholder:text-muted-foreground/40"
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />

            <PromptInputActions className="flex w-full items-center justify-between gap-2 px-2 pb-2 pt-2">
              <div className="flex items-center gap-1">
                {/* Surface Mode Dropdown */}

                   {!hideActions && onSurfaceModeChange && (
                      <DropdownMenu open={surfaceModeOpen} onOpenChange={setSurfaceModeOpen}>
                         <div className="relative flex items-center gap-1">
                           <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "size-8 rounded-lg transition-all",
                                surfaceMode !== 'chat' 
                                  ? [currentSurfaceMode.color, "bg-secondary/80"]
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                                // Subtle highlight when suggestion is active
                                suggestedSurface && surfaceMode === 'chat' && !editMode && "bg-primary/5 border border-primary/30 text-primary"
                              )}
                              disabled={isLoading || isSubmittingEdit || disabled}
                              title={`Mode: ${currentSurfaceMode.label}`}
                            >
                              <currentSurfaceMode.icon className="h-4 w-4" />
                            </Button>
                           </DropdownMenuTrigger>
                        
                        {/* Inline Surface Suggestion */}
                        {suggestedSurface && !editMode && surfaceMode === 'chat' && (() => {
                          const surfaceInfo = SURFACE_MODES.find(m => m.type === suggestedSurface.type);
                          const Icon = surfaceInfo?.icon || PiChatCircle;
                          return (
                            <div className="hidden sm:flex items-center gap-1.5 animate-in slide-in-from-left-2 fade-in duration-200">
                              <span className="text-muted-foreground/50 text-xs">→</span>
                              <button
                                onClick={handleAcceptSuggestion}
                                className={cn(
                                  "flex items-center gap-1.5 h-7 px-3 text-xs font-semibold rounded-lg transition-all",
                                  "bg-secondary/80 hover:bg-secondary border border-border/50 hover:border-primary/30",
                                  surfaceInfo?.color || 'text-primary'
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                <span>Try {surfaceInfo?.label}</span>
                              </button>
                              <button
                                onClick={handleDismissSuggestion}
                                className="p-1 text-muted-foreground/40 hover:text-foreground transition-colors rounded"
                                aria-label="Dismiss suggestion"
                              >
                                <PiX className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })()}

                        <DropdownMenuContent 
                           side="top" 
                           align="start" 
                           className="min-w-[600px] p-2 bg-[hsl(var(--surface))] border border-border/40 rounded-xl shadow-xl"
                        >
                          <div className="grid grid-cols-3 gap-2">
                            {['General', 'Analysis', 'Learning'].map((category) => (
                              <div key={category} className="flex flex-col gap-1">
                                <div className="w-full px-2 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider border-b border-border/40 mb-1">
                                  {category}
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  {SURFACE_MODES.filter(m => m.category === category).map((mode) => {
                                    const isRestricted = isGuest && !GUEST_ALLOWED_SURFACES.includes(mode.type);
                                    return (
                                      <button
                                        key={mode.type}
                                        onClick={() => {
                                          if (isRestricted) {
                                            toast.info(`Sign in required to use ${mode.label}`, {
                                              description: "Create an account to access all surface types",
                                            });
                                            setSurfaceModeOpen(false);
                                            return;
                                          }
                                          onSurfaceModeChange?.(mode.type);
                                          setSurfaceModeOpen(false);
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg transition-colors text-left",
                                          mode.type === surfaceMode
                                            ? "bg-primary/10 text-primary"
                                            : isRestricted
                                              ? "text-muted-foreground/60 hover:bg-muted/30"
                                              : "text-foreground hover:bg-muted/50"
                                        )}
                                      >
                                        <mode.icon className={cn("h-4 w-4 shrink-0", isRestricted ? "text-muted-foreground/50" : mode.color)} />
                                        <span className={cn("font-medium flex-1 truncate", isRestricted && "text-muted-foreground/60")}>{mode.label}</span>
                                        {isRestricted && (
                                          <PiLock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </div>
                    </DropdownMenu>
                   )}
                
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
                        <div className="bg-[hsl(var(--surface))] border border-border/40 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
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
    prevProps.surfaceMode === nextProps.surfaceMode
  ); 
});
