"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useGuestChat, type GuestConversation, type GuestMessage, type GuestFolder } from "./use-guest-chat";

interface GuestChatContextValue {
  // Conversations
  conversations: GuestConversation[]
  currentConversation: GuestConversation | null
  currentConversationId: string | null
  isLoading: boolean
  loadingConversations: Set<string>
  error: string | null
  createConversation: () => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  selectConversation: (id: string | null, conversation?: GuestConversation) => void
  searchConversations: (query: string, limit?: number, offset?: number) => Promise<GuestConversation[]>
  sendMessage: (
    content: string,
    files?: File[],
    referencedConversations?: { id: string; title: string }[],
    referencedFolders?: { id: string; name: string }[]
  ) => Promise<{
    streamReader: ReadableStreamDefaultReader<Uint8Array>
    conversationId: string
    userMessageId: string | null
    assistantMessageId: string | null
  } | null>
  uploadAttachments: (files: File[]) => Promise<any[]>
  sendChatRequest: (
    content: string,
    attachments?: any[],
    referencedConversations?: { id: string; title: string }[],
    referencedFolders?: { id: string; name: string }[],
    conversationIdParam?: string,
    userMessageIdParam?: string,
    assistantMessageIdParam?: string
  ) => Promise<{
    streamReader: ReadableStreamDefaultReader<Uint8Array>
    conversationId: string
    userMessageId: string | null
    assistantMessageId: string | null
  } | null>
  loadConversations: () => Promise<void>
  togglePinConversation: (id: string) => Promise<void>
  updateConversationTags: (id: string, tags: string[]) => Promise<void>
  renameConversation: (id: string, newTitle: string) => Promise<void>
  getAllTags: () => Promise<string[]>
  editMessage: (messageId: string, newContent: string, newAttachments?: File[], referencedConversations?: { id: string; title: string }[], referencedFolders?: { id: string; name: string }[]) => Promise<any>
  deleteMessage: (messageId: string) => Promise<void>
  switchToMessageVersion: (messageId: string) => Promise<void>
  getMessageVersions: (originalMessageId: string) => Promise<GuestMessage[]>
  getMessages: (conversationId: string, limit?: number, cursor?: string) => Promise<{ messages: GuestMessage[], nextCursor: string | null }>
  // Folders
  folders: GuestFolder[]
  createFolder: (name: string, description?: string, conversationIds?: string[]) => Promise<GuestFolder>
  updateFolder: (folderId: string, updates: Partial<GuestFolder>) => Promise<void>
  deleteFolder: (folderId: string) => Promise<void>
  addConversationToFolder: (folderId: string, conversationId: string) => Promise<void>
  removeConversationFromFolder: (folderId: string, conversationId: string) => Promise<void>
  loadFolders: () => Promise<void>
  // Projects (not available for guests, but kept for interface compatibility)
  projects: any[]
  createProject: (name: string, description: string, instructions?: string, attachments?: File[]) => Promise<any>
  updateProject: (projectId: string, updates: any) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  loadProjects: () => Promise<void>
  branchConversation: (messageId: string) => Promise<string>
  setConversationContext: (
    conversationId: string,
    referencedConversations?: { id: string; title: string }[],
    referencedFolders?: { id: string; name: string }[]
  ) => Promise<void>
  clearConversationContext: (conversationId: string) => Promise<void>
  // Pagination
  loadMoreConversations: () => Promise<void>
  hasMoreConversations: boolean
  isLoadingMoreConversations: boolean
  activeProjectId: string | null
  selectProject: (id: string | null) => void
  // Agentic & Reasoning
  reasoningMode: 'auto' | 'on' | 'online' | 'off'
  toggleReasoningMode: () => void
  statusPills: Array<{
    status: 'analyzing' | 'searching' | 'synthesizing' | 'complete'
    message: string
    timestamp: number
  }>
  searchResults: any
  streamingMessageId: string | null
  // Guest-specific
  creditsRemaining: number | null
  showUpgradeModal: boolean
  setShowUpgradeModal: (show: boolean) => void
  isLoadingConversations: boolean
  isGuest: true  // Always true for guest context
}

const GuestChatContext = createContext<GuestChatContextValue | null>(null);

// Separate context for frequently-changing streaming state
const GuestStreamingContext = createContext<{
  statusPills: Array<{
    status: 'analyzing' | 'searching' | 'synthesizing' | 'complete'
    message: string
    timestamp: number
  }>
  searchResults: any
} | null>(null);

export function GuestChatProvider({ children, initialConversationId }: { children: React.ReactNode, initialConversationId?: string | null }) {
  const guestChatHook = useGuestChat(initialConversationId);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    ...guestChatHook,
    isGuest: true as const
  }), [
    guestChatHook.conversations,
    guestChatHook.currentConversation,
    guestChatHook.currentConversationId,
    guestChatHook.isLoading,
    guestChatHook.error,
    guestChatHook.folders,
    guestChatHook.reasoningMode,
    guestChatHook.statusPills,
    guestChatHook.searchResults,
    guestChatHook.streamingMessageId,
    guestChatHook.creditsRemaining,
    guestChatHook.showUpgradeModal,
    guestChatHook.isLoadingConversations,
  ]);

  // Separate streaming context for frequently-changing values
  const streamingContextValue = useMemo(() => ({
    statusPills: guestChatHook.statusPills,
    searchResults: guestChatHook.searchResults,
  }), [
    guestChatHook.statusPills,
    guestChatHook.searchResults,
  ]);

  return (
    <GuestChatContext.Provider value={contextValue}>
      <GuestStreamingContext.Provider value={streamingContextValue}>
        {children}
      </GuestStreamingContext.Provider>
    </GuestChatContext.Provider>
  );
}

export function useGuestChatContext() {
  const context = useContext(GuestChatContext);
  if (!context) {
    throw new Error("useGuestChatContext must be used within a GuestChatProvider");
  }
  return context;
}

export function useGuestStreamingContext() {
  const context = useContext(GuestStreamingContext);
  if (!context) {
    throw new Error("useGuestStreamingContext must be used within a GuestChatProvider");
  }
  return context;
}

// Re-export types
export type { GuestConversation, GuestMessage, GuestFolder };
