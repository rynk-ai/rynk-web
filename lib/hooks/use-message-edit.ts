import { useState, useCallback } from 'react';
import type { CloudMessage as ChatMessage } from '@/lib/services/cloud-db';

/**
 * Custom hook to manage message edit state independently.
 * Isolating edit state prevents the entire message list from re-rendering
 * when user enters edit mode or types in the edit textarea.
 */
export function useMessageEdit() {
  const [isEditing, setIsEditing] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editContext, setEditContext] = useState<
    { type: 'conversation' | 'folder'; id: string; title: string }[]
  >([]);
  
  /**
   * Start editing a message with its initial content and context.
   * Batches all edit-related state updates together.
   */
  const startEdit = useCallback((
    message: ChatMessage,
    initialContext: { type: 'conversation' | 'folder'; id: string; title: string }[]
  ) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
    setEditContext(initialContext);
  }, []);
  
  /**
   * Cancel edit mode and reset all edit state.
   */
  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditContent('');
    setEditContext([]);
  }, []);
  
  /**
   * Update edit content (called on every keystroke).
   * Memoized to prevent creating new function on every render.
   */
  const updateEditContent = useCallback((content: string) => {
    setEditContent(content);
  }, []);
  
  /**
   * Update edit context (referenced conversations/folders).
   */
  const updateEditContext = useCallback((
    context: { type: 'conversation' | 'folder'; id: string; title: string }[]
  ) => {
    setEditContext(context);
  }, []);
  
  return {
    // State
    isEditing,
    setIsEditing,
    editingMessageId,
    editContent,
    editContext,
    
    // Actions
    startEdit,
    cancelEdit,
    updateEditContent,
    updateEditContext,
    setEditContent,
    setEditContext
  };
}
