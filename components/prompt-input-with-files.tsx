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
import { FilePreviewList, Attachment } from "@/components/file-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Paperclip, Send, Folder, MessageSquare, Plus, X } from "lucide-react";
import { useContextSearch, SearchResultItem, ContextItem } from "@/lib/hooks/use-context-search";
import { Conversation, Folder as FolderType } from "@/lib/services/indexeddb";
import { ContextPicker } from "@/components/context-picker";
import { validateFile } from "@/lib/utils/file-converter";
import { ACCEPTED_FILE_TYPES } from "@/lib/constants/file-config";
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
  // Hide attachment and context buttons
  hideActions?: boolean;
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
  initialAttachments = [],
  onCancelEdit,
  onSaveEdit,
  isSubmittingEdit = false,
  hideActions = false,
}: PromptInputWithFilesProps) {
  const [prompt, setPrompt] = useState(initialValue);
  const [files, setFiles] = useState<(File | Attachment)[]>([]);

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
        setFiles((prev) => [...prev, ...validFiles]);
      }
      return;
    }
    
    // All files valid
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileToRemove: File | Attachment) => {
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
              placeholder={editMode ? "Edit your message..." : placeholder}
              className="min-h-[40px] pt-2.5 pl-3 text-base leading-[1.3] sm:text-base md:text-base dark:bg-background overscroll-contain"
              onKeyDown={handleKeyDown}
            />

            <PromptInputActions className="mt-4 flex w-full items-center justify-between gap-1.5 px-2.5 pb-2.5">
              <div className="flex items-center gap-1.5">
                {!hideActions && (
                  <>
                    <PromptInputAction tooltip="Attach files">
                      <FileUploadTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8 rounded-full"
                          disabled={isLoading || isSubmittingEdit || disabled}
                        >
                          <Paperclip size={16} />
                        </Button>
                      </FileUploadTrigger>
                    </PromptInputAction>
                    
                    <ContextPicker
                      selectedItems={context}
                      onSelectionChange={onContextChange || (() => {})}
                      conversations={conversations}
                      folders={folders}
                      currentConversationId={currentConversationId}
                      tooltip="Add chats"
                      trigger={
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8 rounded-full"
                          disabled={isLoading || isSubmittingEdit || disabled}
                        >
                          <Plus size={16} />
                        </Button>
                      }
                    />
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <PromptInputAction tooltip={editMode ? "Save changes" : "Send message"}>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      (!prompt.trim() && files.length === 0) || isLoading || isSubmittingEdit
                    }
                    size="icon"
                    className="size-8 rounded-full"
                  >
                    <Send size={16} />
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
