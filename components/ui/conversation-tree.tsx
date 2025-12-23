"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { PiGitBranch, PiGitCommit, PiClockCounterClockwise } from "react-icons/pi"
import { cn } from "@/lib/utils"
import type { Message, Conversation } from "@/lib/services/indexeddb"
import { dbService } from "@/lib/services/indexeddb"

interface ConversationTreeProps {
  conversation: Conversation
  messages: Message[]
  currentPath: string[]
  onSelectMessage: (messageId: string) => void
  className?: string
}

interface TreeNode {
  message: Message
  children: TreeNode[]
  depth: number
  isActive: boolean
}

export function ConversationTree({
  conversation,
  messages,
  currentPath,
  onSelectMessage,
  className,
}: ConversationTreeProps) {
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([])

  useEffect(() => {
    buildTree()
  }, [messages, currentPath])

  const buildTree = async () => {
    // Get all messages in the conversation
    const allMessages = await dbService.getAllMessagesFromConversation(conversation.id)

    // Build tree structure
    const rootNodes = buildTreeNodes(allMessages, null)
    setTreeNodes(rootNodes)
  }

  const buildTreeNodes = (messages: Message[], parentId: string | null): TreeNode[] => {
    const nodes: TreeNode[] = []

    for (const message of messages) {
      // Find messages that belong to this level
      const isRootLevel = parentId === null && !message.parentMessageId
      const isChildOfParent = parentId !== null && message.parentMessageId === parentId

      if (isRootLevel || isChildOfParent) {
        // Get children recursively
        const children = buildTreeNodes(messages, message.id)

        nodes.push({
          message,
          children,
          depth: parentId === null ? 0 : 1,
          isActive: currentPath.includes(message.id),
        })
      }
    }

    return nodes
  }

  const renderTreeNode = (node: TreeNode, isLast: boolean = true): React.ReactNode => {
    const hasChildren = node.children.length > 0

    return (
      <div key={node.message.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors",
            node.isActive && "bg-accent border-l-2 border-primary pl-[6px]",
            node.depth > 0 && "ml-6"
          )}
          onClick={() => onSelectMessage(node.message.id)}
        >
          {/* Tree connector */}
          <div className="relative w-4 h-4 flex items-center justify-center">
            {!isLast && (
              <div className="absolute left-1/2 top-0 h-full w-px bg-border -translate-x-1/2" />
            )}
            {hasChildren && (
              <div className="absolute top-1/2 left-1/2 w-3 h-px bg-border -translate-x-1/2 -translate-y-1/2" />
            )}
            {node.depth > 0 && (
              <div className="absolute left-0 top-1/2 w-3 h-px bg-border -translate-y-1/2" />
            )}
          </div>

          {/* Icon */}
          <div className="flex items-center justify-center w-5 h-5">
            {node.message.role === 'user' ? (
              <div className="w-2 h-2 rounded-full bg-primary" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            )}
          </div>

          {/* Message preview */}
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">
              {node.message.content || 'Empty message'}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {node.message.versionNumber > 1 && (
                <Badge variant="outline" className="text-[10px] h-4">
                  v{node.message.versionNumber}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">
                {new Date(node.message.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Active indicator */}
          {node.isActive && (
            <Badge variant="secondary" className="text-[10px] h-5">
              Active
            </Badge>
          )}
        </div>

        {/* Render children */}
        {hasChildren && (
          <div className="ml-2">
            {node.children.map((child, index) =>
              renderTreeNode(child, index === node.children.length - 1)
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("border rounded-lg", className)}>
      <div className="flex items-center gap-2 p-3 border-b bg-muted/20">
        <PiGitBranch size={16} />
        <span className="text-sm font-medium">Conversation Tree</span>
        <Badge variant="secondary" className="ml-auto">
          {treeNodes.length} branches
        </Badge>
      </div>

      <ScrollArea className="h-[400px] p-2">
        {treeNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <PiGitCommit size={32} className="mb-2 opacity-50"            />
            <p className="text-sm">No message versions yet</p>
            <p className="text-xs">Edit a message to create branches</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {treeNodes.map((node, index) =>
              renderTreeNode(node, index === treeNodes.length - 1)
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
