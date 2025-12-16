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
import { PinIcon, MoreHorizontal, Hash, BookOpen, ListChecks, Target, Scale, Layers, Calendar, TrendingUp, Microscope } from "lucide-react";
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
    showPinAction = true,
    showMenu = true,
    isLoading = false,
  }: ConversationListItemProps) {
    // Get preview from last message or title
    const preview = conversation.preview || conversation.title?.slice(0, 50);
    const hasTags = conversation.tags && conversation.tags.length > 0;
    
    return (
      <div className="group/conversation relative">
        <button
          className={cn(
            "flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all duration-150 pr-10",
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
                    learning: { icon: BookOpen, color: "text-blue-500", label: "Has Course" },
                    guide: { icon: ListChecks, color: "text-green-500", label: "Has Guide" },
                    quiz: { icon: Target, color: "text-pink-500", label: "Has Quiz" },
                    comparison: { icon: Scale, color: "text-indigo-500", label: "Has Comparison" },
                    flashcard: { icon: Layers, color: "text-teal-500", label: "Has Flashcards" },
                    timeline: { icon: Calendar, color: "text-amber-500", label: "Has Timeline" },
                    wiki: { icon: BookOpen, color: "text-orange-500", label: "Has Wiki" },
                    finance: { icon: TrendingUp, color: "text-emerald-500", label: "Has Finance" },
                    research: { icon: Microscope, color: "text-purple-500", label: "Has Research" },
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
                <PinIcon className="h-3 w-3 fill-primary/60 text-primary/60 shrink-0" />
              )}
            </div>
            
            {/* Tags */}
            {hasTags && (
              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                {conversation.tags!.slice(0, 3).map((tag, i) => (
                  <span 
                    key={i}
                    className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary/80 font-medium"
                  >
                    <Hash className="h-2 w-2" />
                    {tag}
                  </span>
                ))}
                {conversation.tags!.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{conversation.tags!.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {isLoading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
        </button>

        {showPinAction && onTogglePin && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-9 top-1.5 h-6 w-6 transition-opacity rounded-md",
              conversation.isPinned
                ? "opacity-100 group-hover/conversation:opacity-100"
                : "opacity-0 group-hover/conversation:opacity-100",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(conversation.id);
            }}
            title={
              conversation.isPinned ? "Unpin conversation" : "Pin conversation"
            }
          >
            <PinIcon
              className={cn("h-3.5 w-3.5", conversation.isPinned && "fill-current")}
            />
          </Button>
        )}

        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1.5 h-6 w-6 opacity-0 group-hover/conversation:opacity-100 transition-opacity rounded-md"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
