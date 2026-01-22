"use client";

import { memo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  PiFolder, 
  PiChatCircle, 
  PiX, 
  PiFile, 
  PiFilePdf, 
  PiFileImage, 
  PiFileText, 
  PiFileCode,
  PiCaretLeft,
  PiCaretRight,
  PiArrowsOutSimple
} from "react-icons/pi";
import { formatFileSize, getFileCategory } from "@/lib/utils/file-converter";
import { Attachment } from "@/components/file-preview";
import { ContextItem } from "@/lib/hooks/use-context-search";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1); // -1 for rounding
    }
  };

  useEffect(() => {
    checkScroll();
    // Add resize listener
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [files, context]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      // Check after scrolling animation (approximate)
      setTimeout(checkScroll, 300);
    }
  };

  if (files.length === 0 && context.length === 0) return null;

  const totalItems = files.length + context.length;

  return (
    <div className="w-full relative group/list flex flex-col gap-1">
      {/* Header / Expand Button */}
      <div className="flex items-center justify-between px-4 pt-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {totalItems} Attachment{totalItems !== 1 ? 's' : ''}
        </span>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-full text-muted-foreground hover:text-foreground"
              title="View all attachments"
            >
              <PiArrowsOutSimple className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Attachments ({totalItems})</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[400px] -mx-6 px-6">
              <div className="space-y-4 py-4">
                {/* Context Section */}
                {context.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Context</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {context.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/40 bg-secondary/20"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-md bg-background border border-border/20">
                              {item.type === 'folder' ? (
                                <PiFolder className="h-4 w-4 text-blue-500" />
                              ) : (
                                <PiChatCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-sm font-medium truncate">
                              {item.title}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => onRemoveContext(item)}
                          >
                            <PiX className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files Section */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Files</h4>
                    <div className="grid grid-cols-1 gap-2">
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
                            className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/40 bg-secondary/20"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-md bg-background border border-border/20">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate">
                                  {name}
                                </span>
                                {size && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {size}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => onRemoveFile(file)}
                            >
                              <PiX className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative w-full">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-background via-background/80 to-transparent pr-4 pl-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full shadow-sm border border-border/20 bg-background hover:bg-muted text-muted-foreground"
              onClick={(e) => {
                e.preventDefault();
                scroll('left');
              }}
            >
              <PiCaretLeft className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Right Scroll Button */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-l from-background via-background/80 to-transparent pl-4 pr-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full shadow-sm border border-border/20 bg-background hover:bg-muted text-muted-foreground"
              onClick={(e) => {
                e.preventDefault();
                scroll('right');
              }}
            >
              <PiCaretRight className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div 
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 px-3 mask-linear-fade"
          onScroll={checkScroll}
        >
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
            // const size = isFile ? formatFileSize(file.size) : '';
            
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
    </div>
  );
});
