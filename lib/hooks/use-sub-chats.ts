"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SubChat } from "@/lib/services/cloud-db";
import { toast } from "sonner";

/**
 * Fetch sub-chats for a conversation
 */
async function fetchSubChats(conversationId: string): Promise<SubChat[]> {
  const response = await fetch(
    `/api/sub-chats?conversationId=${conversationId}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch sub-chats");
  }
  const data = (await response.json()) as { subChats?: SubChat[] };
  return data.subChats || [];
}

/**
 * Custom hook to manage sub-chat state independently from parent component.
 * This extracts ~400 lines of sub-chat logic from ChatContent for better
 * separation of concerns and reduced component complexity.
 * 
 * Uses React Query for caching and automatic background refetching.
 */
export function useSubChats(currentConversationId: string | null) {
  const queryClient = useQueryClient();

  // Sub-chat state (local UI state, not server state)
  const [activeSubChat, setActiveSubChat] = useState<SubChat | null>(null);
  const [subChatSheetOpen, setSubChatSheetOpen] = useState(false);
  const [subChatLoading, setSubChatLoading] = useState(false);
  const [subChatStreamingContent, setSubChatStreamingContent] = useState("");
  const [subChatSearchResults, setSubChatSearchResults] = useState<any>(null);

  // React Query for sub-chats - provides caching and deduplication
  const { data: subChats = [], isLoading: isLoadingSubChats } = useQuery({
    queryKey: ["sub-chats", currentConversationId],
    queryFn: () => fetchSubChats(currentConversationId!),
    enabled: !!currentConversationId,
    staleTime: 1000 * 60 * 2, // 2 minutes - sub-chats don't change often
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
  });

  // Set of message IDs that have sub-chats (for quick lookup)
  const messageIdsWithSubChats = useMemo(() => {
    return new Set(subChats.map((sc) => sc.sourceMessageId));
  }, [subChats]);

  // Helper: Update sub-chats cache
  const updateSubChatsCache = useCallback(
    (updater: (prev: SubChat[]) => SubChat[]) => {
      if (!currentConversationId) return;
      queryClient.setQueryData<SubChat[]>(
        ["sub-chats", currentConversationId],
        (old) => updater(old || [])
      );
    },
    [currentConversationId, queryClient]
  );

  // Open or create a sub-chat for selected text
  const handleOpenSubChat = useCallback(
    async (
      text: string,
      messageId: string,
      _role: "user" | "assistant",
      fullMessageContent: string
    ) => {
      if (!currentConversationId) return;

      try {
        // Check if there's an existing sub-chat for this exact text and message
        const existing = subChats.find(
          (sc) => sc.sourceMessageId === messageId && sc.quotedText === text
        );

        if (existing) {
          setActiveSubChat(existing);
          setSubChatSheetOpen(true);
          return;
        }

        // Create new sub-chat
        const response = await fetch("/api/sub-chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: currentConversationId,
            sourceMessageId: messageId,
            quotedText: text,
            fullMessageContent: fullMessageContent,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as { subChat?: SubChat };
          const newSubChat = data.subChat;
          if (newSubChat) {
            // Update cache with new sub-chat
            updateSubChatsCache((prev) => [newSubChat, ...prev]);
            setActiveSubChat(newSubChat);
            setSubChatSheetOpen(true);
          }
        }
      } catch (err) {
        console.error("Failed to create sub-chat:", err);
        toast.error("Failed to create sub-chat");
      }
    },
    [currentConversationId, subChats, updateSubChatsCache]
  );

  // View existing sub-chats for a message
  const handleViewSubChats = useCallback(
    (messageId: string) => {
      // Find sub-chats for this message
      const messageSubChats = subChats.filter(
        (sc) => sc.sourceMessageId === messageId
      );
      if (messageSubChats.length > 0) {
        // Open the most recent one
        setActiveSubChat(messageSubChats[0]);
        setSubChatSheetOpen(true);
      }
    },
    [subChats]
  );

  // Open an existing sub-chat directly
  const handleOpenExistingSubChat = useCallback((subChat: SubChat) => {
    setActiveSubChat(subChat);
    setSubChatSheetOpen(true);
  }, []);

  // Delete a sub-chat
  const handleDeleteSubChat = useCallback(
    async (subChatId: string) => {
      try {
        const response = await fetch(`/api/sub-chats/${subChatId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          // Remove from cache
          updateSubChatsCache((prev) => prev.filter((sc) => sc.id !== subChatId));

          // Close sheet if this sub-chat was active
          if (activeSubChat?.id === subChatId) {
            setSubChatSheetOpen(false);
            setActiveSubChat(null);
          }

          toast.success("Sub-chat deleted");
        } else {
          throw new Error("Failed to delete sub-chat");
        }
      } catch (err) {
        console.error("Failed to delete sub-chat:", err);
        toast.error("Failed to delete sub-chat");
      }
    },
    [activeSubChat, updateSubChatsCache]
  );

  // Send a message in the active sub-chat
  const handleSubChatSendMessage = useCallback(
    async (content: string) => {
      if (!activeSubChat) return;

      setSubChatLoading(true);
      setSubChatStreamingContent("");
      setSubChatSearchResults(null);

      try {
        // Add user message to sub-chat
        const userMsgResponse = await fetch(
          `/api/sub-chats/${activeSubChat.id}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "user", content }),
          }
        );

        if (!userMsgResponse.ok) {
          throw new Error("Failed to add user message");
        }

        const { message: userMessage, subChat: updatedSubChat } =
          (await userMsgResponse.json()) as {
            message?: any;
            subChat?: SubChat;
          };

        // Update cache with user message
        if (updatedSubChat) {
          setActiveSubChat(updatedSubChat);
          updateSubChatsCache((prev) =>
            prev.map((sc) =>
              sc.id === updatedSubChat.id ? updatedSubChat : sc
            )
          );
        }

        // Stream AI response
        const aiResponse = await fetch("/api/sub-chats/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subChatId: activeSubChat.id,
            quotedText: activeSubChat.quotedText,
          }),
        });

        if (!aiResponse.ok || !aiResponse.body) {
          throw new Error("Failed to get AI response");
        }

        const reader = aiResponse.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Check if chunk contains search results
          if (chunk.startsWith("[SEARCH_RESULTS]")) {
            try {
              const searchResultsJson = chunk.replace("[SEARCH_RESULTS]", "");
              const parsedResults = JSON.parse(searchResultsJson);
              setSubChatSearchResults(parsedResults);
            } catch (err) {
              console.error("Failed to parse search results:", err);
            }
            continue;
          }

          fullContent += chunk;
          setSubChatStreamingContent(fullContent);
        }

        // After streaming completes, add assistant message
        const assistantMsgResponse = await fetch(
          `/api/sub-chats/${activeSubChat.id}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "assistant", content: fullContent }),
          }
        );

        if (assistantMsgResponse.ok) {
          const { subChat: finalSubChat } = (await assistantMsgResponse.json()) as {
            subChat?: SubChat;
          };
          if (finalSubChat) {
            setActiveSubChat(finalSubChat);
            updateSubChatsCache((prev) =>
              prev.map((sc) => (sc.id === finalSubChat.id ? finalSubChat : sc))
            );
          }
        }
      } catch (err) {
        console.error("Failed to send sub-chat message:", err);
        toast.error("Failed to send message");
      } finally {
        setSubChatLoading(false);
        setSubChatStreamingContent("");
      }
    },
    [activeSubChat, updateSubChatsCache]
  );

  return {
    // State
    subChats,
    activeSubChat,
    subChatSheetOpen,
    setSubChatSheetOpen,
    subChatLoading,
    subChatStreamingContent,
    subChatSearchResults,
    messageIdsWithSubChats,
    isLoadingSubChats,

    // Handlers
    handleOpenSubChat,
    handleViewSubChats,
    handleOpenExistingSubChat,
    handleDeleteSubChat,
    handleSubChatSendMessage,
  };
}
