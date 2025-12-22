"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { SurfaceSubChat, SubChatMessage } from "@/lib/services/cloud-db";
import { toast } from "sonner";

interface SurfaceSubChatContext {
  type: 'surface' | 'learning';
  id: string;              // surfaceId or courseId
  sectionId?: string;      // For specific section filtering
}

/**
 * Custom hook to manage sub-chat state for surfaces (Wiki, Research, etc.) and learning pages.
 * Similar to useSubChats but works with the surface_sub_chats table instead of conversation-based subchats.
 */
export function useSurfaceSubChats(context: SurfaceSubChatContext | null) {
  // Sub-chat state
  const [subChats, setSubChats] = useState<SurfaceSubChat[]>([]);
  const [activeSubChat, setActiveSubChat] = useState<SurfaceSubChat | null>(null);
  const [subChatSheetOpen, setSubChatSheetOpen] = useState(false);
  const [subChatLoading, setSubChatLoading] = useState(false);
  const [subChatStreamingContent, setSubChatStreamingContent] = useState("");
  const [subChatSearchResults, setSubChatSearchResults] = useState<any>(null);

  // Set of section IDs that have sub-chats (for quick lookup)
  const sectionIdsWithSubChats = useMemo(() => {
    return new Set(subChats.filter(sc => sc.sectionId).map(sc => sc.sectionId!));
  }, [subChats]);

  // Load sub-chats for the current context
  const loadSubChats = useCallback(async (ctx: SurfaceSubChatContext) => {
    try {
      const params = new URLSearchParams({
        sourceType: ctx.type,
        sourceId: ctx.id,
      });
      if (ctx.sectionId) {
        params.set('sectionId', ctx.sectionId);
      }
      
      const response = await fetch(`/api/surface-sub-chats?${params}`);
      if (response.ok) {
        const data = await response.json() as { subChats?: SurfaceSubChat[] };
        setSubChats(data.subChats || []);
      }
    } catch (err) {
      console.error("Failed to load surface sub-chats:", err);
    }
  }, []);

  // Load sub-chats when context changes
  useEffect(() => {
    if (context) {
      loadSubChats(context);
    } else {
      setSubChats([]);
      setActiveSubChat(null);
      setSubChatSheetOpen(false);
    }
  }, [context?.type, context?.id, loadSubChats]);

  // Open or create a sub-chat for selected text
  const handleOpenSubChat = useCallback(
    async (
      text: string,
      sectionId?: string,
      fullSectionContent?: string
    ) => {
      if (!context) return;

      try {
        // Check if there's an existing sub-chat for this exact text and section
        const existing = subChats.find(
          (sc) => sc.sectionId === sectionId && sc.quotedText === text
        );

        if (existing) {
          setActiveSubChat(existing);
          setSubChatSheetOpen(true);
          return;
        }

        // Create new sub-chat
        const response = await fetch("/api/surface-sub-chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType: context.type,
            sourceId: context.id,
            sectionId,
            quotedText: text,
            sourceContent: fullSectionContent,
          }),
        });

        if (response.ok) {
          const data = await response.json() as { subChat?: SurfaceSubChat };
          const newSubChat = data.subChat;
          if (newSubChat) {
            setSubChats((prev) => [newSubChat, ...prev]);
            setActiveSubChat(newSubChat);
            setSubChatSheetOpen(true);
          }
        }
      } catch (err) {
        console.error("Failed to create surface sub-chat:", err);
        toast.error("Failed to create sub-chat");
      }
    },
    [context, subChats]
  );

  // View existing sub-chats for a section
  const handleViewSubChats = useCallback(
    (sectionId: string) => {
      const sectionSubChats = subChats.filter(
        (sc) => sc.sectionId === sectionId
      );
      if (sectionSubChats.length > 0) {
        setActiveSubChat(sectionSubChats[0]);
        setSubChatSheetOpen(true);
      }
    },
    [subChats]
  );

  // Open an existing sub-chat directly
  const handleOpenExistingSubChat = useCallback((subChat: SurfaceSubChat) => {
    setActiveSubChat(subChat);
    setSubChatSheetOpen(true);
  }, []);

  // Delete a sub-chat
  const handleDeleteSubChat = useCallback(
    async (subChatId: string) => {
      try {
        const response = await fetch(`/api/surface-sub-chats/${subChatId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setSubChats((prev) => prev.filter((sc) => sc.id !== subChatId));

          if (activeSubChat?.id === subChatId) {
            setSubChatSheetOpen(false);
            setActiveSubChat(null);
          }

          toast.success("Sub-chat deleted");
        } else {
          throw new Error("Failed to delete sub-chat");
        }
      } catch (err) {
        console.error("Failed to delete surface sub-chat:", err);
        toast.error("Failed to delete sub-chat");
      }
    },
    [activeSubChat]
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
          `/api/surface-sub-chats/${activeSubChat.id}/messages`,
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
          await userMsgResponse.json() as {
            message?: SubChatMessage;
            subChat?: SurfaceSubChat;
          };

        // Update local state with user message
        if (updatedSubChat) {
          setActiveSubChat(updatedSubChat);
          setSubChats((prev) =>
            prev.map((sc) =>
              sc.id === updatedSubChat.id ? updatedSubChat : sc
            )
          );
        }

        // Stream AI response
        const aiResponse = await fetch("/api/surface-sub-chats/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subChatId: activeSubChat.id,
            quotedText: activeSubChat.quotedText,
            sourceContent: activeSubChat.sourceContent,
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
          `/api/surface-sub-chats/${activeSubChat.id}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "assistant", content: fullContent }),
          }
        );

        if (assistantMsgResponse.ok) {
          const { subChat: finalSubChat } = await assistantMsgResponse.json() as {
            subChat?: SurfaceSubChat;
          };
          if (finalSubChat) {
            setActiveSubChat(finalSubChat);
            setSubChats((prev) =>
              prev.map((sc) => (sc.id === finalSubChat.id ? finalSubChat : sc))
            );
          }
        }
      } catch (err) {
        console.error("Failed to send surface sub-chat message:", err);
        toast.error("Failed to send message");
      } finally {
        setSubChatLoading(false);
        setSubChatStreamingContent("");
      }
    },
    [activeSubChat]
  );

  // Get sub-chats for a specific section
  const getSubChatsForSection = useCallback(
    (sectionId: string) => {
      return subChats.filter((sc) => sc.sectionId === sectionId);
    },
    [subChats]
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
    sectionIdsWithSubChats,

    // Handlers
    handleOpenSubChat,
    handleViewSubChats,
    handleOpenExistingSubChat,
    handleDeleteSubChat,
    handleSubChatSendMessage,
    getSubChatsForSection,
  };
}
