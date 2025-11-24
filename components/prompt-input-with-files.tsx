"use client";

import { useState, useEffect } from "react";
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
import { Paperclip, Send, Folder, MessageSquare, Plus, X } from "lucide-react";
import { useContextSearch, SearchResultItem, ContextItem } from "@/lib/hooks/use-context-search";
import { Conversation, Folder as FolderType } from "@/lib/services/indexeddb";
import { ContextPicker } from "@/components/context-picker";

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
  onCancelEdit?: () => void;
  onSaveEdit?: (text: string, files: File[]) => Promise<void>;
  isSubmittingEdit?: boolean;
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
  editMode = false,
  initialValue = '',
  onCancelEdit,
  onSaveEdit,
  isSubmittingEdit = false,
}: PromptInputWithFilesProps) {
  const [prompt, setPrompt] = useState(initialValue);
  const [files, setFiles] = useState<File[]>([]);

  // Update prompt when initialValue changes (for edit mode)
  useEffect(() => {
    setPrompt(initialValue);
  }, [initialValue]);

  // Context search state
  const [cursorPosition, setCursorPosition] = useState(0);
  const { query, setQuery, results, isLoading: isSearching, allFolders } = useContextSearch(currentConversationId);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleFilesAdded = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles((prev) => prev.filter((f) => f !== fileToRemove));
  };

  const handleSubmit = async () => {
    if ((!prompt.trim() && files.length === 0) || isLoading) return;

    const currentPrompt = prompt.trim();

    if (editMode && onSaveEdit) {
      // Edit mode: save the edit
      await onSaveEdit(currentPrompt, files);
      setPrompt("");
      setFiles([]);
    } else if (onSubmit) {
      // Normal mode: submit new message
      onSubmit(currentPrompt, files);
      setPrompt("");
      setFiles([]);
    }
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
    }
    
    
    
    // Refocus input
    setTimeout(() => {
      const textarea = document.getElementById("main-chat-input");
      if (textarea) textarea.focus();
    }, 0);
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
  
  };

  return (
    <div className={cn("flex flex-col gap-2 relative", className)}>
      {/* Edit mode cancel button */}
      {editMode && onCancelEdit && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
            disabled={isLoading || isSubmittingEdit}
            className="text-muted-foreground hover:text-foreground gap-2 h-8 px-3"
          >
            <X size={16} />
            Cancel edit
          </Button>
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
          isLoading={isLoading || isSubmittingEdit}
          value={prompt}
          onValueChange={handlePromptChange}
          onSubmit={handleSubmit}
          disabled={disabled || isSubmittingEdit}

        >
          <div className="flex flex-col">
            <PromptInputTextarea
              id="main-chat-input"
              placeholder={editMode ? "Edit your message..." : placeholder}
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
                      disabled={isLoading || isSubmittingEdit || disabled}
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
                      disabled={isLoading || isSubmittingEdit || disabled}
                    >
                      <Plus size={18} />
                    </Button>
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <PromptInputAction tooltip={editMode ? "Save changes" : "Send message"}>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      (!prompt.trim() && files.length === 0) || isLoading || isSubmittingEdit
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
