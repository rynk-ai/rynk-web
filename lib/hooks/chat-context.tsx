"use client"

import React, { createContext, useContext } from "react"
import { useChat } from "./use-chat"
import type { CloudConversation as Conversation, CloudMessage as Message, Folder, Project } from "@/lib/services/cloud-db"

interface ChatContextValue {
  conversations: Conversation[]
  currentConversation: Conversation | null
  currentConversationId: string | null
  isLoading: boolean
  error: string | null
  createConversation: (projectId?: string) => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  selectConversation: (id: string | null) => void
  sendMessage: (content: string, files?: File[], referencedConversations?: { id: string; title: string }[], referencedFolders?: { id: string; name: string }[]) => Promise<Message | undefined>
  loadConversations: () => Promise<void>
  togglePinConversation: (id: string) => Promise<void>
  updateConversationTags: (id: string, tags: string[]) => Promise<void>
  renameConversation: (id: string, newTitle: string) => Promise<void>
  getAllTags: () => Promise<string[]>
  editMessage: (messageId: string, newContent: string, newAttachments?: File[], referencedConversations?: { id: string; title: string }[], referencedFolders?: { id: string; name: string }[]) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  switchToMessageVersion: (messageId: string) => Promise<void>
  getMessageVersions: (originalMessageId: string) => Promise<Message[]>
  getMessages: (conversationId: string) => Promise<Message[]>
  generateAIResponse: (conversationId: string) => Promise<void>
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
  createProject: (name: string, description: string, instructions?: string, attachments?: File[]) => Promise<Project>
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  loadProjects: () => Promise<void>
  branchConversation: (messageId: string) => Promise<string>

}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const chatHook = useChat()

  return (
    <ChatContext.Provider value={chatHook}>
      {children}
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
