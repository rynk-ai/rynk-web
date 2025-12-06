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
  const prevLengthRef = useRef(messages.length)

  // Auto-scroll to bottom when new messages arrive (instant, no animation)
  useEffect(() => {
    // Skip auto-scroll if this is a conversation switch (messages went from >0 to 0 to >0)
    // This prevents jank during conversation switching
    const prevLength = prevLengthRef.current
    const isConversationSwitch = prevLength > 0 && messages.length === 0

    if (messages.length > 0 && !isConversationSwitch) {
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

    prevLengthRef.current = messages.length
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
  // Using useMemo to avoid dependency issues with useCallback
  const itemContent = useMemo(() => {
    return (index: number, message: ChatMessage) => {
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
          streamingStatusPills={
            // Show status pills for the streaming message OR any assistant message when sending
            streamingMessageId === message.id || (isSending && message.role === 'assistant')
              ? statusPills
              : undefined
          }
          streamingSearchResults={
            // Show search results for:
            // 1. The currently streaming message
            // 2. Any assistant message while sending (for status updates)
            // 3. The last assistant message when streaming just completed (to show sources)
            (streamingMessageId && streamingMessageId === message.id) ||
            (!streamingMessageId && isSending && message.role === 'assistant') ||
            (!streamingMessageId && !isSending && message.role === 'assistant' && message.id === (messages[messages.length - 1]?.id))
              ? searchResults
              : undefined
          }
        />
      )
    }
  }, [
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
    searchResults,
    messages.length
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
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  // Only re-render if these specific props change
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.isSending === nextProps.isSending &&
    prevProps.streamingMessageId === nextProps.streamingMessageId &&
    prevProps.streamingContent === nextProps.streamingContent &&
    prevProps.editingMessageId === nextProps.editingMessageId &&
    prevProps.messageVersions === nextProps.messageVersions &&
    prevProps.isLoadingMore === nextProps.isLoadingMore &&
    prevProps.statusPills === nextProps.statusPills &&
    prevProps.searchResults === nextProps.searchResults &&
    prevProps.onStartEdit === nextProps.onStartEdit &&
    prevProps.onDeleteMessage === nextProps.onDeleteMessage &&
    prevProps.onBranchFromMessage === nextProps.onBranchFromMessage &&
    prevProps.onQuote === nextProps.onQuote &&
    prevProps.onSwitchVersion === nextProps.onSwitchVersion &&
    prevProps.onLoadMore === nextProps.onLoadMore
  )
})
