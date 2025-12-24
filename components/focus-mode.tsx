"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PiSidebarSimple, PiArrowsOutSimple } from "react-icons/pi";
import { cn } from "@/lib/utils";

/**
 * Focus Mode Toggle - Floating button that appears when sidebar is collapsed
 * 
 * Shows a subtle button in the top-left corner that allows users to
 * restore the sidebar when in focus mode (sidebar hidden).
 */
export function FocusModeToggle({ className }: { className?: string }) {
  const { state, toggleSidebar, isMobile } = useSidebar();
  
  // Only show when sidebar is collapsed on desktop
  if (isMobile || state === "expanded") {
    return null;
  }
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn(
        "fixed top-4 left-4 z-50 size-9 rounded-xl",
        "bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-card hover:border-border",
        "transition-all duration-200",
        "animate-in fade-in slide-in-from-left-2",
        className
      )}
      title="Show sidebar (⌘B)"
    >
      <PiSidebarSimple className="h-4 w-4" />
    </Button>
  );
}

/**
 * Focus Mode Menu Item - For adding to sidebar footer/menu
 * 
 * Alternative way to enter focus mode from within the sidebar
 */
export function FocusModeMenuItem() {
  const { toggleSidebar } = useSidebar();
  
  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 rounded-md",
        "text-sm text-muted-foreground hover:text-foreground",
        "hover:bg-muted/50 transition-colors"
      )}
    >
      <PiArrowsOutSimple className="h-4 w-4" />
      <span>Focus Mode</span>
      <kbd className="ml-auto text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">⌘B</kbd>
    </button>
  );
}
