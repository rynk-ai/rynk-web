import React, { useRef, useEffect, useMemo } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { ChatMessageItem } from './chat-message-item'
import { type CloudMessage as ChatMessage } from '@/lib/services/cloud-db'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useKeyboardAwarePosition } from '@/lib/hooks/use-keyboard-aware-position'

interface VirtualizedMessageListProps {
  messages: ChatMessage[]
  isSending: boolean
  streamingMessageId: string | null
  streamingContent: string
  editingMessageId: string | null
  onStartEdit: (message: ChatMessage) => void
  onDeleteMessage: (messageId: string) => void
  onBranchFromMessage: (messageId: string) => void
  messageVersions: Map<string, ChatMessage[]>
  onSwitchVersion: (messageId: string) => Promise<void>
  onLoadMore?: () => void
  isLoadingMore?: boolean
}

export const VirtualizedMessageList = React.memo(function VirtualizedMessageList({
  messages,
  isSending,
  streamingMessageId,
  streamingContent,
  editingMessageId,
  onStartEdit,
  onDeleteMessage,
  onBranchFromMessage,
  messageVersions,
  onSwitchVersion,
  onLoadMore,
  isLoadingMore = false
}: VirtualizedMessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null)

  
  // Auto-scroll to bottom when new messages arrive (instant, no animation)
  useEffect(() => {
    if (messages.length > 0) {
      // Small timeout to ensure content is rendered
      const timeout = setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          align: 'end',
          behavior: 'auto' // Changed from 'smooth' to 'auto' for instant scroll
        })
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [messages.length, isSending])

  // Also scroll when streaming updates
  useEffect(() => {
    if (streamingMessageId) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: 'auto'
      })
    }
  }, [streamingContent, streamingMessageId, messages.length])

  const itemContent = (index: number, message: ChatMessage) => {
    const rootId = message.versionOf || message.id
    const versions = messageVersions.get(rootId) || [message]
    
    return (
      <ChatMessageItem
        message={message}
        isLastMessage={index === messages.length - 1}
        isSending={isSending}
        isStreaming={streamingMessageId === message.id}
        streamingContent={streamingContent}
        isEditing={editingMessageId === message.id}
        onStartEdit={onStartEdit}
        onDelete={onDeleteMessage}
        onBranch={onBranchFromMessage}
        versions={versions}
        onSwitchVersion={onSwitchVersion}
      />
    )
  }
  const Header = () => {
    return <div style={{ height: '3rem' }} />
}

  const Footer = () => {
    return <div style={{ height: '20rem' }} />
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={messages}
      itemContent={itemContent}
      followOutput="auto"
      initialTopMostItemIndex={messages.length - 1}
      className="h-full scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40"
      atBottomThreshold={50}
      startReached={onLoadMore}
      components={{Header , Footer }}
    />
  )
})
