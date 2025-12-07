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
import { ConversationListItem } from "@/components/sidebar/conversation-list-item"

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
  loadingConversations?: Set<string>;
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
  loadingConversations,
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
        <div key={group.period} className="mb-2  mt-3 px-2">
          <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
            {group.period}
          </div>
          <div className="space-y-2 ">
            {group.conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isActive={currentConversationId === conversation.id}
                onSelect={onSelectConversation}
                onTogglePin={onTogglePin}
                onAddToFolder={onAddToFolder}
                onRename={onRename}
                onEditTags={onEditTags}
                onDelete={onDelete}
                isLoading={loadingConversations?.has(conversation.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
