"use client";

import { useState, useEffect, useCallback } from "react";
import { useGuestSession } from "./use-guest-session";

interface GuestConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  isPinned: boolean;
  tags: string[];
}

interface GuestFolder {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  conversationCount: number;
}

interface GuestSubChat {
  id: string;
  conversationId: string;
  sourceMessageId: string;
  quotedText: string;
  sourceMessageContent?: string;
  messages: any[];
  createdAt: number;
  updatedAt: number;
}

export function useGuestChat() {
  const { guestId, isGuest } = useGuestSession();
  const [conversations, setConversations] = useState<GuestConversation[]>([]);
  const [folders, setFolders] = useState<GuestFolder[]>([]);
  const [subChats, setSubChats] = useState<GuestSubChat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  const loadConversations = useCallback(async () => {
    if (!isGuest || !guestId) return;

    try {
      const response = await fetch("/api/guest/conversations", {
        headers: {
          Authorization: `Bearer ${guestId}`,
        },
      });

      if (response.ok) {
        const data = await response.json() as { conversations: GuestConversation[] };
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  }, [isGuest, guestId]);

  const loadFolders = useCallback(async () => {
    if (!isGuest || !guestId) return;

    try {
      const response = await fetch("/api/guest/folders", {
        headers: {
          Authorization: `Bearer ${guestId}`,
        },
      });

      if (response.ok) {
        const data = await response.json() as { folders: GuestFolder[] };
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error("Failed to load folders:", error);
    }
  }, [isGuest, guestId]);

  const loadSubChats = useCallback(async (conversationId: string) => {
    if (!isGuest || !guestId) return;

    try {
      const response = await fetch(
        `/api/guest/sub-chats?conversationId=${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${guestId}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json() as { subChats: GuestSubChat[] };
        setSubChats(data.subChats || []);
      }
    } catch (error) {
      console.error("Failed to load sub-chats:", error);
    }
  }, [isGuest, guestId]);

  const loadCredits = useCallback(async () => {
    if (!isGuest || !guestId) return;

    try {
      const response = await fetch("/api/guest/status", {
        headers: {
          Authorization: `Bearer ${guestId}`,
        },
      });

      if (response.ok) {
        const data = await response.json() as { creditsRemaining: number };
        setCreditsRemaining(data.creditsRemaining);
      }
    } catch (error) {
      console.error("Failed to load credits:", error);
    }
  }, [isGuest, guestId]);

  const createConversation = useCallback(async () => {
    if (!isGuest || !guestId) return null;

    const conversationId = `guest-${guestId}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    // Create conversation record
    await fetch("/api/guest/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guestId}`,
      },
      body: JSON.stringify({
        id: conversationId,
        title: "New Chat",
      }),
    });

    // Reload conversations
    loadConversations();

    return conversationId;
  }, [isGuest, guestId, loadConversations]);

  const sendMessage = useCallback(
    async (
      message: string,
      conversationId: string,
      attachments: any[] = [],
      referencedConversations: any[] = [],
      referencedFolders: any[] = []
    ) => {
      if (!isGuest || !guestId) return null;

      const response = await fetch("/api/guest/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${guestId}`,
        },
        body: JSON.stringify({
          message,
          conversationId,
          attachments,
          referencedConversations,
          referencedFolders,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const error = await response.json() as { error: string };
          if (error.error === "GUEST_CREDITS_EXCEEDED") {
            throw new Error("GUEST_CREDITS_EXCEEDED");
          }
        }
        throw new Error("Failed to send message");
      }

      return response;
    },
    [isGuest, guestId]
  );

  useEffect(() => {
    if (isGuest) {
      loadConversations();
      loadFolders();
      loadCredits();
    }
  }, [isGuest, loadConversations, loadFolders, loadCredits]);

  return {
    // State
    conversations,
    folders,
    subChats,
    isLoading,
    creditsRemaining,
    guestId,
    isGuest,

    // Actions
    loadConversations,
    loadFolders,
    loadSubChats,
    loadCredits,
    createConversation,
    sendMessage,
    setCreditsRemaining,
  };
}
