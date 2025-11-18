"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FilePreviewList } from "@/components/file-preview";
import { X } from "lucide-react";

interface EditMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newContent: string, newAttachments: File[]) => Promise<void>;
  initialContent: string;
  initialAttachments?: File[];
  isLoading?: boolean;
}

export function EditMessageDialog({
  open,
  onOpenChange,
  onSave,
  initialContent,
  initialAttachments = [],
  isLoading = false,
}: EditMessageDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [attachments, setAttachments] = useState<File[]>(initialAttachments);

  const handleSave = async () => {
    await onSave(content, attachments);
    onOpenChange(false);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
          <DialogDescription>
            Make changes to your message. This will regenerate the conversation
            from this point.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="message-content" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="message-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your message..."
              className="min-h-[120px] resize-y"
              disabled={isLoading}
            />
          </div>

          {attachments.length > 0 && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Attachments</label>
                <span className="text-xs text-muted-foreground">
                  {attachments.length} file{attachments.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="border rounded-lg p-3">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="relative overflow-hidden rounded-lg border bg-muted/20 max-w-[300px]">
                        <div className="flex items-center gap-3 p-3">
                          <div className="flex size-12 items-center justify-center rounded-md bg-muted">
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-muted-foreground"
                            >
                              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                              <circle cx="12" cy="13" r="3" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => handleRemoveAttachment(index)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !content.trim()}>
            {isLoading ? "Saving..." : "Save & Branch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
