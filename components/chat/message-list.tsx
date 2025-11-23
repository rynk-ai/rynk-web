'use client';

import { memo } from 'react';
import type { CloudMessage as ChatMessage } from '@/lib/services/cloud-db';
import { ChatMessageItem } from './chat-message-item';

interface MessageListProps {
  messages: ChatMessage[];
  isSending: boolean;
  streamingMessageId: string | null;
  streamingContent: string;
  editingMessageId: string | null;
  onStartEdit: (message: ChatMessage) => void;
  onDeleteMessage: (messageId: string) => void;
  onBranchFromMessage: (messageId: string) => void;
}

/**
 * Memoized message list component.
 * Only re-renders when the messages array reference changes or other props change.
 * Individual messages are further memoized in ChatMessageItem.
 */
export const MessageList = memo(function MessageList({
  messages,
  isSending,
  streamingMessageId,
  streamingContent,
  editingMessageId,
  onStartEdit,
  onDeleteMessage,
  onBranchFromMessage
}: MessageListProps) {
  return (
    <>
      {messages.map((message, index) => (
        <ChatMessageItem
          key={message.id}
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
      ))}
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if messages array changed or streaming/editing state changed
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.isSending === nextProps.isSending &&
    prevProps.streamingMessageId === nextProps.streamingMessageId &&
    prevProps.streamingContent === nextProps.streamingContent &&
    prevProps.editingMessageId === nextProps.editingMessageId
  );
});
