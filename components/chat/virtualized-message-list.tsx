import React, { useRef, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { ChatMessageItem } from './chat-message-item'
import { type CloudMessage as ChatMessage, type SubChat } from '@/lib/services/cloud-db'
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
  onOpenSubChat?: (text: string, messageId: string, role: 'user' | 'assistant', fullMessageContent: string) => void
  onViewSubChats?: (messageId: string) => void
  onOpenExistingSubChat?: (subChat: SubChat) => void
  onDeleteSubChat?: (subChatId: string) => void
  messageIdsWithSubChats?: Set<string>
  subChats?: SubChat[]
  messageVersions: Map<string, ChatMessage[]>
  onSwitchVersion: (messageId: string) => Promise<void>
  onLoadMore?: () => void
  isLoadingMore?: boolean
  statusPills?: any[]
  searchResults?: any
  onIsAtBottomChange?: (isAtBottom: boolean) => void
}

export interface VirtualizedMessageListRef {
  scrollToBottom: () => void
}

const VirtualizedMessageList = forwardRef<VirtualizedMessageListRef, VirtualizedMessageListProps>(function VirtualizedMessageList({
  messages,
  isSending,
  streamingMessageId,
  streamingContent,
  editingMessageId,
  onStartEdit,
  onDeleteMessage,
  onBranchFromMessage,
  onQuote,
  onOpenSubChat,
  onViewSubChats,
  onOpenExistingSubChat,
  onDeleteSubChat,
  messageIdsWithSubChats,
  subChats = [],
  messageVersions,
  onSwitchVersion,
  onLoadMore,
  isLoadingMore = false,
  statusPills,
  searchResults,
  onIsAtBottomChange
}, ref) {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const isAtBottom = useRef(true)
  const prevLengthRef = useRef(messages.length)

  // Expose scrollToBottom method to parent
  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: 'smooth'
      })
    }
  }), [messages.length])

  // Auto-scroll only on initial load of a conversation or when user sends a message
  // (NOT during streaming - let users control their scroll position)
  useEffect(() => {
    const prevLength = prevLengthRef.current
    // Only auto-scroll when a NEW message is added (likely user just sent)
    // Not when streaming updates are happening
    if (messages.length > prevLength && !streamingMessageId) {
      const timeout = setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          align: 'end',
          behavior: 'auto'
        })
      }, 100)
      return () => clearTimeout(timeout)
    }
    prevLengthRef.current = messages.length
  }, [messages.length, streamingMessageId])

  // Removed: Auto-scroll during streaming
  // Users now control their own scroll position

  // Memoize itemContent to prevent recreation on every render
  // This is critical for performance as it affects all message items
  // Using useMemo to avoid dependency issues with useCallback
  const itemContent = useMemo(() => {
    return (index: number, message: ChatMessage) => {
      const rootId = message.versionOf || message.id
      const versions = messageVersions.get(rootId) || [message]
      const messageSubChats = subChats.filter(sc => sc.sourceMessageId === message.id)

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
          onOpenSubChat={onOpenSubChat}
          hasSubChats={messageSubChats.length > 0}
          messageSubChats={messageSubChats}
          onViewSubChats={onViewSubChats}
          onOpenExistingSubChat={onOpenExistingSubChat}
          onDeleteSubChat={onDeleteSubChat}
          versions={versions}
          onSwitchVersion={onSwitchVersion}
          streamingStatusPills={
            // Show status pills for the streaming message OR any assistant message when sending
            streamingMessageId === message.id || (isSending && message.role === 'assistant')
              ? statusPills
              : undefined
          }
          streamingSearchResults={
            // Pass search results to assistant messages:
            // 1. The currently streaming message
            // 2. While sending (covers the transition phase)  
            // 3. The last assistant message when searchResults exist (until persisted to message.reasoning_metadata)
            message.role === 'assistant' && (
              streamingMessageId === message.id ||
              isSending ||
              (index === messages.length - 1 && searchResults)
            )
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
    // NOTE: streamingContent intentionally NOT included here
    // Including it causes itemContent to recreate 60x/second during streaming
    // ChatMessageItem handles streaming content via its own memoization
    editingMessageId,
    onStartEdit,
    onDeleteMessage,
    onBranchFromMessage,
    onQuote,
    onOpenSubChat,
    onViewSubChats,
    onOpenExistingSubChat,
    onDeleteSubChat,
    messageIdsWithSubChats,
    subChats,
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
      followOutput={false}
      atBottomStateChange={(isBottom) => {
        isAtBottom.current = isBottom
        onIsAtBottomChange?.(isBottom)
      }}
      initialTopMostItemIndex={messages.length - 1}
      className="h-full scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40"
      atBottomThreshold={50}
      startReached={onLoadMore}
      components={{Header , Footer }}
    />
  )
})

VirtualizedMessageList.displayName = 'VirtualizedMessageList'

// Custom comparison function for memoization
const compareProps = (prevProps: VirtualizedMessageListProps, nextProps: VirtualizedMessageListProps) => {
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.isSending === nextProps.isSending &&
    prevProps.streamingMessageId === nextProps.streamingMessageId &&
    prevProps.streamingContent === nextProps.streamingContent &&
    prevProps.editingMessageId === nextProps.editingMessageId &&
    prevProps.messageVersions === nextProps.messageVersions &&
    prevProps.messageIdsWithSubChats === nextProps.messageIdsWithSubChats &&
    prevProps.subChats === nextProps.subChats &&
    prevProps.isLoadingMore === nextProps.isLoadingMore &&
    prevProps.statusPills === nextProps.statusPills &&
    prevProps.searchResults === nextProps.searchResults &&
    prevProps.onStartEdit === nextProps.onStartEdit &&
    prevProps.onDeleteMessage === nextProps.onDeleteMessage &&
    prevProps.onBranchFromMessage === nextProps.onBranchFromMessage &&
    prevProps.onQuote === nextProps.onQuote &&
    prevProps.onOpenSubChat === nextProps.onOpenSubChat &&
    prevProps.onViewSubChats === nextProps.onViewSubChats &&
    prevProps.onOpenExistingSubChat === nextProps.onOpenExistingSubChat &&
    prevProps.onDeleteSubChat === nextProps.onDeleteSubChat &&
    prevProps.onSwitchVersion === nextProps.onSwitchVersion &&
    prevProps.onLoadMore === nextProps.onLoadMore &&
    prevProps.onIsAtBottomChange === nextProps.onIsAtBottomChange
  )
}

export const MemoizedVirtualizedMessageList = React.memo(VirtualizedMessageList, compareProps)
export { MemoizedVirtualizedMessageList as VirtualizedMessageList }
