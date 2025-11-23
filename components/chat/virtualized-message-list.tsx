import React, { useRef, useEffect, useMemo } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { ChatMessageItem } from './chat-message-item'
import { type CloudMessage as ChatMessage } from '@/lib/services/cloud-db'

interface VirtualizedMessageListProps {
  messages: ChatMessage[]
  isSending: boolean
  streamingMessageId: string | null
  streamingContent: string
  editingMessageId: string | null
  onStartEdit: (message: ChatMessage) => void
  onDeleteMessage: (messageId: string) => void
  onBranchFromMessage: (messageId: string) => void
}

export const VirtualizedMessageList = React.memo(function VirtualizedMessageList({
  messages,
  isSending,
  streamingMessageId,
  streamingContent,
  editingMessageId,
  onStartEdit,
  onDeleteMessage,
  onBranchFromMessage
}: VirtualizedMessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Small timeout to ensure content is rendered
      const timeout = setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          align: 'end',
          behavior: 'smooth'
        })
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [messages.length, isSending])

  // Also scroll when streaming updates (throttled by parent, but good to ensure visibility)
  useEffect(() => {
    if (streamingMessageId) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end'
      })
    }
  }, [streamingContent, streamingMessageId, messages.length])

  const itemContent = (index: number, message: ChatMessage) => {
    return (
      <div className="pb-4 px-0 sm:px-2 md:px-4">
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
        />
      </div>
    )
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
    />
  )
})
