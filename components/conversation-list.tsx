"use client"

import { useState } from "react"
import { type Conversation, type Group } from "@/lib/services/indexeddb"
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
  MessageSquare,
  Pin,
  PinIcon,
  Users,
  Tag,
  Trash,
  MoreHorizontal,
} from "lucide-react"

interface ConversationListProps {
  conversations: Conversation[]
  groups: Group[]
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onTogglePin: (id: string) => void
  onAddToGroup: (id: string) => void
  onEditTags: (id: string) => void
  onDelete: (id: string) => void
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
  groups,
  currentConversationId,
  onSelectConversation,
  onTogglePin,
  onAddToGroup,
  onEditTags,
  onDelete,
}: ConversationListProps) {
  // Get all conversation IDs that are in groups
  const groupedConversationIds = new Set(
    groups.flatMap((g) => g.conversationIds)
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
          <div className="space-y-2 px-2">
            {group.conversations.map((conversation) => (
              <div key={conversation.id} className="group relative">
                <button
                  className={cn(
                    "flex w-full items-center gap-1 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted hover:text-foreground pr-10",
                    currentConversationId === conversation.id &&
                      "bg-muted border border-primary/20"
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex w-full flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{conversation.title}</span>
                      {conversation.isPinned && (
                        <PinIcon className="h-3 w-3 text-primary shrink-0" />
                      )}
                    </div>
                    {conversation.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {conversation.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditTags(conversation.id)
                            }}
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onTogglePin(conversation.id)}>
                      {conversation.isPinned ? (
                        <>
                          <PinIcon className="h-4 w-4 mr-2" />
                          Unpin conversation
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4 mr-2" />
                          Pin conversation
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onAddToGroup(conversation.id)}>
                      <Users className="h-4 w-4 mr-2" />
                      Add to group
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditTags(conversation.id)}>
                      <Tag className="h-4 w-4 mr-2" />
                      Edit tags
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(conversation.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash className="h-4 w-4 mr-2" />
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
