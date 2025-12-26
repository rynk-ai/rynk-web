import React, { useRef, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { ChatMessageItem } from './chat-message-item'
import { type CloudMessage as ChatMessage, type SubChat } from '@/lib/services/cloud-db'
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
  contextCards?: Array<{ source: string; snippet: string; score: number }>
  onIsAtBottomChange?: (isAtBottom: boolean) => void
  // Surface trigger - needs conversationId and saved surface states
  conversationId?: string | null
  savedSurfaces?: Record<string, any>
  // Credit indicator
  userCredits?: number | null
}

export interface VirtualizedMessageListRef {
  scrollToBottom: () => void
  scrollToMessageTop: (messageIndex: number) => void
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
  contextCards,
  onIsAtBottomChange,
  // Surface trigger props
  conversationId,
  savedSurfaces,
  // Credit indicator
  userCredits,
}, ref) {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const isAtBottom = useRef(true)
  const prevLengthRef = useRef(messages.length)
  
  // Scroll snap tracking refs
  const lastSnapTimeRef = useRef(0)
  const hasUserScrolledRef = useRef(false)

  // Expose scroll methods to parent
  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: 'smooth'
      })
    },
    scrollToMessageTop: (messageIndex: number) => {
      virtuosoRef.current?.scrollToIndex({
        index: messageIndex,
        align: 'start',
        behavior: 'smooth'
      })
    }
  }), [messages.length])

  // Reset scroll tracking when streaming ends
  useEffect(() => {
    if (!streamingMessageId && !isSending) {
      hasUserScrolledRef.current = false
    }
  }, [streamingMessageId, isSending])

  // Scroll snap: When user sends a new message, snap the user message to the top
  // This provides better UX as users can see their question while watching the AI respond
  useEffect(() => {
    const prevLength = prevLengthRef.current
    const now = Date.now()
    
    // Detect when new message pair is added (user + assistant placeholder)
    // Conditions: message count increased, user is sending, not yet streaming, user hasn't manually scrolled
    if (
      messages.length > prevLength && 
      isSending && 
      !streamingMessageId && 
      !hasUserScrolledRef.current
    ) {
      // Debounce to prevent jitter on rapid messages
      if (now - lastSnapTimeRef.current > 300) {
        // User message is second-to-last (assistant placeholder is last)
        const userMessageIndex = messages.length - 2
        if (userMessageIndex >= 0 && messages[userMessageIndex]?.role === 'user') {
          const timeout = setTimeout(() => {
            virtuosoRef.current?.scrollToIndex({
              index: userMessageIndex,
              align: 'start',
              behavior: 'smooth'
            })
            lastSnapTimeRef.current = Date.now()
          }, 50)
          prevLengthRef.current = messages.length
          return () => clearTimeout(timeout)
        }
      }
    }
    
    prevLengthRef.current = messages.length
  }, [messages.length, streamingMessageId, isSending])


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
            // Only pass status pills to the message that is actively streaming
            streamingMessageId === message.id ? statusPills : undefined
          }
          streamingSearchResults={
            // Only pass search results to the actively streaming message
            // or the last assistant message if it just finished and results exist
            message.role === 'assistant' && (
              streamingMessageId === message.id ||
              (index === messages.length - 1 && searchResults && !streamingMessageId)
            )
              ? searchResults
              : undefined
          }
          streamingContextCards={
            // Only pass context cards to the actively streaming message
            streamingMessageId === message.id ? contextCards : undefined
          }
          // Surface trigger props
          conversationId={conversationId}
          savedSurfaces={savedSurfaces}
          // Credit indicator
          userCredits={userCredits}
          // Upgrade prompt
          messageIndex={index}
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
    onOpenSubChat,
    onViewSubChats,
    onOpenExistingSubChat,
    onDeleteSubChat,
    messageIdsWithSubChats,
    subChats,
    onSwitchVersion,
    statusPills,
    searchResults,
    contextCards,
    messages.length,
    // Surface trigger props
    conversationId,
    savedSurfaces,
    // Credit indicator
    userCredits,
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
      isScrolling={(scrolling) => {
        // Track when user manually scrolls during sending/streaming
        // This prevents auto-snap from fighting with user's scroll intent
        if (scrolling && (isSending || streamingMessageId)) {
          hasUserScrolledRef.current = true
        }
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
    prevProps.contextCards === nextProps.contextCards &&
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
