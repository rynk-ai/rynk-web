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
import { PinIcon, MoreHorizontal } from "lucide-react";

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
}

export const ConversationListItem = memo(function ConversationListItem({
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
}: ConversationListItemProps) {
  return (
    <div className="group/conversation relative">
      <button
        className={cn(
          "flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted hover:text-foreground pr-10 text-muted-foreground",
          isActive && "bg-muted text-foreground font-medium"
        )}
        onClick={() => onSelect(conversation.id)}
      >
        <div className="flex w-full flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate pl-1 flex-1">{conversation.title}</span>
            {conversation.isPinned && (
              <PinIcon className="h-3 w-3 text-primary shrink-0" />
            )}
          </div>
        </div>
      </button>

      {showPinAction && onTogglePin && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-9 top-1/2 -translate-y-1/2 h-7 w-7 transition-opacity",
            conversation.isPinned ? "opacity-0 group-hover/conversation:opacity-100" : "opacity-0 group-hover/conversation:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(conversation.id);
          }}
          title={conversation.isPinned ? "Unpin conversation" : "Pin conversation"}
        >
          <PinIcon
            className={cn("h-4 w-4", conversation.isPinned && "fill-current")}
          />
        </Button>
      )}

      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/conversation:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuSeparator />
            {onAddToFolder && (
              <DropdownMenuItem onClick={() => onAddToFolder(conversation.id)}>
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
}, (prevProps, nextProps) => {
  return (
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.conversation.title === nextProps.conversation.title &&
    prevProps.conversation.updatedAt === nextProps.conversation.updatedAt &&
    prevProps.conversation.isPinned === nextProps.conversation.isPinned &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.showPinAction === nextProps.showPinAction &&
    prevProps.showMenu === nextProps.showMenu
  );
});
