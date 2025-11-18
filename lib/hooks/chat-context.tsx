"use client"

import React, { createContext, useContext } from "react"
import { useChat } from "./use-chat"
import type { Conversation, Message } from "@/lib/services/indexeddb"

interface ChatContextValue {
  conversations: Conversation[]
  currentConversation: Conversation | null
  currentConversationId: string | null
  isLoading: boolean
  error: string | null
  createConversation: () => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  selectConversation: (id: string) => void
  sendMessage: (content: string, files?: File[]) => Promise<void>
  loadConversations: () => Promise<void>
  togglePinConversation: (id: string) => Promise<void>
  updateConversationTags: (id: string, tags: string[]) => Promise<void>
  getAllTags: () => Promise<string[]>
  editMessage: (messageId: string, newContent: string, newAttachments?: File[]) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  switchToMessageVersion: (messageId: string) => Promise<void>
  getMessageVersions: (originalMessageId: string) => Promise<Message[]>
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
