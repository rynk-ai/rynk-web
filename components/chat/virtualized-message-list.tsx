import React, { useRef, useEffect, useMemo, useCallback } from 'react'
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
  onQuote?: (text: string, messageId: string, role: 'user' | 'assistant') => void
  messageVersions: Map<string, ChatMessage[]>
  onSwitchVersion: (messageId: string) => Promise<void>
  onLoadMore?: () => void
  isLoadingMore?: boolean
  statusPills?: any[]
  searchResults?: any
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
  onQuote,
  messageVersions,
  onSwitchVersion,
  onLoadMore,
  isLoadingMore = false,
  statusPills,
  searchResults
}: VirtualizedMessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const isAtBottom = useRef(true)

  
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

  // Also scroll when streaming updates - ONLY if user is already at bottom
  useEffect(() => {
    if (streamingMessageId && isAtBottom.current) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: 'auto'
      })
    }
  }, [streamingContent, streamingMessageId, messages.length])

  // Memoize itemContent to prevent recreation on every render
  // This is critical for performance as it affects all message items
  const itemContent = useCallback((index: number, message: ChatMessage) => {
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
        onQuote={onQuote}
        versions={versions}
        onSwitchVersion={onSwitchVersion}
        streamingStatusPills={streamingMessageId === message.id ? statusPills : undefined}
        streamingSearchResults={streamingMessageId === message.id ? searchResults : undefined}
      />
    )
  }, [
    messages.length,
    messageVersions,
    isSending,
    streamingMessageId,
    streamingContent,
    editingMessageId,
    onStartEdit,
    onDeleteMessage,
    onBranchFromMessage,
    onQuote,
    onSwitchVersion,
    statusPills,
    searchResults
  ])
  
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
      atBottomStateChange={(isBottom) => {
        isAtBottom.current = isBottom
      }}
      initialTopMostItemIndex={messages.length - 1}
      className="h-full scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40"
      atBottomThreshold={50}
      startReached={onLoadMore}
      components={{Header , Footer }}
    />
  )
})
