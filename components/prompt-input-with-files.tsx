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
import { Paperclip, Send } from "lucide-react";

type PromptInputWithFilesProps = {
  onSubmit: (text: string, files: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function PromptInputWithFiles({
  onSubmit,
  isLoading = false,
  placeholder = "Ask anything",
  disabled = false,
  className,
}: PromptInputWithFilesProps) {
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);

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
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
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
          onValueChange={setPrompt}
          onSubmit={handleSubmit}
          disabled={disabled}
        >
          <div className="flex flex-col">
            <PromptInputTextarea
              placeholder={placeholder}
              className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
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
