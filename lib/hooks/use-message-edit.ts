import { useState, useCallback } from 'react';
import type { CloudMessage as ChatMessage } from '@/lib/services/cloud-db';
import type { Attachment } from '@/components/file-preview';

/**
 * Custom hook to manage message edit state independently.
 * Isolating edit state prevents the entire message list from re-rendering
 * when user enters edit mode or types in the edit textarea.
 */
export function useMessageEdit() {
  const [isEditing, setIsEditing] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editAttachments, setEditAttachments] = useState<(File | Attachment)[]>([]);
  const [editContext, setEditContext] = useState<
    { type: 'conversation' | 'folder'; id: string; title: string; status?: 'loading' | 'loaded' }[]
  >([]);
  
  /**
   * Start editing a message with its initial content and context.
   * Batches all edit-related state updates together.
   */
  const startEdit = useCallback((
    message: ChatMessage,
    initialContext: { type: 'conversation' | 'folder'; id: string; title: string; status?: 'loading' | 'loaded' }[]
  ) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
    setEditAttachments(message.attachments || []);
    setEditContext(initialContext);
  }, []);
  
  /**
   * Cancel edit mode and reset all edit state.
   */
  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditContent('');
    setEditAttachments([]);
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
    context: { type: 'conversation' | 'folder'; id: string; title: string; status?: 'loading' | 'loaded' }[]
  ) => {
    setEditContext(context);
  }, []);
  
  return {
    // State
    isEditing,
    setIsEditing,
    editingMessageId,
    editContent,
    editAttachments,
    editContext,
    
    // Actions
    startEdit,
    cancelEdit,
    updateEditContent,
    updateEditContext,
    setEditContent,
    setEditAttachments,
    setEditContext
  };
}
