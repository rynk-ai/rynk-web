"use client";

import { memo } from "react";
import { type Conversation } from "@/lib/services/indexeddb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PiPushPin, PiDotsThree, PiHash, PiBookOpen, PiListChecks, PiTarget, PiScales, PiCards, PiCalendar, PiTrendUp, PiMagnifyingGlass } from "react-icons/pi";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConversationListItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onAddToFolder?: (id: string) => void;
  onEditTags?: (id: string) => void;
  onRename?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPrefetch?: (id: string) => void;
  showPinAction?: boolean;
  showMenu?: boolean;
  isLoading?: boolean;
}

export const ConversationListItem = memo(
  function ConversationListItem({
    conversation,
    isActive,
    onSelect,
    onTogglePin,
    onAddToFolder,
    onEditTags,
    onRename,
    onDelete,
    onPrefetch,
    showPinAction = true,
    showMenu = true,
    isLoading = false,
  }: ConversationListItemProps) {
    // Get preview from last message or title
    const preview = conversation.preview || conversation.title?.slice(0, 50);
    const hasTags = conversation.tags && conversation.tags.length > 0;
    
    return (
      <div 
        className="group/conversation relative"
        onMouseEnter={() => !isActive && onPrefetch?.(conversation.id)}
      >
        <button
          className={cn(
            "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-all duration-150 pr-8",
            isActive 
              ? "bg-[hsl(var(--surface))] text-foreground shadow-sm " 
              : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))]",
          )}
          onClick={() => onSelect(conversation.id)}
        >
          <div className="flex w-full flex-col gap-1 min-w-0">
            {/* Title */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "truncate flex-1 font-medium",
                isActive ? "text-foreground" : "text-foreground/90"
              )}>
                {conversation.title}
              </span>
              
              {/* Surface Icons */}
              {/* Surface Icons */}
              {(conversation as any).surfaceStates && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {Object.entries({
                    learning: { icon: PiBookOpen, color: "text-blue-500", label: "Has Course" },
                    guide: { icon: PiListChecks, color: "text-green-500", label: "Has Guide" },
                    quiz: { icon: PiTarget, color: "text-pink-500", label: "Has Quiz" },
                    comparison: { icon: PiScales, color: "text-indigo-500", label: "Has Comparison" },
                    flashcard: { icon: PiCards, color: "text-teal-500", label: "Has Flashcards" },
                    timeline: { icon: PiCalendar, color: "text-amber-500", label: "Has Timeline" },
                    wiki: { icon: PiBookOpen, color: "text-orange-500", label: "Has Wiki" },
                    finance: { icon: PiTrendUp, color: "text-emerald-500", label: "Has Finance" },
                    research: { icon: PiMagnifyingGlass, color: "text-purple-500", label: "Has Research" },
                  }).map(([type, config]) => {
                    if (!(conversation as any).surfaceStates[type]) return null;
                    const Icon = config.icon;
                    return (
                      <Tooltip key={type}>
                        <TooltipTrigger asChild>
                          <span className={config.color}>
                            <Icon className="h-3 w-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{config.label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
              
              {conversation.isPinned && (
                <PiPushPin className="h-3 w-3 fill-primary/60 text-primary/60 shrink-0" />
              )}
            </div>
            
            {/* Tags */}
            {hasTags && (
              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                {conversation.tags!.slice(0, 3).map((tag, i) => (
                  <span 
                    key={i}
                    className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded-md bg-primary/10 text-primary/80 font-medium"
                  >
                    <PiHash className="h-2 w-2" />
                    {tag}
                  </span>
                ))}
                {conversation.tags!.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">
                    +{conversation.tags!.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {isLoading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="h-2.5 w-2.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
        </button>



        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-5 w-5 opacity-0 group-hover/conversation:opacity-100 transition-opacity rounded-md"
              >
                <PiDotsThree className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onTogglePin && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(conversation.id);
                  }}
                >
                  {conversation.isPinned ? "Unpin conversation" : "Pin conversation"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onAddToFolder && (
                <DropdownMenuItem
                  onClick={() => onAddToFolder(conversation.id)}
                >
                  Add to folder
                </DropdownMenuItem>
              )}
              {onRename && (
                <DropdownMenuItem onClick={() => onRename(conversation.id)}>
                  Rename
                </DropdownMenuItem>
              )}
              {onEditTags && (
                <DropdownMenuItem onClick={() => onEditTags(conversation.id)}>
                  Edit tags
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(conversation.id)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete conversation
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.conversation.id === nextProps.conversation.id &&
      prevProps.conversation.title === nextProps.conversation.title &&
      prevProps.conversation.updatedAt === nextProps.conversation.updatedAt &&
      prevProps.conversation.isPinned === nextProps.conversation.isPinned &&
      prevProps.conversation.preview === nextProps.conversation.preview &&
      JSON.stringify(prevProps.conversation.tags) === JSON.stringify(nextProps.conversation.tags) &&
      JSON.stringify((prevProps.conversation as any).surfaceStates) === JSON.stringify((nextProps.conversation as any).surfaceStates) &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.showPinAction === nextProps.showPinAction &&
      prevProps.showMenu === nextProps.showMenu
    );
  },
);
