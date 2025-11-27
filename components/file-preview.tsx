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
}: FilePreviewProps) {
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
      <div className="relative group">
        <div className="relative overflow-hidden rounded-lg border bg-muted/20 max-w-[300px]">
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
    <div className="relative group">
      <div className="relative overflow-hidden rounded-lg border bg-muted/20 max-w-[200px] max-h-[200px]">
        <div className="relative">
          <img
            src={fileURL}
            alt={file.name}
            className="h-32 w-32 object-cover brightness-75"
          />
          {showRemove && onRemove && (
            <Button
              size="icon"
              variant="destructive"
              className="absolute right-2 top-2 h-6 w-6 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              onClick={handleRemove}
            >
              <Trash size={14} />
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
};

export function FilePreviewList({
  files,
  onRemove,
  showRemove = true,
}: FilePreviewListProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-2">
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
