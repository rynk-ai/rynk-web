"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { Folder } from "@/lib/services/cloud-db"
import { toast } from "sonner"

// Guest-specific types that mirror authenticated types
export interface GuestConversation {
  id: string
  title: string | null
  createdAt: number
  updatedAt: number
  messageCount: number
  isPinned: boolean
  tags: string[]
  path: string[]
}

export interface GuestMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: any[] | null
  parentMessageId?: string | null
  versionOf?: string | null
  versionNumber: number
  branchId?: string | null
  referencedConversations?: any[] | null
  referencedFolders?: any[] | null
  timestamp: number
  createdAt?: string
  reasoning_metadata?: any
}

export interface GuestFolder {
  id: string
  name: string
  description: string | null
  createdAt: number
  updatedAt: number
  conversationCount: number
  conversationIds: string[]
}

export interface GuestSession {
  guestId: string
  creditsRemaining: number
  creditsLimit: number
  messageCount: number
  createdAt: string
  lastActive: string
}

export function useGuestChat(initialConversationId?: string | null) {
  const [conversations, setConversations] = useState<GuestConversation[]>([])
  const [folders, setFolders] = useState<GuestFolder[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(initialConversationId || null)
  
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  
  // Credit tracking
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  // Track which conversations are currently loading/processing
  const [loadingConversations, setLoadingConversations] = useState<Set<string>>(new Set())

  // Reasoning Mode State
  const [reasoningMode, setReasoningMode] = useState<'auto' | 'on' | 'online' | 'off'>('auto')
  const [statusPills, setStatusPills] = useState<Array<{
    status: 'analyzing' | 'building_context' | 'searching' | 'reading_sources' | 'synthesizing' | 'complete'
    message: string
    timestamp: number
    metadata?: {
      sourceCount?: number
      sourcesRead?: number
      currentSource?: string
      contextChunks?: number
      filesProcessed?: number
      totalFiles?: number
    }
  }>>([])
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<any>(null)

  // Toggle reasoning mode
  const toggleReasoningMode = useCallback(() => {
    setReasoningMode(prev => {
      switch (prev) {
        case 'auto': return 'on'
        case 'on': return 'online'
        case 'online': return 'off'
        case 'off': return 'auto'
        default: return 'auto'
      }
    })
  }, [])

  // Current conversation from list
  const currentConversation = useMemo(
    () => conversations.find(c => c.id === currentConversationId) || null,
    [conversations, currentConversationId]
  )

  // --- Guest Status ---
  const loadGuestStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/guest/status')
      if (response.ok) {
        const data: GuestSession = await response.json()
        setCreditsRemaining(data.creditsRemaining)
        return data
      }
    } catch (err) {
      console.error('Failed to load guest status:', err)
    }
    return null
  }, [])

  // --- Conversations ---
  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    try {
      const response = await fetch('/api/guest/conversations')
      if (response.ok) {
        const data = await response.json() as { conversations: GuestConversation[] }
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error('Failed to load guest conversations:', err)
      setError('Failed to load conversations')
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])

  const createConversation = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/guest/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }
      
      const data = await response.json() as { conversation: GuestConversation }
      const newConv = data.conversation
      
      setConversations(prev => [newConv, ...prev])
      setCurrentConversationId(newConv.id)
      
      return newConv.id
    } catch (err) {
      console.error('Failed to create guest conversation:', err)
      throw err
    }
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/guest/conversations/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }
      
      setConversations(prev => prev.filter(c => c.id !== id))
      if (currentConversationId === id) {
        setCurrentConversationId(null)
      }
    } catch (err) {
      console.error('Failed to delete guest conversation:', err)
      setError('Failed to delete conversation')
      throw err
    }
  }, [currentConversationId])

  const selectConversation = useCallback((id: string | null, conversation?: GuestConversation) => {
    if (id && conversation) {
      setConversations(prev => {
        if (prev.find(c => c.id === id)) return prev
        return [conversation, ...prev]
      })
    }
    setCurrentConversationId(id)
    setStatusPills([])
    setSearchResults(null)
  }, [])

  const updateConversation = useCallback(async (id: string, updates: Partial<GuestConversation>) => {
    try {
      const response = await fetch(`/api/guest/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update conversation')
      }
      
      setConversations(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    } catch (err) {
      console.error('Failed to update guest conversation:', err)
    }
  }, [])

  const updateMessage = useCallback(async (messageId: string, updates: Partial<GuestMessage>) => {
    // For guests, we only update local state mostly, but we might want to persist to DB if API exists
    // The main use case is updating reasoning metadata
    // Implementing a basic fetch call if the endpoint supports it, otherwise silent failure or local only
    try {
        // Optimistic local update would be handled by messageState in controller
        // This is for server persistence
        // Ensure reasoning_metadata is stringified if present, matching authenticated API?
        // Guest API might be simpler.
        const response = await fetch(`/api/guest/messages/${messageId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            console.warn('Failed to update guest message on server');
        }
    } catch (err) {
        console.error('Failed to update guest message:', err);
    }
  }, []);

  const togglePinConversation = useCallback(async (id: string) => {
    const conv = conversations.find(c => c.id === id)
    if (!conv) return
    await updateConversation(id, { isPinned: !conv.isPinned })
  }, [conversations, updateConversation])

  const updateConversationTags = useCallback(async (id: string, tags: string[]) => {
    await updateConversation(id, { tags })
  }, [updateConversation])

  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    await updateConversation(id, { title: newTitle })
  }, [updateConversation])

  // --- Messages ---
  const getMessages = useCallback(async (conversationId: string, limit: number = 50, cursor?: string) => {
    try {
      const url = new URL('/api/guest/conversations/' + conversationId + '/messages', window.location.origin)
      url.searchParams.set('limit', limit.toString())
      if (cursor) url.searchParams.set('cursor', cursor)
      
      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json() as { messages: GuestMessage[], nextCursor: string | null }
        return { messages: data.messages || [], nextCursor: data.nextCursor || null }
      }
    } catch (err) {
      console.error('Failed to get guest messages:', err)
    }
    return { messages: [], nextCursor: null }
  }, [])

  const sendChatRequest = useCallback(async (
    content: string,
    attachments: any[] = [],
    referencedConversations: { id: string; title: string }[] = [],
    referencedFolders: { id: string; name: string }[] = [],
    conversationIdParam?: string,
    userMessageIdParam?: string,
    assistantMessageIdParam?: string
  ): Promise<{
    streamReader: ReadableStreamDefaultReader<Uint8Array>;
    conversationId: string;
    userMessageId: string | null;
    assistantMessageId: string | null;
  } | null> => {
    if (!content.trim()) return null

    // Check credits before sending
    if (creditsRemaining !== null && creditsRemaining <= 0) {
      setShowUpgradeModal(true)
      return null
    }

    setIsLoading(true)
    setError(null)
    setStatusPills([{
      status: 'analyzing',
      message: 'Analyzing request...',
      timestamp: Date.now()
    }])
    setSearchResults(null)

    let conversationId = conversationIdParam || currentConversationId

    try {
      if (!conversationId) {
        conversationId = await createConversation()
      }

      // Track this conversation as loading
      if (conversationId) {
        setLoadingConversations(prev => {
          const newSet = new Set(prev)
          newSet.add(conversationId!)
          return newSet
        })
      }

      const userMessageId = userMessageIdParam || crypto.randomUUID()
      const assistantMessageId = assistantMessageIdParam || crypto.randomUUID()

      // Call guest chat API
      const response = await fetch('/api/guest/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Message-Id': userMessageId,
          'X-Assistant-Message-Id': assistantMessageId
        },
        body: JSON.stringify({
          conversationId,
          message: content,
          attachments: [],  // No file uploads for guest
          referencedConversations,
          referencedFolders,
          useReasoning: reasoningMode
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string }
        
        // Check if credits exhausted
        if (response.status === 402 || errorData.error?.includes('credit')) {
          setShowUpgradeModal(true)
          setCreditsRemaining(0)
          throw new Error('Guest credits exhausted')
        }
        
        throw new Error(errorData.error || 'Failed to send message')
      }

      if (!response.body) throw new Error('No response body')

      const realUserMessageId = response.headers.get('X-User-Message-Id') || userMessageId
      const realAssistantMessageId = response.headers.get('X-Assistant-Message-Id') || assistantMessageId

      setStreamingMessageId(realAssistantMessageId)

      // Handle streaming with status pill extraction
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      const wrappedReader = new ReadableStreamDefaultReader(new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                setStatusPills(prev => [...prev, {
                  status: 'complete',
                  message: 'Complete',
                  timestamp: Date.now()
                }])
                controller.close()
                break
              }

              const text = decoder.decode(value, { stream: true })
              const lines = text.split('\n')
              let contentChunk = ''

              for (let i = 0; i < lines.length; i++) {
                const line = lines[i]

                try {
                  if (line.startsWith('{"type":"status"') || line.startsWith('{"type":"search_results"')) {
                    const parsed = JSON.parse(line)

                    if (parsed.type === 'status') {
                      setStatusPills(prev => [...prev, {
                        status: parsed.status,
                        message: parsed.message,
                        timestamp: parsed.timestamp
                      }])
                      continue
                    }

                    if (parsed.type === 'search_results') {
                      setSearchResults({
                        query: parsed.query,
                        sources: parsed.sources,
                        strategy: parsed.strategy,
                        totalResults: parsed.totalResults
                      })
                      continue
                    }
                  }
                } catch (e) {
                  // Not JSON, treat as content
                }

                if (line.trim()) {
                  contentChunk += line
                }
                if (i < lines.length - 1) {
                  contentChunk += '\n'
                }
              }

              if (contentChunk) {
                controller.enqueue(new TextEncoder().encode(contentChunk))
              }
            }
          } catch (err) {
            controller.error(err)
          }
        }
      }))

      // Decrement credits locally
      if (creditsRemaining !== null) {
        setCreditsRemaining(prev => prev !== null ? Math.max(0, prev - 1) : null)
      }

      // Reload guest status to get accurate credit count
      loadGuestStatus()

      return {
        streamReader: wrappedReader,
        conversationId,
        userMessageId: realUserMessageId,
        assistantMessageId: realAssistantMessageId
      }

    } catch (err) {
      console.error('Failed to send guest message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      
      if (conversationId) {
        setLoadingConversations(prev => {
          const newSet = new Set(prev)
          newSet.delete(conversationId!)
          return newSet
        })
      }
      throw err
    } finally {
      setIsLoading(false)
      if (conversationId) {
        setLoadingConversations(prev => {
          const newSet = new Set(prev)
          newSet.delete(conversationId!)
          return newSet
        })
      }
    }
  }, [currentConversationId, createConversation, creditsRemaining, loadGuestStatus, reasoningMode])

  // Legacy wrapper
  const sendMessage = useCallback(async (
    content: string,
    files: File[] = [],  // Ignored for guest
    referencedConversations: { id: string; title: string }[] = [],
    referencedFolders: { id: string; name: string }[] = []
  ) => {
    // Guest doesn't support file uploads
    if (files.length > 0) {
      toast.info('File uploads require signing in')
    }
    
    return sendChatRequest(content, [], referencedConversations, referencedFolders)
  }, [sendChatRequest])

  // --- Folders ---
  const loadFolders = useCallback(async () => {
    try {
      const response = await fetch('/api/guest/folders')
      if (response.ok) {
        const data = await response.json() as { folders: GuestFolder[] }
        setFolders(data.folders || [])
      }
    } catch (err) {
      console.error('Failed to load guest folders:', err)
    }
  }, [])

  const createFolder = useCallback(async (name: string, description?: string): Promise<GuestFolder> => {
    try {
      const response = await fetch('/api/guest/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create folder')
      }
      
      const data = await response.json() as { folder: GuestFolder }
      const newFolder = data.folder
      
      setFolders(prev => [newFolder, ...prev])
      return newFolder
    } catch (err) {
      console.error('Failed to create guest folder:', err)
      throw err
    }
  }, [])

  const updateFolder = useCallback(async (folderId: string, updates: Partial<GuestFolder>) => {
    try {
      const response = await fetch(`/api/guest/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update folder')
      }
      
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, ...updates } : f))
      await loadFolders()
    } catch (err) {
      console.error('Failed to update guest folder:', err)
      throw err
    }
  }, [loadFolders])

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      const response = await fetch(`/api/guest/folders/${folderId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete folder')
      }
      
      setFolders(prev => prev.filter(f => f.id !== folderId))
    } catch (err) {
      console.error('Failed to delete guest folder:', err)
      throw err
    }
  }, [])

  const addConversationToFolder = useCallback(async (folderId: string, conversationId: string) => {
    try {
      const response = await fetch(`/api/guest/folders/${folderId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      })
      
      if (!response.ok) {
        throw new Error('Failed to add conversation to folder')
      }
      
      await loadFolders()
    } catch (err) {
      console.error('Failed to add conversation to folder:', err)
      throw err
    }
  }, [loadFolders])

  const removeConversationFromFolder = useCallback(async (folderId: string, conversationId: string) => {
    try {
      const response = await fetch(`/api/guest/folders/${folderId}/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove conversation from folder')
      }
      
      await loadFolders()
    } catch (err) {
      console.error('Failed to remove conversation from folder:', err)
      throw err
    }
  }, [loadFolders])

  // --- Tags ---
  const getAllTags = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch('/api/guest/tags')
      if (response.ok) {
        const data = await response.json() as { tags: string[] }
        return data.tags || []
      }
    } catch (err) {
      console.error('Failed to get guest tags:', err)
    }
    return []
  }, [])

  // --- Search ---
  const searchConversations = useCallback(async (query: string, limit: number = 20, offset: number = 0) => {
    try {
      const url = new URL('/api/guest/conversations/search', window.location.origin)
      url.searchParams.set('q', query)
      url.searchParams.set('limit', limit.toString())
      url.searchParams.set('offset', offset.toString())
      
      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json() as { conversations: GuestConversation[] }
        return data.conversations || []
      }
    } catch (err) {
      console.error('Failed to search guest conversations:', err)
    }
    return []
  }, [])

  // --- Placeholder functions for compatibility ---
  // These don't work for guests but need to exist for interface compatibility

  const uploadAttachments = useCallback(async (files: File[]) => {
    toast.info('File uploads require signing in')
    return []
  }, [])

  const editMessage = useCallback(async () => {
    toast.info('Message editing requires signing in')
    return undefined
  }, [])

  const deleteMessage = useCallback(async () => {
    toast.info('Message deletion requires signing in')
  }, [])

  const switchToMessageVersion = useCallback(async () => {
    toast.info('Message versions require signing in')
  }, [])

  const getMessageVersions = useCallback(async () => {
    return []
  }, [])

  const branchConversation = useCallback(async (): Promise<string> => {
    toast.info('Branching requires signing in')
    throw new Error('Not available for guests')
  }, [])

  const setConversationContext = useCallback(async () => {
    // Context picker works for guests but we don't persist it
  }, [])

  const clearConversationContext = useCallback(async () => {
    // No-op for guests
  }, [])

  // --- Initial load ---
  useEffect(() => {
    loadConversations()
    loadFolders()
    loadGuestStatus()
  }, [loadConversations, loadFolders, loadGuestStatus])

  return {
    // Conversations
    conversations,
    currentConversation,
    currentConversationId,
    isLoading,
    loadingConversations,
    error,
    createConversation,
    deleteConversation,
    selectConversation,
    searchConversations,
    sendMessage,
    uploadAttachments,
    sendChatRequest,
    loadConversations,
    togglePinConversation,
    updateConversationTags,
    renameConversation,
    getAllTags,
    editMessage,
    deleteMessage,
    switchToMessageVersion,
    getMessageVersions,
    getMessages,
    // Folders
    folders,
    createFolder,
    updateFolder,
    deleteFolder,
    addConversationToFolder,
    removeConversationFromFolder,
    loadFolders,
    // Projects (not available for guests)
    projects: [],
    createProject: async () => { throw new Error('Not available for guests') },
    updateProject: async () => { throw new Error('Not available for guests') },
    deleteProject: async () => { throw new Error('Not available for guests') },
    loadProjects: async () => {},
    branchConversation,
    setConversationContext,
    clearConversationContext,
    // Pagination (simplified for guest)
    loadMoreConversations: async () => {},
    hasMoreConversations: false,
    isLoadingMoreConversations: false,
    activeProjectId: null,
    selectProject: () => {},
    // Agentic & Reasoning
    reasoningMode,
    toggleReasoningMode,
    statusPills,
    searchResults,
    streamingMessageId,
    // Guest-specific
    creditsRemaining,
    showUpgradeModal,
    setShowUpgradeModal,
    isLoadingConversations,
    // Setters exposed for controller
    setStatusPills,
    setSearchResults,
    updateMessage
  }
}
