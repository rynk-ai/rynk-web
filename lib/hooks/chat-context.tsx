"use client"

import React, { createContext, useContext, useMemo } from "react"
import { useChat } from "./use-chat"
import type { CloudConversation as Conversation, CloudMessage as Message, Folder, Project } from "@/lib/services/cloud-db"

interface ChatContextValue {
  conversations: Conversation[]
  currentConversation: Conversation | null
  currentConversationId: string | null
  isLoading: boolean
  loadingConversations: Set<string>
  error: string | null
  createConversation: (projectId?: string) => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  selectConversation: (id: string | null, conversation?: Conversation) => void
  searchConversations: (query: string, limit?: number, offset?: number) => Promise<Conversation[]>
  sendMessage: (
    content: string,
    files?: File[],
    referencedConversations?: { id: string; title: string }[],
    referencedFolders?: { id: string; name: string }[],
    onProgress?: (message: string) => void
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
  editMessage: (messageId: string, newContent: string, newAttachments?: File[], referencedConversations?: { id: string; title: string }[], referencedFolders?: { id: string; name: string }[]) => Promise<{
    newMessage: { id: string; role: unknown; content: string; versionNumber: number; branchId: string; attachments: any; };
    conversationPath: string[];
  } | undefined>
  deleteMessage: (messageId: string) => Promise<void>
  switchToMessageVersion: (messageId: string) => Promise<void>
  getMessageVersions: (originalMessageId: string) => Promise<Message[]>
  getMessages: (conversationId: string, limit?: number, cursor?: string) => Promise<{ messages: Message[], nextCursor: string | null }>
  // Folders
  folders: Folder[]
  createFolder: (name: string, description?: string, conversationIds?: string[]) => Promise<Folder>
  updateFolder: (folderId: string, updates: Partial<Folder>) => Promise<void>
  deleteFolder: (folderId: string) => Promise<void>
  addConversationToFolder: (folderId: string, conversationId: string) => Promise<void>
  removeConversationFromFolder: (folderId: string, conversationId: string) => Promise<void>
  loadFolders: () => Promise<void>
  // Projects
  projects: Project[]
  createProject: (name: string, description: string, instructions?: string, attachments?: File[]) => Promise<{ project: Project; uploadedFiles: File[]; uploadResults: any[] }>
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>
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
}

const ChatContext = createContext<ChatContextValue | null>(null)

// Separate context for frequently-changing streaming state
// This prevents statusPills/searchResults from causing re-renders in unrelated components
const StreamingContext = createContext<{
  statusPills: Array<{
    status: 'analyzing' | 'searching' | 'synthesizing' | 'complete'
    message: string
    timestamp: number
  }>
  searchResults: any
  contextCards: Array<{
    source: string
    snippet: string
    score: number
  }>
} | null>(null)

export function ChatProvider({ children, initialConversationId }: { children: React.ReactNode, initialConversationId?: string | null }) {
  const chatHook = useChat(initialConversationId)

  // Memoize context value to prevent unnecessary re-renders
  // Only recreate the context value when actual data changes, not on every render
  const contextValue = useMemo(() => chatHook, [
    // Dependencies: only include stable values that shouldn't change frequently
    chatHook.conversations,
    chatHook.currentConversation,
    chatHook.currentConversationId,
    chatHook.isLoading,
    chatHook.error,
    chatHook.folders,
    chatHook.projects,
    chatHook.hasMoreConversations,
    chatHook.isLoadingMoreConversations,
    chatHook.activeProjectId,
    chatHook.reasoningMode,
    chatHook.streamingMessageId,
    // NOTE: statusPills and searchResults are intentionally NOT included here
    // They change frequently during streaming and should be accessed via useStreamingContext()
    // This prevents sidebar and other consumers from re-rendering during streaming
  ])

  // Separate streaming context for frequently-changing values
  const streamingContextValue = useMemo(() => ({
    statusPills: chatHook.statusPills,
    searchResults: chatHook.searchResults,
    contextCards: chatHook.contextCards,
  }), [
    chatHook.statusPills,
    chatHook.searchResults,
    chatHook.contextCards,
  ])

  return (
    <ChatContext.Provider value={contextValue}>
      <StreamingContext.Provider value={streamingContextValue}>
        {children}
      </StreamingContext.Provider>
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider")
  }
  return context
}

export function useStreamingContext() {
  const context = useContext(StreamingContext)
  if (!context) {
    throw new Error("useStreamingContext must be used within a ChatProvider")
  }
  return context
}
