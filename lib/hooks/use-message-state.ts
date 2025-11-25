import { useState, useCallback } from 'react';
import type { CloudMessage as ChatMessage } from '@/lib/services/cloud-db';

/**
 * Custom hook to manage message state independently from parent component.
 * This prevents re-renders in the parent when only message data changes.
 */
export function useMessageState() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageVersions, setMessageVersions] = useState<Map<string, ChatMessage[]>>(new Map());
  
  /**
   * Update a specific message by ID with partial updates.
   * Uses functional update to ensure we're working with latest state.
   */
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, ...updates } : m));
  }, []);
  
  /**
   * Add new messages to the list, avoiding duplicates.
   * This is crucial for optimistic updates where we may receive messages
   * from multiple sources (UI optimistic update + server confirmation).
   */
  const addMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const toAdd = newMessages.filter(m => !existingIds.has(m.id));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    });
  }, []);
  
  /**
   * Remove a message by ID
   */
  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);
  
  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setMessageVersions(new Map());
  }, []);
  
  /**
   * Replace a message with a new one (e.g. swapping temp ID with real ID)
   */
  const replaceMessage = useCallback((oldId: string, newMessage: ChatMessage) => {
    setMessages(prev => prev.map(m => m.id === oldId ? newMessage : m));
  }, []);

  return {
    messages,
    setMessages,
    messageVersions,
    setMessageVersions,
    updateMessage,
    addMessages,
    removeMessage,
    clearMessages,
    replaceMessage
  };
}
