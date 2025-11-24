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
  messageVersions: Map<string, ChatMessage[]>;
  onSwitchVersion: (messageId: string) => Promise<void>;
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
  onBranchFromMessage,
  messageVersions,
  onSwitchVersion
}: MessageListProps) {
  return (
    <>
      {messages.map((message, index) => {
        // Find versions for this message (using root ID)
        const rootId = message.versionOf || message.id;
        const versions = messageVersions.get(rootId) || [message];
        
        return (
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
            versions={versions}
            onSwitchVersion={onSwitchVersion}
          />
        );
      })}
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if messages array changed or streaming/editing state changed
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.isSending === nextProps.isSending &&
    prevProps.streamingMessageId === nextProps.streamingMessageId &&
    prevProps.streamingContent === nextProps.streamingContent &&
    prevProps.editingMessageId === nextProps.editingMessageId &&
    prevProps.messageVersions === nextProps.messageVersions
  );
});
