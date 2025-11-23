import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook to manage streaming state independently.
 * This is critical for performance - streaming updates happen frequently
 * (potentially multiple times per second) and must not trigger re-renders
 * in unrelated components like the sidebar.
 */
export function useStreaming() {
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  
  // Use ref to batch content updates and reduce re-renders
  const contentBufferRef = useRef('');
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Start streaming for a specific message.
   */
  const startStreaming = useCallback((messageId: string) => {
    setStreamingMessageId(messageId);
    setStreamingContent('');
    contentBufferRef.current = '';
  }, []);
  
  /**
   * Update streaming content with throttling to reduce re-renders.
   * Instead of updating state on every chunk, we batch updates
   * using requestAnimationFrame for smooth 60fps updates.
   */
  const updateStreamContent = useCallback((newContent: string) => {
    contentBufferRef.current = newContent;
    
    // Clear existing timeout
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    
    // Throttle updates to max 60fps (16ms)
    flushTimeoutRef.current = setTimeout(() => {
      setStreamingContent(contentBufferRef.current);
    }, 16);
  }, []);
  
  /**
   * Immediately flush any buffered content and update state.
   * Used when stream completes to ensure final content is displayed.
   */
  const flushStreamContent = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    setStreamingContent(contentBufferRef.current);
  }, []);
  
  /**
   * Finish streaming and clear state.
   */
  const finishStreaming = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    setStreamingMessageId(null);
    setStreamingContent('');
    contentBufferRef.current = '';
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    // State
    streamingMessageId,
    streamingContent,
    isStreaming: streamingMessageId !== null,
    
    // Actions
    startStreaming,
    updateStreamContent,
    flushStreamContent,
    finishStreaming
  };
}
