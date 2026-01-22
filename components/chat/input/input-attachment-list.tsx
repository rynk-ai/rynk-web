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
    <div className="w-full relative group/list">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 px-3 mask-linear-fade">
        {/* Context Pills */}
        {context.map((item) => (
          <div 
            key={item.id}
            className="flex items-center gap-1.5 bg-secondary/40 border border-border/20 rounded-md pl-2 pr-1 py-1 shrink-0 max-w-[160px] animate-in fade-in zoom-in-95 duration-200 select-none"
          >
            {item.type === 'folder' ? (
              <PiFolder className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            ) : (
              <PiChatCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="text-xs font-medium truncate text-foreground/90 leading-none max-w-[100px]">
              {item.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 rounded-full hover:bg-background/80 shrink-0 text-muted-foreground hover:text-foreground ml-0.5"
              onClick={() => onRemoveContext(item)}
            >
              <PiX className="h-2.5 w-2.5" />
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
              className="flex items-center gap-1.5 bg-secondary/40 border border-border/20 rounded-md pl-2 pr-1 py-1 shrink-0 max-w-[160px] animate-in fade-in zoom-in-95 duration-200 select-none"
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate text-foreground/90 leading-none max-w-[100px]">
                  {name}
                </span>
                {/* Optional: Show size if needed, but keeping it compact for now just name */}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 rounded-full hover:bg-background/80 shrink-0 text-muted-foreground hover:text-foreground ml-0.5"
                onClick={() => onRemoveFile(file)}
              >
                <PiX className="h-2.5 w-2.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
});
