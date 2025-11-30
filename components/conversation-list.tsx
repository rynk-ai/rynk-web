"use client"

import { useState } from "react"
import { type Conversation, type Folder } from "@/lib/services/indexeddb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  PinIcon,
  MoreHorizontal,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"

interface ConversationListProps {
  conversations: Conversation[]
  folders: Folder[]
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onTogglePin: (id: string) => void
  onAddToFolder: (id: string) => void
  onEditTags: (id: string) => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
  isLoading?: boolean;
}

interface GroupedByTime {
  period: string
  conversations: Conversation[]
}

function groupConversationsByTime(conversations: Conversation[]): GroupedByTime[] {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const sevenDays = 7 * oneDay
  const thirtyDays = 30 * oneDay

  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    "Last 30 days": [],
    Older: [],
  }

  for (const conv of conversations) {
    const timeDiff = now - conv.updatedAt
    if (timeDiff < oneDay) {
      groups.Today.push(conv)
    } else if (timeDiff < 2 * oneDay) {
      groups.Yesterday.push(conv)
    } else if (timeDiff < sevenDays) {
      groups["Last 7 days"].push(conv)
    } else if (timeDiff < thirtyDays) {
      groups["Last 30 days"].push(conv)
    } else {
      groups.Older.push(conv)
    }
  }

  return Object.entries(groups)
    .filter(([_, convs]) => convs.length > 0)
    .map(([period, convs]) => ({
      period,
      conversations: convs,
    }))
}

export function ConversationList({
  conversations,
  folders,
  currentConversationId,
  onSelectConversation,
  onTogglePin,
  onAddToFolder,
  onEditTags,
  onRename,
  onDelete,
  isLoading = false,
}: ConversationListProps) {
  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="px-4 space-y-4">
        {[...Array(2)].map((_, groupIdx) => (
          <div key={groupIdx} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="space-y-1.5">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  // Get all conversation IDs that are in folders
  const groupedConversationIds = new Set(
    folders.flatMap((f) => f.conversationIds)
  )

  // Filter out grouped conversations
  const ungroupedConversations = conversations.filter(
    (c) => !groupedConversationIds.has(c.id)
  )

  const groupedByTime = groupConversationsByTime(ungroupedConversations)

  if (groupedByTime.length === 0) {
    return (
      <div className="px-4 text-sm text-muted-foreground">
        No conversations yet
      </div>
    )
  }

  return (
    <>
      {groupedByTime.map((group) => (
        <div key={group.period} className="my-2 px-2">
          <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
            {group.period}
          </div>
          <div className="space-y-2 ">
            {group.conversations.map((conversation) => (
              <div key={conversation.id} className="group/conversation relative">
                <button
                  className={cn(
                    "flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-sm transition-colors hover:bg-muted hover:text-foreground pr-10  text-muted-foreground ",
                    currentConversationId === conversation.id &&
                      "bg-muted text-foreground"
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex w-full flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate pl-1 ">{conversation.title}</span>
                      {conversation.isPinned && (
                        <PinIcon className="h-3 w-3 text-primary shrink-0" />
                      )}
                    </div>
              
                  </div>
                </button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-9 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/conversation:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTogglePin(conversation.id)
                    }}
                    title={conversation.isPinned ? "Unpin conversation" : "Pin conversation"}
                  >
                    <PinIcon className={cn("h-4 w-4", conversation.isPinned && "fill-current")} />
                  </Button>

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
                    <DropdownMenuItem onClick={() => onAddToFolder(conversation.id)}>
                      Add to folder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRename(conversation.id)}>
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditTags(conversation.id)}>
                      Edit tags
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(conversation.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
