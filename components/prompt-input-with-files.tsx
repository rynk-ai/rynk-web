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
import { FilePreviewList, FilePreview, Attachment } from "@/components/file-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Paperclip, Send, Folder, MessageSquare, Plus, X, Quote as QuoteIcon, Brain, Globe, BookOpen, ListChecks, ChevronDown, Target, Scale, Layers, Calendar } from "lucide-react";
import { useContextSearch, SearchResultItem, ContextItem } from "@/lib/hooks/use-context-search";
import { Conversation, Folder as FolderType } from "@/lib/services/indexeddb";
import { ContextPicker } from "@/components/context-picker";
import { validateFile } from "@/lib/utils/file-converter";
import { ACCEPTED_FILE_TYPES } from "@/lib/constants/file-config";
import { textToFile, LONG_TEXT_THRESHOLD } from "@/lib/utils/text-to-file-converter";
import { toast } from "sonner";
import type { SurfaceType } from "@/lib/services/domain-types";
import EmptyStateChat from "./chat/empty-state-chat";

// Surface Mode Configuration
const SURFACE_MODES: Array<{
  type: SurfaceType | 'chat';
  icon: typeof MessageSquare;
  label: string;
  placeholder: string;
  color: string;
}> = [
  { type: 'chat', icon: MessageSquare, label: 'Chat', placeholder: 'Ask anything', color: 'text-foreground' },
  { type: 'learning', icon: BookOpen, label: 'Course', placeholder: 'Teach me about...', color: 'text-blue-500' },
  { type: 'guide', icon: ListChecks, label: 'Guide', placeholder: 'Guide me through...', color: 'text-green-500' },
  { type: 'quiz', icon: Target, label: 'Quiz', placeholder: 'Test me on...', color: 'text-pink-500' },
  { type: 'comparison', icon: Scale, label: 'Compare', placeholder: 'Compare A vs B...', color: 'text-indigo-500' },
  { type: 'flashcard', icon: Layers, label: 'Flashcards', placeholder: 'Create flashcards about...', color: 'text-teal-500' },
  { type: 'timeline', icon: Calendar, label: 'Timeline', placeholder: 'Show timeline of...', color: 'text-amber-500' },
  { type: 'wiki', icon: BookOpen, label: 'Wiki', placeholder: 'Explain topic...', color: 'text-orange-500' },
];

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
  // Reasoning mode props
  reasoningMode?: boolean | "online" | "off" | "on" | "auto";
  onToggleReasoningMode?: () => void;
  // Surface mode props
  surfaceMode?: SurfaceType | 'chat';
  onSurfaceModeChange?: (mode: SurfaceType | 'chat') => void;
};

// Slash Commands Configuration
const SLASH_COMMANDS = [
  { 
    id: 'web', 
    label: '/web', 
    description: 'Enable web search', 
    icon: Globe,
    action: (setText: (t: string) => void, current: string) => {
      // For now, just prepend "Search the web for: " as a hint
      // or we could add a specific prop later. 
      // User said it's auto-determined, so a strong text hint is good.
      const hint = "Search the web for: ";
      // Check if already starts with it
      if (current.startsWith(hint)) return current;
      return hint + current;
    }
  },
  { 
    id: 'deep', 
    label: '/deep', 
    description: 'Toggle deep thinking', 
    icon: Brain,
    action: (setText: (t: string) => void, current: string, toggleReasoning?: () => void) => {
      toggleReasoning?.();
      return current; // No text change, just toggle
    } 
  },
  { 
    id: 'code', 
    label: '/code', 
    description: 'Optimize for code', 
    icon: Plus, // Using Plus as placeholder, maybe Code xml tag?
    action: (setText: (t: string) => void, current: string) => {
      return current + "\n\nProvide a code solution.";
    }
  },
  { 
    id: 'brief', 
    label: '/brief', 
    description: 'Keep it concise', 
    icon: MessageSquare,
    action: (setText: (t: string) => void, current: string) => {
      return current + "\n\nBe brief.";
    }
  },
];

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
  reasoningMode,
  onToggleReasoningMode,
  surfaceMode = 'chat',
  onSurfaceModeChange,
}: PromptInputWithFilesProps) {
  const [prompt, setPrompt] = useState(initialValue);
  const [files, setFiles] = useState<(File | Attachment)[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Slash Command State
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);

  // Surface Mode dropdown state
  const [surfaceModeOpen, setSurfaceModeOpen] = useState(false);
  const currentSurfaceMode = SURFACE_MODES.find(m => m.type === surfaceMode) || SURFACE_MODES[0];

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

  // Handle input changes to detect @ and /
  const handlePromptChange = (value: string) => {
    setPrompt(value);
    onValueChange?.(value);
    
    // Find key triggers
    const lastAt = value.lastIndexOf('@');
    const lastSlash = value.lastIndexOf('/');
    const cursor = value.length; // Approximate detection at end, ideally we use selectionStart but for simple typing this is ok

    // Handle Slash Commands
    if (lastSlash !== -1) {
      const isValidStart = lastSlash === 0 || value[lastSlash - 1] === ' ' || value[lastSlash - 1] === '\n';
      if (isValidStart) {
        const textAfterSlash = value.slice(lastSlash + 1);
        // Stop at space or newline
        if (!textAfterSlash.includes(' ') && !textAfterSlash.includes('\n')) {
          setSlashQuery(textAfterSlash);
          setSlashIndex(0); // Reset selection
          setQuery(""); // Clear @ query if active
          return;
        }
      }
    }
    setSlashQuery(null); // Clear if no valid slash command

    // Handle Context Search (@)
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

  const handleSelectSlashCommand = (cmd: typeof SLASH_COMMANDS[0]) => {
    if (!slashQuery && slashQuery !== "") return;
    
    // Remove the command text (e.g. /w)
    const lastSlash = prompt.lastIndexOf('/');
    if (lastSlash === -1) return;

    const beforeSlash = prompt.slice(0, lastSlash);
    // const afterSlash = prompt.slice(lastSlash + 1 + slashQuery!.length); // Should be empty/cursor
    
    // Apply action
    const newText = cmd.action(
      (t) => {
        setPrompt(t);
        onValueChange?.(t);
      }, 
      beforeSlash, 
      onToggleReasoningMode
    );

    setPrompt(newText);
    onValueChange?.(newText);
    setSlashQuery(null);

    // Refocus
    setTimeout(() => {
      const textarea = document.getElementById("main-chat-input");
      if (textarea) textarea.focus();
    }, 0);
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

  // Filter slash commands
  const filteredSlashCommands = slashQuery !== null 
    ? SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes('/' + slashQuery.toLowerCase()) || c.description.toLowerCase().includes(slashQuery.toLowerCase()))
    : [];

  // Handle keyboard navigation for suggestions and platform-specific Enter behavior
  const handleKeyDown = (e: React.KeyboardEvent) => {
    
    // Slash Command Navigation
    if (slashQuery !== null && filteredSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex(prev => Math.min(prev + 1, filteredSlashCommands.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectSlashCommand(filteredSlashCommands[slashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashQuery(null);
        return;
      }
    }

    // Context Navigation (@)
    if (query && results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectContext(results[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setQuery("");
        return;
      }
    }

    // Call parent's onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(e);
    }

    // Don't interfere if parent prevented default
    if (e.defaultPrevented) {
      return;
    }

    // Mobile: Enter inserts newline (send button required to submit)
    // Desktop: Default behavior - Enter = submit, Shift+Enter = newline
    if (e.key === 'Enter' && isMobile && !e.shiftKey) {
      e.preventDefault();
      // Insert newline at cursor position
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = prompt.slice(0, start) + '\n' + prompt.slice(end);
      setPrompt(newValue);
      onValueChange?.(newValue);
      // Move cursor after the newline
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      });
    }
  };

  // Handle paste events to auto-convert long text to file
  const handleRemoveContext = (itemToRemove: ContextItem) => {
    if (!onContextChange) return;
    const newContext = context.filter(c => c.id !== itemToRemove.id);
    onContextChange(newContext);
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
    <div className={cn("relative flex flex-col gap-2 relative", className)}>
       {/* Empty State - Shows when no conversation is active */}
                  <div
                    className={cn(
                      "absolute inset-0 transition-all duration-500 ease-in-out -z-10",
                      !currentConversationId
                        ? "opacity-100 translate-y-0 pointer-events-auto -top-50 lg:-top-40"
                        : "opacity-0 -translate-y-10 pointer-events-auto",
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

      {/* Expanded Context and Files Display */}
      {(files.length > 0 || context.length > 0) && (
        <div className="px-4 pt-4 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 items-start">
             {/* Context Pills */}
             {context.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center gap-2 bg-secondary border border-border/50 rounded-xl px-3 py-1.5 max-w-[200px] group animate-in fade-in zoom-in-95 duration-200"
                >
                  {item.type === 'folder' ? (
                    <Folder className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate text-foreground/90 leading-tight">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate leading-tight">
                      {item.type === 'folder' ? 'Folder' : 'Conversation'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full hover:bg-background/80 shrink-0 -mr-1"
                    onClick={() => handleRemoveContext(item)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
             ))}
             
             {/* File Pills */}
             {files.map((file, index) => (
                <FilePreview
                  key={`${file.name}-${index}`}
                  file={file}
                  onRemove={handleRemoveFile}
                  showRemove={true}
                  className="size-12 rounded-xl"
                />
             ))}
          </div>
        </div>
      )}

      {/* Slash Command Dropdown */}
      {slashQuery !== null && filteredSlashCommands.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 mx-2 z-[200]">
          <div className="bg-[hsl(var(--surface))] border border-border/40 rounded-xl shadow-xl overflow-hidden min-w-[200px] animate-in slide-in-from-bottom-2 duration-200">
             <div className="p-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Commands
                </div>
                {filteredSlashCommands.map((cmd, index) => (
                  <button
                    key={cmd.id}
                    onClick={() => handleSelectSlashCommand(cmd)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-colors text-left",
                      index === slashIndex
                        ? "bg-primary/10 text-primary" 
                        : "text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                      index === slashIndex ? "bg-primary/20" : "bg-muted"
                    )}>
                      <cmd.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium leading-none">{cmd.label}</div>
                       <div className="text-[10px] text-muted-foreground mt-0.5 opacity-80">{cmd.description}</div>
                    </div>
                    {cmd.id === 'deep' && (reasoningMode === true || reasoningMode === 'on' || reasoningMode === 'online') && (
                      <div className="text-[10px] font-medium text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">ON</div>
                    )}
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* @ Mention Dropdown */}
      {query && (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 z-[200]">
          <div className="bg-[hsl(var(--surface))] border border-border/40 rounded-xl shadow-xl max-h-[280px] overflow-y-auto overflow-hidden">
            {isSearching ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Searching...
              </div>
            ) : results.length > 0 ? (
              <div className="py-1.5">
                {results.map((item, index) => (
                  <button
                    key={`${item.type}-${item.data.id}`}
                    onClick={() => handleSelectContext(item)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-all text-left",
                      index === selectedIndex 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/50">
                      {item.type === 'folder' ? (
                        <Folder className="h-4 w-4 text-blue-500" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {item.type === 'folder' 
                          ? (item.data as FolderType).name 
                          : (item.data as Conversation).title}
                      </div>
                      {item.matchedContent && (
                        <div className="text-xs text-muted-foreground truncate">
                          {item.matchedContent.slice(0, 60)}...
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No results for "{query}"
              </div>
            )}
          </div>
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
          className="bg-card shadow-2xl rounded-2xl border-none ring-1 ring-black/5"
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
              className="min-h-[52px] pt-4 pl-4 text-base leading-[1.6] sm:text-base md:text-base overscroll-contain bg-transparent border-none focus:ring-0 resize-none placeholder:text-muted-foreground/40"
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />

            <PromptInputActions className="flex w-full items-center justify-between gap-2 px-3 pb-3 pt-2">
              <div className="flex items-center gap-1">
                {/* Surface Mode Dropdown */}
                {!hideActions && onSurfaceModeChange && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 gap-1.5 px-2 text-xs font-medium rounded-lg transition-all",
                        surfaceMode !== 'chat' 
                          ? [currentSurfaceMode.color, "bg-secondary/80"]
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                      )}
                      onClick={() => setSurfaceModeOpen(!surfaceModeOpen)}
                      disabled={isLoading || isSubmittingEdit || disabled}
                    >
                      <currentSurfaceMode.icon className="h-3.5 w-3.5" />
                      {currentSurfaceMode.label}
                      <ChevronDown className={cn("h-3 w-3 transition-transform", surfaceModeOpen && "rotate-180")} />
                    </Button>
                    
                    {/* Dropdown Menu */}
                    {surfaceModeOpen && (
                      <div className="absolute bottom-full left-0 mb-2 z-[200] animate-in slide-in-from-bottom-2 duration-150">
                        <div className="bg-[hsl(var(--surface))] border border-border/40 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                          <div className="p-1">
                            {SURFACE_MODES.map((mode) => (
                              <button
                                key={mode.type}
                                onClick={() => {
                                  onSurfaceModeChange?.(mode.type);
                                  setSurfaceModeOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg transition-colors text-left",
                                  mode.type === surfaceMode
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground hover:bg-muted/50"
                                )}
                              >
                                <mode.icon className={cn("h-4 w-4", mode.color)} />
                                <span className="font-medium">{mode.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!hideActions && !hideFileUpload && (
                  <PromptInputAction tooltip="Attach files">
                    <FileUploadTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
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
                    tooltip="Add context (@ to type)"
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "size-8 rounded-lg transition-all",
                          context.length > 0 
                            ? "text-primary hover:text-primary hover:bg-primary/10" 
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                        )}
                        disabled={isLoading || isSubmittingEdit || disabled}
                      >
                        <Plus size={16} />
                      </Button>
                    }
                  />
                )}
              </div>

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
                  <Send size={18} />
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
    prevProps.reasoningMode === nextProps.reasoningMode &&
    prevProps.surfaceMode === nextProps.surfaceMode
  ); 
});
