"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { SubChat } from "@/lib/services/cloud-db";
import { toast } from "sonner";

/**
 * Custom hook to manage sub-chat state for GUEST users.
 * Similar to useSubChats but uses guest API endpoints (/api/guest/sub-chats).
 */
export function useGuestSubChats(currentConversationId: string | null) {
  // Sub-chat state
  const [subChats, setSubChats] = useState<SubChat[]>([]);
  const [activeSubChat, setActiveSubChat] = useState<SubChat | null>(null);
  const [subChatSheetOpen, setSubChatSheetOpen] = useState(false);
  const [subChatLoading, setSubChatLoading] = useState(false);
  const [subChatStreamingContent, setSubChatStreamingContent] = useState("");
  const [subChatSearchResults, setSubChatSearchResults] = useState<any>(null);

  // Set of message IDs that have sub-chats (for quick lookup)
  const messageIdsWithSubChats = useMemo(() => {
    return new Set(subChats.map((sc) => sc.sourceMessageId));
  }, [subChats]);

  // Load sub-chats for a conversation
  const loadSubChats = useCallback(async (conversationId: string) => {
    try {
      // Use guest API endpoint
      const response = await fetch(
        `/api/guest/sub-chats?conversationId=${conversationId}`
      );
      if (response.ok) {
        const data = (await response.json()) as { subChats?: SubChat[] };
        setSubChats(data.subChats || []);
      }
    } catch (err) {
      console.error("Failed to load sub-chats:", err);
    }
  }, []);

  // Load sub-chats when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadSubChats(currentConversationId);
    } else {
      setSubChats([]);
      setActiveSubChat(null);
      setSubChatSheetOpen(false);
    }
  }, [currentConversationId, loadSubChats]);

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

        // Create new sub-chat using guest API
        const response = await fetch("/api/guest/sub-chats", {
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
            setSubChats((prev) => [newSubChat, ...prev]);
            setActiveSubChat(newSubChat);
            setSubChatSheetOpen(true);
          }
        }
      } catch (err) {
        console.error("Failed to create sub-chat:", err);
        toast.error("Failed to create sub-chat");
      }
    },
    [currentConversationId, subChats]
  );

  // View existing sub-chats for a message
  const handleViewSubChats = useCallback(
    (messageId: string) => {
      const messageSubChats = subChats.filter(
        (sc) => sc.sourceMessageId === messageId
      );
      if (messageSubChats.length > 0) {
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
        // Use guest API endpoint
        const response = await fetch(`/api/guest/sub-chats/${subChatId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setSubChats((prev) => prev.filter((sc) => sc.id !== subChatId));

          if (activeSubChat?.id === subChatId) {
            setSubChatSheetOpen(false);
            setActiveSubChat(null);
          }
        } else {
          throw new Error("Failed to delete sub-chat");
        }
      } catch (err) {
        console.error("Failed to delete sub-chat:", err);
        toast.error("Failed to delete sub-chat");
      }
    },
    [activeSubChat]
  );

  // Send a message in the active sub-chat (simplified for guests - no streaming)
  const handleSubChatSendMessage = useCallback(
    async (content: string) => {
      if (!activeSubChat) return;

      setSubChatLoading(true);
      setSubChatStreamingContent("");
      setSubChatSearchResults(null);

      try {
        // Add user message optimistically
        const userMessage = {
          id: `msg_${Date.now()}`,
          role: "user" as const,
          content,
          createdAt: Date.now(),
        };

        setActiveSubChat((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, userMessage],
              }
            : null
        );

        // Send to guest API (simplified - no streaming for sub-chats)
        const response = await fetch(
          `/api/guest/sub-chats/${activeSubChat.id}/message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          }
        );

        if (response.ok) {
          const data = (await response.json()) as { subChat?: SubChat };
          if (data.subChat) {
            setActiveSubChat(data.subChat);
            setSubChats((prev) =>
              prev.map((sc) =>
                sc.id === data.subChat!.id ? data.subChat! : sc
              )
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
    [activeSubChat]
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

    // Handlers
    handleOpenSubChat,
    handleViewSubChats,
    handleOpenExistingSubChat,
    handleDeleteSubChat,
    handleSubChatSendMessage,
  };
}
