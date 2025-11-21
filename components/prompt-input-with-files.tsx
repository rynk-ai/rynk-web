"use client";

import { useState } from "react";
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
import { FilePreviewList } from "@/components/file-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Paperclip, Send, Folder, MessageSquare, Plus } from "lucide-react";
import { useContextSearch, SearchResultItem, ContextItem } from "@/lib/hooks/use-context-search";
import { Conversation, Folder as FolderType } from "@/lib/services/indexeddb";
import { ContextPicker } from "@/components/context-picker";

type PromptInputWithFilesProps = {
  onSubmit: (text: string, files: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  context?: ContextItem[];
  onContextChange?: (context: ContextItem[]) => void;
  currentConversationId?: string | null;
  conversations?: any[];
  folders?: any[];
};

export function PromptInputWithFiles({
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
}: PromptInputWithFilesProps) {
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  
  // Context search state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const { query, setQuery, results, isLoading: isSearching, allFolders } = useContextSearch(currentConversationId);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleFilesAdded = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles((prev) => prev.filter((f) => f !== fileToRemove));
  };

  const handleSubmit = () => {
    if ((!prompt.trim() && files.length === 0) || isLoading) return;

    const currentPrompt = prompt.trim();
    onSubmit(currentPrompt, files);
    setPrompt("");
    setFiles([]);
    setShowSuggestions(false);
  };

  // Handle input changes to detect @
  const handlePromptChange = (value: string) => {
    setPrompt(value);
    
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
          setShowSuggestions(true);
          setSelectedIndex(0);
          return;
        }
      }
    }
    
    setShowSuggestions(false);
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
    }
    
    setShowSuggestions(false);
    
    // Refocus input
    setTimeout(() => {
      const textarea = document.getElementById("main-chat-input");
      if (textarea) textarea.focus();
    }, 0);
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectContext(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-2 relative", className)}>
      {/* Suggestions Popup */}
      {showSuggestions && (
        <div className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-2 border-b text-xs font-medium text-muted-foreground bg-muted/30">
            Suggested Context
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1">
            {results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              results.map((item, index) => {
                const isFolder = item.type === 'folder';
                const title = isFolder ? (item.data as FolderType).name : (item.data as Conversation).title;
                const isSelected = index === selectedIndex;
                
                return (
                  <button
                    key={item.data.id}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                      isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                    onClick={() => handleSelectContext(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className={cn(
                      "p-1.5 rounded-md shrink-0", 
                      isFolder ? "bg-blue-500/10 text-blue-500" : "bg-primary/10 text-primary"
                    )}>
                      {isFolder ? <Folder size={14} /> : <MessageSquare size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{title}</div>
                      {item.matchedContent && (
                        <div className="text-xs text-muted-foreground truncate opacity-80">
                          ...{item.matchedContent}...
                        </div>
                      )}
                    </div>
                    {item.matchScore > 0 && (
                      <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded shrink-0">
                        {Math.round(item.matchScore * 100)}%
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="px-3">
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
        accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.json,.xml,.md"
      >
        <PromptInput
          isLoading={isLoading}
          value={prompt}
          onValueChange={handlePromptChange}
          onSubmit={handleSubmit}
          disabled={disabled}
        >
          <div className="flex flex-col">
            <PromptInputTextarea
              id="main-chat-input"
              placeholder={placeholder}
              className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base dark:bg-background"
              onKeyDown={handleKeyDown}
            />

            <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
              <div className="flex items-center gap-2">
                <PromptInputAction tooltip="Attach files">
                  <FileUploadTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                      disabled={isLoading || disabled}
                    >
                      <Paperclip size={18} />
                    </Button>
                  </FileUploadTrigger>
                </PromptInputAction>
                
                <ContextPicker
                  selectedItems={context}
                  onSelectionChange={onContextChange || (() => {})}
                  conversations={conversations}
                  folders={folders}
                  currentConversationId={currentConversationId}
                  tooltip="Add Context"
                  trigger={
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                      disabled={isLoading || disabled}
                    >
                      <Plus size={18} />
                    </Button>
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <PromptInputAction tooltip="Send message">
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      (!prompt.trim() && files.length === 0) || isLoading
                    }
                    size="icon"
                    className="size-9 rounded-full"
                  >
                    <Send size={18} />
                  </Button>
                </PromptInputAction>
              </div>
            </PromptInputActions>
          </div>
        </PromptInput>
      </FileUpload>
    </div>
  );
}
