"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { PiFolder, PiChatCircle, PiX, PiFile, PiFilePdf, PiFileImage, PiFileText, PiFileCode } from "react-icons/pi";
import { formatFileSize, getFileCategory } from "@/lib/utils/file-converter";
import { Attachment } from "@/components/file-preview";
import { ContextItem } from "@/lib/hooks/use-context-search";

interface InputAttachmentListProps {
  files: (File | Attachment)[];
  context: ContextItem[];
  onRemoveFile: (file: File | Attachment) => void;
  onRemoveContext: (item: ContextItem) => void;
}

export const InputAttachmentList = memo(function InputAttachmentList({
  files,
  context,
  onRemoveFile,
  onRemoveContext,
}: InputAttachmentListProps) {
  if (files.length === 0 && context.length === 0) return null;

  return (
    <div className="px-3 pt-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 items-start">
        {/* Context Pills */}
        {context.map((item) => (
          <div 
            key={item.id}
            className="flex items-center gap-2 bg-secondary/50 border border-border/50 rounded-md px-2 py-1 max-w-[200px] group animate-in fade-in zoom-in-95 duration-200"
          >
            {item.type === 'folder' ? (
              <PiFolder className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            ) : (
              <PiChatCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
              onClick={() => onRemoveContext(item)}
            >
              <PiX className="h-3 w-3" />
            </Button>
          </div>
        ))}
        
        {/* File Pills */}
        {files.map((file, index) => {
          const isFile = file instanceof File;
          const name = file.name;
          const size = isFile ? formatFileSize(file.size) : '';
          
          let Icon = PiFile;
          if (isFile) {
            const category = getFileCategory(file);
            if (category === 'pdf') Icon = PiFilePdf;
            else if (category === 'image') Icon = PiFileImage;
            else if (category === 'text') Icon = PiFileText;
            else if (category === 'code') Icon = PiFileCode;
          }

          return (
            <div 
              key={`${name}-${index}`}
              className="flex items-center gap-2 bg-secondary/50 border border-border/50 rounded-md px-2 py-1 max-w-[200px] group animate-in fade-in zoom-in-95 duration-200"
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate text-foreground/90 leading-tight">
                  {name}
                </div>
                <div className="text-[10px] text-muted-foreground truncate leading-tight">
                  {size || 'Attachment'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full hover:bg-background/80 shrink-0 -mr-1"
                onClick={() => onRemoveFile(file)}
              >
                <PiX className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
});
