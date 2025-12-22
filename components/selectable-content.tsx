"use client";

import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SelectableContentProps {
  children: React.ReactNode;
  sectionId?: string;
  onSelect: (text: string, sectionId?: string, fullContent?: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Wraps content to make text selectable with a "Deep dive" subchat trigger.
 * Used in surfaces (Wiki, Research, etc.) and learning pages.
 */
export function SelectableContent({
  children,
  sectionId,
  onSelect,
  className,
  disabled = false,
}: SelectableContentProps) {
  const [showButton, setShowButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    if (disabled) return;
    
    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";

    if (text.length > 10 && selection && selection.rangeCount > 0) {
      // Check if selection is within our content
      const range = selection.getRangeAt(0);
      if (contentRef.current && contentRef.current.contains(range.commonAncestorContainer)) {
        const rect = range.getBoundingClientRect();

        // Position button at the bottom-right of the selection
        setButtonPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.right + window.scrollX,
        });

        setSelectedText(text);
        setShowButton(true);
      }
    } else {
      setShowButton(false);
      setSelectedText("");
    }
  }, [disabled]);

  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (selectedText) {
        const fullContent = contentRef.current?.textContent || "";
        onSelect(selectedText, sectionId, fullContent);
        setShowButton(false);
        setSelectedText("");
        // Clear selection
        window.getSelection()?.removeAllRanges();
      }
    },
    [selectedText, sectionId, onSelect]
  );

  // Hide button when clicking elsewhere
  const handleClickOutside = useCallback(() => {
    // Small delay to allow button click to register
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection?.toString().trim()) {
        setShowButton(false);
        setSelectedText("");
      }
    }, 100);
  }, []);

  return (
    <div
      ref={contentRef}
      onMouseUp={handleMouseUp}
      onMouseDown={handleClickOutside}
      className={cn("relative", className)}
    >
      {children}

      {/* Floating "Deep dive" button - rendered via portal */}
      {showButton &&
        selectedText &&
        typeof window !== "undefined" &&
        createPortal(
          <Button
            size="sm"
            className={cn(
              "absolute z-[9999] shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 border-none rounded-xl",
              "animate-in fade-in slide-in-from-bottom-2 duration-200",
              "gap-1.5 px-3 h-8"
            )}
            style={{
              top: `${buttonPosition.top}px`,
              left: `${buttonPosition.left}px`,
            }}
            onClick={handleButtonClick}
            onMouseDown={(e) => e.preventDefault()}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Deep dive</span>
          </Button>,
          document.body
        )}
    </div>
  );
}
