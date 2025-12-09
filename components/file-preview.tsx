"use client";

import { cn } from "@/lib/utils";
import { FileIcon, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Attachment = {
  name: string;
  type: string;
  size: number;
  url?: string;
  [key: string]: any;
};

type FilePreviewProps = {
  file: File | Attachment;
  onRemove?: (file: File | Attachment) => void;
  showRemove?: boolean;
};

export function FilePreview({
  file,
  onRemove,
  showRemove = false,
  className,
}: FilePreviewProps & { className?: string }) {
  const isImage = file.type.startsWith("image/");
  const isPDF = file.type === "application/pdf";
  
  // Handle both File objects (local) and Attachment objects (remote)
  let fileURL: string;
  if (file instanceof File) {
    fileURL = URL.createObjectURL(file);
  } else {
    fileURL = file.url || "";
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove(file);
    }
  };

  // PDFs are processed for AI but NOT shown as previews in chat
  // They show as document icons only (like other non-image files)
  const shouldShowPreview = isImage && !isPDF && fileURL;

  if (!shouldShowPreview) {
    // Show as document icon for PDFs and other files
    return (
      <div className={cn("relative group", className)}>
        <div className="relative overflow-hidden rounded-lg border bg-muted/20 w-fit max-w-[300px]">
          <div className="flex items-center gap-3 p-3">
            <div className="flex size-12 items-center justify-center rounded-md bg-muted">
              <FileIcon size={24} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
                {isPDF && " • PDF"}
              </p>
              {(file as any).useRAG && (
                <p className="text-[10px] text-green-600 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Indexed ({(file as any).chunkCount || '?'} chunks)
                </p>
              )}
            </div>
            {showRemove && onRemove && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={handleRemove}
              >
                <Trash size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show image preview
  return (
    <div className={cn("relative group w-32 h-32", className)}>
      <div className="relative overflow-hidden rounded-lg border bg-muted/20 w-full h-full">
        <div className="relative w-full h-full">
          <img
            src={fileURL}
            alt={file.name}
            className="w-full h-full object-cover brightness-75"
          />
          {showRemove && onRemove && (
            <Button
              size="icon"
              variant="destructive"
              className="absolute right-1 top-1 h-5 w-5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              onClick={handleRemove}
            >
              <Trash size={12} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type FilePreviewListProps = {
  files: (File | Attachment)[];
  onRemove?: (file: File | Attachment) => void;
  showRemove?: boolean;
  className?: string;
};

export function FilePreviewList({
  files,
  onRemove,
  showRemove = true,
  className,
}: FilePreviewListProps) {
  if (files.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2 pt-2", className)}>
      {files.map((file, index) => (
        <FilePreview
          key={`${file.name}-${index}`}
          file={file}
          onRemove={onRemove}
          showRemove={showRemove}
        />
      ))}
    </div>
  );
}
