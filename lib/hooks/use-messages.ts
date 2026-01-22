"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import { getMessages as getMessagesAction } from "@/app/actions";
import type { CloudMessage as ChatMessage } from "@/lib/services/cloud-db";

/**
 * Filter messages to show only active versions (no duplicates).
 * When a message has multiple versions, only the one with the highest versionNumber is shown.
 */
function filterActiveVersions(messages: ChatMessage[]): ChatMessage[] {
  const activeMessages: ChatMessage[] = [];
  const versionGroups = new Map<string, ChatMessage[]>();

  // Group messages by their version root
  messages.forEach((msg) => {
    const rootId = msg.versionOf || msg.id;
    if (!versionGroups.has(rootId)) {
      versionGroups.set(rootId, []);
    }
    versionGroups.get(rootId)!.push(msg);
  });

  // For each version group, select the active version (highest versionNumber)
  versionGroups.forEach((versions) => {
    const activeVersion = versions.reduce((latest, current) => {
      return current.versionNumber > latest.versionNumber ? current : latest;
    });
    activeMessages.push(activeVersion);
  });

  // Sort by timestamp to maintain conversation order
  return activeMessages.sort((a, b) => a.timestamp - b.timestamp);
}

export interface UseMessagesOptions {
  /** Initial limit for message fetching */
  limit?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseMessagesReturn {
  /** Filtered messages (active versions only) */
  messages: ChatMessage[];
  /** Raw messages from the server */
  rawMessages: ChatMessage[];
  /** Whether messages are being loaded */
  isLoading: boolean;
  /** Whether initial fetch is happening */
  isFetching: boolean;
  /** Error if any */
  error: Error | null;
  /** Cursor for pagination */
  nextCursor: string | null;
  /** Whether there are more messages to load */
  hasMore: boolean;
  
  // Optimistic update functions
  /** Add messages optimistically (for new messages) */
  addOptimisticMessages: (messages: ChatMessage[]) => void;
  /** Update a specific message */
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  /** Replace a message (e.g., temp ID → real ID) */
  replaceMessage: (oldId: string, newMessage: ChatMessage) => void;
  /** Remove a message */
  removeMessage: (messageId: string) => void;
  /** Invalidate and refetch messages */
  refetch: () => Promise<void>;
}

/**
 * Custom hook to manage messages with React Query caching.
 * 
 * Benefits:
 * - Stale-while-revalidate: Shows cached messages instantly, refetches in background
 * - Automatic deduplication: Prevents duplicate fetches during rapid switches
 * - Optimistic updates: UI updates immediately, syncs with server
 * - Persistent cache: Messages survive component unmounts
 */
export function useMessages(
  conversationId: string | null,
  options: UseMessagesOptions = {}
): UseMessagesReturn {
  const { limit = 50, enabled = true } = options;
  const queryClient = useQueryClient();
  
  // Track which conversation's messages we're managing
  // This prevents race conditions when switching conversations rapidly
  const latestConversationIdRef = useRef(conversationId);
  latestConversationIdRef.current = conversationId;

  // React Query for message fetching
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) {
        return { messages: [], nextCursor: null };
      }
      
      console.log("📥 [useMessages] Fetching messages for:", conversationId);
      const result = await getMessagesAction(conversationId, limit);
      console.log("✅ [useMessages] Fetched", result.messages.length, "messages");
      
      return result;
    },
    enabled: enabled && !!conversationId,
    staleTime: 1000 * 60 * 2, // 2 minutes - messages are relatively stable
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus (causes flicker)
    refetchOnMount: false, // Use cached data if available
  });

  // Memoize filtered messages
  const messages = useMemo(() => {
    if (!data?.messages) return [];
    return filterActiveVersions(data.messages);
  }, [data?.messages]);

  // Optimistic update: Add new messages
  const addOptimisticMessages = useCallback(
    (newMessages: ChatMessage[]) => {
      if (!conversationId) return;
      
      queryClient.setQueryData<typeof data>(
        ["messages", conversationId],
        (old) => {
          if (!old) {
            return { messages: newMessages, nextCursor: null };
          }
          
          const existingIds = new Set(old.messages.map((m) => m.id));
          const toAdd = newMessages.filter((m) => !existingIds.has(m.id));
          
          if (toAdd.length === 0) return old;
          
          // Combine and sort by timestamp
          const combined = [...old.messages, ...toAdd].sort(
            (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
          );
          
          return { ...old, messages: combined };
        }
      );
    },
    [conversationId, queryClient]
  );

  // Optimistic update: Update a specific message
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<ChatMessage>) => {
      if (!conversationId) return;
      
      queryClient.setQueryData<typeof data>(
        ["messages", conversationId],
        (old) => {
          if (!old) return old;
          
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          };
        }
      );
    },
    [conversationId, queryClient]
  );

  // Optimistic update: Replace a message (temp ID → real ID)
  const replaceMessage = useCallback(
    (oldId: string, newMessage: ChatMessage) => {
      if (!conversationId) return;
      
      queryClient.setQueryData<typeof data>(
        ["messages", conversationId],
        (old) => {
          if (!old) return old;
          
          // Check if new ID already exists
          const exists = old.messages.some(
            (m) => m.id === newMessage.id && m.id !== oldId
          );
          
          if (exists) {
            // Just remove the old message
            return {
              ...old,
              messages: old.messages.filter((m) => m.id !== oldId),
            };
          }
          
          // Replace old with new
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.id === oldId ? newMessage : m
            ),
          };
        }
      );
    },
    [conversationId, queryClient]
  );

  // Optimistic update: Remove a message
  const removeMessage = useCallback(
    (messageId: string) => {
      if (!conversationId) return;
      
      queryClient.setQueryData<typeof data>(
        ["messages", conversationId],
        (old) => {
          if (!old) return old;
          
          return {
            ...old,
            messages: old.messages.filter((m) => m.id !== messageId),
          };
        }
      );
    },
    [conversationId, queryClient]
  );

  // Refetch messages
  const refetch = useCallback(async () => {
    if (!conversationId) return;
    await queryRefetch();
  }, [conversationId, queryRefetch]);

  return {
    messages,
    rawMessages: data?.messages || [],
    isLoading,
    isFetching,
    error: error as Error | null,
    nextCursor: data?.nextCursor || null,
    hasMore: !!data?.nextCursor,
    
    // Optimistic updates
    addOptimisticMessages,
    updateMessage,
    replaceMessage,
    removeMessage,
    refetch,
  };
}

/**
 * Hook to prefetch messages for a conversation.
 * Use this when hovering over a conversation in the sidebar.
 */
/**
 * Hook to prefetch messages for a conversation.
 * Use this when hovering over a conversation in the sidebar.
 * Includes debouncing (300ms) to prevent flooding requests.
 */
export function usePrefetchMessages() {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback(
    (conversationId: string) => {
      // Clear any pending prefetch
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce: Only prefetch if user hovers for 300ms
      timeoutRef.current = setTimeout(() => {
        console.log(`[Prefetch] Starting prefetch for ${conversationId}`);
        queryClient.prefetchQuery({
          queryKey: ["messages", conversationId],
          queryFn: async () => {
            console.log(`[Prefetch] Executing queryFn for ${conversationId}`);
            try {
              const result = await getMessagesAction(conversationId, 50);
              console.log(`[Prefetch] Success for ${conversationId}, loaded ${result.messages.length} messages`);
              return result;
            } catch (error) {
              console.error(`[Prefetch] Error fetching messages for ${conversationId}:`, error);
              throw error;
            }
          },
          staleTime: 1000 * 60 * 2,
        });
      }, 300);
    },
    [queryClient]
  );
}
