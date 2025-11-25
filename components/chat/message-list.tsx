'use client';

import { memo } from 'react';
import type { CloudMessage as ChatMessage } from '@/lib/services/cloud-db';
import { ChatMessageItem } from './chat-message-item';
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
} from "@/components/ui/chain-of-thought";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";

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
  contextProgress?: Array<{
    type: 'loading' | 'loaded' | 'complete';
    conversation?: string;
    messageCount?: number;
  }>;
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
  onSwitchVersion,
  contextProgress = []
}: MessageListProps) {
  return (
    <>
      {messages.map((message, index) => {
        // Find versions for this message (using root ID)
        const rootId = message.versionOf || message.id;
        const versions = messageVersions.get(rootId) || [message];
        
        // Show context progress before the streaming message
        const isStreamingMessage = streamingMessageId === message.id;
        
        return (
          <>
            {isStreamingMessage && contextProgress.length > 0 && (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-0 mb-4">
                <ChainOfThought>
                  {contextProgress.map((progress, idx) => {
                    if (progress.type === 'complete') {
                      return (
                        <ChainOfThoughtStep key={idx}>
                          <ChainOfThoughtTrigger leftIcon={<Sparkles className="size-4" />}>
                            Context ready, generating response...
                          </ChainOfThoughtTrigger>
                        </ChainOfThoughtStep>
                      );
                    }
                    
                    if (progress.type === 'loaded') {
                      return (
                        <ChainOfThoughtStep key={idx}>
                          <ChainOfThoughtTrigger leftIcon={<CheckCircle2 className="size-4 text-green-500" />}>
                            Loaded "{progress.conversation}"
                          </ChainOfThoughtTrigger>
                        </ChainOfThoughtStep>
                      );
                    }
                    
                    if (progress.type === 'loading') {
                      return (
                        <ChainOfThoughtStep key={idx} defaultOpen>
                          <ChainOfThoughtTrigger leftIcon={<Loader2 className="size-4 animate-spin" />}>
                            Loading context from "{progress.conversation}"
                          </ChainOfThoughtTrigger>
                          <ChainOfThoughtContent>
                            <ChainOfThoughtItem>
                              Processing {progress.messageCount} messages
                            </ChainOfThoughtItem>
                            <ChainOfThoughtItem>
                              Injecting full conversation history into context
                            </ChainOfThoughtItem>
                          </ChainOfThoughtContent>
                        </ChainOfThoughtStep>
                      );
                    }
                    
                    return null;
                  })}
                </ChainOfThought>
              </div>
            )}
            
            <ChatMessageItem
              key={message.id}
              message={message}
              isLastMessage={index === messages.length - 1}
              isSending={isSending}
              isStreaming={isStreamingMessage}
              streamingContent={streamingContent}
              isEditing={editingMessageId === message.id}
              onStartEdit={onStartEdit}
              onDelete={onDeleteMessage}
              onBranch={onBranchFromMessage}
              versions={versions}
              onSwitchVersion={onSwitchVersion}
            />
          </>
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
    prevProps.messageVersions === nextProps.messageVersions &&
    prevProps.contextProgress === nextProps.contextProgress
  );
});
