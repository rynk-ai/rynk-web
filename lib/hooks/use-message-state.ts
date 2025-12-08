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
   * Messages are sorted by timestamp after adding to maintain order.
   */
  const addMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const toAdd = newMessages.filter(m => !existingIds.has(m.id));
      if (toAdd.length === 0) return prev;
      
      // Combine and sort by timestamp to maintain correct order
      const combined = [...prev, ...toAdd];
      return combined.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
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
    setMessages(prev => {
      // Check if the new ID already exists in the list (excluding the one we're replacing)
      // This happens if the server sync added the real message before we replaced the temp one
      const exists = prev.some(m => m.id === newMessage.id && m.id !== oldId);
      
      if (exists) {
        // If it exists, just remove the temporary message
        return prev.filter(m => m.id !== oldId);
      }
      
      // Otherwise replace the temp message with the new one
      return prev.map(m => m.id === oldId ? newMessage : m);
    });
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
