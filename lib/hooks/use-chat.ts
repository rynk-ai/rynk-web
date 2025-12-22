"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { 
  getConversations, 
  searchConversations as searchConversationsAction,
  createConversation as createConversationAction, 
  deleteConversation as deleteConversationAction,
  updateConversation as updateConversationAction,
  deleteMessage as deleteMessageAction,
  getAllTags as getAllTagsAction,
  getMessages as getMessagesAction,
  uploadFile as uploadFileAction,
  initiateMultipartUpload as initiateMultipartUploadAction,
  uploadPart as uploadPartAction,
  completeMultipartUpload as completeMultipartUploadAction,
  getFolders as getFoldersAction,
  createFolder as createFolderAction,
  updateFolder as updateFolderAction,
  deleteFolder as deleteFolderAction,
  addConversationToFolder as addConversationToFolderAction,
  removeConversationFromFolder as removeConversationFromFolderAction,
  getProjects as getProjectsAction,
  createProject as createProjectAction,
  updateProject as updateProjectAction,
  deleteProject as deleteProjectAction,
  branchConversation as branchConversationAction,
  createMessageVersion as createMessageVersionAction,
  getMessageVersions as getMessageVersionsAction,
  switchToMessageVersion as switchToMessageVersionAction,
  setConversationContext as setConversationContextAction,
  clearConversationContext as clearConversationContextAction,
  generateTitleAction,
  getUserCredits as getUserCreditsAction
} from "@/app/actions"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// PDF size threshold: 500KB
const PDF_SIZE_THRESHOLD = 500 * 1024

/**
 * Determine if a PDF should use async indexing (large) or inline text extraction (small)
 */
function isPDFLarge(file: File): boolean {
  return file.size >= PDF_SIZE_THRESHOLD
}
import { type CloudConversation as Conversation, type CloudMessage as Message, type Folder, type Project } from "@/lib/services/cloud-db"
import { searchEmbeddings } from "@/lib/utils/vector"
import {
  filesToBase64,
  fileToBase64,
  isImageFile,
  isPDFFile,
  isSupportedForMultimodal,
  pdfToBase64Images,
  extractTextFromPDF,
} from "@/lib/utils/file-converter"
import { toast } from "sonner"
import { chunkText } from '@/lib/utils/chunking'
import { usePathname } from "next/navigation"

export function useChat(initialConversationId?: string | null) {
  const queryClient = useQueryClient()
  const pathname = usePathname()

  // Extract projectId from URL if on /project/[id] route
  const projectIdFromUrl = pathname?.startsWith('/project/')
    ? pathname.split('/')[2]
    : null

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(initialConversationId || null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  // Use URL-based projectId if available, otherwise fall back to state
  const effectiveProjectId = projectIdFromUrl || activeProjectId

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false) // Keep for manual loading states like sending messages

  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Track which conversations are currently loading/processing
  const [loadingConversations, setLoadingConversations] = useState<Set<string>>(new Set())

  // Agentic and Reasoning Mode State
  const [agenticMode, setAgenticMode] = useState<boolean>(false)
  const [reasoningMode, setReasoningMode] = useState<'auto' | 'on' | 'online' | 'off'>('auto')
  const [statusPills, setStatusPills] = useState<Array<{
    status: 'analyzing' | 'searching' | 'synthesizing' | 'complete'
    message: string
    timestamp: number
  }>>([])
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  // Search results from web search
  const [searchResults, setSearchResults] = useState<any>(null)

  // Context cards from RAG (shows what context was retrieved)
  const [contextCards, setContextCards] = useState<Array<{
    source: string
    snippet: string
    score: number
  }>>([]);

  // Toggle reasoning mode: auto -> on -> online -> off -> auto
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


  // --- Queries ---

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', effectiveProjectId], // Add projectId to query key to trigger refetch on change
    queryFn: () => getConversations(50, 0, effectiveProjectId || undefined), // Fetch more initially for better cache coverage
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Memoize currentConversation to prevent unnecessary recalculations
  const currentConversation = useMemo(
    () => conversations.find(c => c.id === currentConversationId) || null,
    [conversations, currentConversationId]
  )

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => getFoldersAction(),
    staleTime: 1000 * 60 * 60, // 1 hour (folders change less often)
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjectsAction(),
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  // User credits - fetch on mount and refresh after each message
  const { data: userCredits = null, refetch: refetchCredits } = useQuery({
    queryKey: ['userCredits'],
    queryFn: () => getUserCreditsAction().catch(() => null),
    staleTime: 1000 * 30, // 30 seconds (refresh frequently)
    refetchOnWindowFocus: true,
  })

  // --- Mutations ---

  const createConversationMutation = useMutation({
    mutationFn: async (projectId?: string) => createConversationAction(projectId),
    onSuccess: (newConv) => {
      // Update cache with correct query key including projectId
      queryClient.setQueryData(['conversations', effectiveProjectId], (old: Conversation[] = []) => [newConv, ...old])
      setCurrentConversationId(newConv.id)
    },
  })

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => deleteConversationAction(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['conversations', effectiveProjectId] })
      const previousConversations = queryClient.getQueryData(['conversations', effectiveProjectId])
      queryClient.setQueryData(['conversations', effectiveProjectId], (old: Conversation[] = []) => old.filter(c => c.id !== id))
      if (currentConversationId === id) setCurrentConversationId(null)
      return { previousConversations }
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['conversations', effectiveProjectId], context?.previousConversations)
      setError('Failed to delete conversation')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', effectiveProjectId] })
    },
  })

  const updateConversationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Conversation> }) =>
      updateConversationAction(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['conversations', effectiveProjectId] })
      const previousConversations = queryClient.getQueryData(['conversations', effectiveProjectId])
      queryClient.setQueryData(['conversations', effectiveProjectId], (old: Conversation[] = []) =>
        old.map(c => c.id === id ? { ...c, ...updates } : c)
      )
      return { previousConversations }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['conversations', effectiveProjectId], context?.previousConversations)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', effectiveProjectId] })
    },
  })

  // --- Legacy Loaders (Mapped to Refetch/No-op for compatibility) ---
  
  // Update hasMore state based on conversations length
  useEffect(() => {
    if (conversations.length > 0 && conversations.length < 50) {
      setHasMore(false)
    }
  }, [conversations.length])

  const loadMoreConversations = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const limit = 20
      // Use current length as offset to fetch next batch
      // IMPORTANT: If we are filtering by project, we need to pass the projectId
      // But wait, if we are filtering by project, the `conversations` list in the cache MIGHT contain non-project conversations if we switched views?
      // No, we should probably invalidate the cache when switching projects.
      // For now, let's just pass the projectId.
      const offset = conversations.length
      const nextBatch = await getConversations(limit, offset, effectiveProjectId || undefined)
      
      if (nextBatch.length > 0) {
        queryClient.setQueryData(['conversations', effectiveProjectId], (old: Conversation[] = []) => {
          // Create a Set of existing IDs for O(1) lookup
          const existingIds = new Set(old.map(c => c.id))
          // Only add conversations that aren't already in the list
          const uniqueNewConversations = nextBatch.filter(c => !existingIds.has(c.id))
          return [...old, ...uniqueNewConversations]
        })
        // If we received fewer items than requested, we've reached the end
        setHasMore(nextBatch.length === limit)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load more conversations:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [conversations.length, hasMore, isLoadingMore, queryClient, effectiveProjectId])
  
  const loadConversations = useCallback(async (force = false) => {
    if (force) await queryClient.invalidateQueries({ queryKey: ['conversations', effectiveProjectId] })
  }, [queryClient, effectiveProjectId])

  const loadFolders = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['folders'] })
  }, [queryClient])

  const loadProjects = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['projects'] })
  }, [queryClient])

  const createConversation = useCallback(async (projectId?: string) => {
    try {
      const conversationId = await createConversationMutation.mutateAsync(projectId)
      return conversationId.id
    } catch (err) {
      console.error('Failed to create conversation:', err)
      throw err
    }
  }, [createConversationMutation])

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await deleteConversationMutation.mutateAsync(id)
    } catch (err) {
      console.error('Failed to delete conversation:', err)
      throw err
    }
  }, [deleteConversationMutation])

  const selectConversation = useCallback((id: string | null, conversation?: Conversation) => {
    // If conversation object is provided, we can optimistically add it to cache if missing
    if (id && conversation) {
      queryClient.setQueryData(['conversations', effectiveProjectId], (old: Conversation[] = []) => {
        if (old.find(c => c.id === id)) return old
        return [conversation, ...old]
      })
    }
    setCurrentConversationId(id)
    // Clear transient state - use functional updates to avoid creating new references if already empty
    setStatusPills(prev => prev.length === 0 ? prev : [])
    setSearchResults((prev: any) => prev === null ? prev : null)
    setContextCards(prev => prev.length === 0 ? prev : [])
  }, [queryClient, effectiveProjectId])

  const selectProject = useCallback((id: string | null) => {
    setActiveProjectId(id)
  }, [])



  const generateTitle = useCallback(async (conversationId: string, messageContent: string) => {
    try {
      // Optimistic update with correct query key
      queryClient.setQueryData(['conversations', effectiveProjectId], (old: Conversation[] = []) => 
        old.map(c => c.id === conversationId ? { ...c, title: 'Generating title...' } : c)
      )

      const title = await generateTitleAction(conversationId, messageContent)
      
      if (title) {
        queryClient.setQueryData(['conversations', effectiveProjectId], (old: Conversation[] = []) => 
          old.map(c => c.id === conversationId ? { ...c, title } : c)
        )
      }
    } catch (error) {
      console.error('Failed to generate title:', error)
      queryClient.invalidateQueries({ queryKey: ['conversations', effectiveProjectId] })
    }
  }, [queryClient, effectiveProjectId])

  const setConversationContext = useCallback(async (
    conversationId: string,
    referencedConversations?: { id: string; title: string }[],
    referencedFolders?: { id: string; name: string }[]
  ) => {
    // Optimistic update
    updateConversationMutation.mutate({ 
      id: conversationId, 
      updates: { 
        activeReferencedConversations: referencedConversations || [],
        activeReferencedFolders: referencedFolders || []
      } 
    })
    
    // Backend sync (async) - handled by mutation but we can also call action directly if needed for specific return
    // But mutation is better. However, the original code called a specific action.
    // Let's stick to the mutation for consistency as it handles the optimistic update + server call.
    // Wait, the original action `setConversationContextAction` might do more than just update DB?
    // Checking actions.ts... it just calls `updateConversation`. So mutation is fine.
  }, [updateConversationMutation])

  const clearConversationContext = useCallback(async (conversationId: string) => {
    updateConversationMutation.mutate({ 
      id: conversationId, 
      updates: { 
        activeReferencedConversations: [],
        activeReferencedFolders: []
      } 
    })
  }, [updateConversationMutation])

  /**
   * Process file attachments, handling PDFs specially:
   * 1. Try to extract text from PDFs
   * 2. If text is insufficient, convert pages to images
   * 3. Upload to R2 and return metadata with processed data
   */
  /**
   * Process file attachments - FAST R2 upload only
   * PDF indexing happens in background via indexing queue
   */
  const processAttachments = useCallback(async (files: File[]): Promise<any[]> => {
    if (files.length === 0) return []

    console.log('[processAttachments] Processing files:', files.length)


    const uploadPromises = files.map(async (file) => {
      try {
        // Check if PDF is large (needs async indexing)
        const isLarge = file.type === 'application/pdf' && isPDFLarge(file)
        
        if (isLarge) {
          console.log(`[processAttachments] Large PDF detected (${file.size} bytes):`, file.name)
        } else if (file.type === 'application/pdf') {
          console.log(`[processAttachments] Small PDF detected (${file.size} bytes):`, file.name)
        }
        
        // Upload to R2 (fast, < 1s per file)
        // Use Presigned URL to avoid Worker body limits
        // Upload to R2 using Multipart Upload (via Worker)
        // Chunk size: 6MB (Min 5MB for R2, Max 100MB for Worker)
        const CHUNK_SIZE = 6 * 1024 * 1024; 
        let publicUrl = '';

        if (file.size <= CHUNK_SIZE) {
           // Small file: Use simple upload
           const formData = new FormData()
           formData.append('file', file)
           const result = await uploadFileAction(formData)
           publicUrl = result.url
        } else {
           // Large file: Use Multipart Upload
           console.log(`[processAttachments] Starting multipart upload for ${file.name} (${file.size} bytes)`)
           const { uploadId, key } = await initiateMultipartUploadAction(file.name, file.type)
           const parts = []
           const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

           for (let i = 0; i < totalChunks; i++) {
             const start = i * CHUNK_SIZE
             const end = Math.min(start + CHUNK_SIZE, file.size)
             const chunk = file.slice(start, end)
             
             const formData = new FormData()
             formData.append('chunk', chunk)
             
             console.log(`[processAttachments] Uploading part ${i + 1}/${totalChunks}`)
             const part = await uploadPartAction(key, uploadId, i + 1, formData)
             parts.push(part)
           }

           publicUrl = await completeMultipartUploadAction(key, uploadId, parts)
        }
        
        console.log('[processAttachments] ✅ File uploaded:', publicUrl)
        
        return {
          file, // ← CRITICAL: Keep original File for background indexing
          url: publicUrl,
          name: file.name,
          type: file.type,
          size: file.size,
          isLargePDF: isLarge // Flag for later processing
        }
      } catch (error) {
        console.error('[processAttachments] Failed to upload file:', file.name, error)
        toast.error(`Failed to upload ${file.name}`)
        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    const processed = results.filter(Boolean)

    return processed
  }, [])

  const uploadAttachments = useCallback(async (files: File[]): Promise<any[]> => {
    if (!files || files.length === 0) return []
    console.log('[uploadAttachments] Uploading files to R2...')
    const uploaded = await processAttachments(files)
    console.log('[uploadAttachments] ✅ Files uploaded to R2')
    return uploaded
  }, [processAttachments])

  const sendChatRequest = useCallback(async (
    content: string,
    attachments: any[] = [], // Expects processed metadata/R2 URLs
    referencedConversations: { id: string; title: string }[] = [],
    referencedFolders: { id: string; name: string }[] = [],
    conversationIdParam?: string, // Optional override
    userMessageIdParam?: string, // Optional override
    assistantMessageIdParam?: string // Optional override
  ): Promise<{
    streamReader: ReadableStreamDefaultReader<Uint8Array>;
    conversationId: string;
    userMessageId: string | null;
    assistantMessageId: string | null;
  } | null> => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return null
    const headers: Record<string, string> = {}

    setIsLoading(true)
    setError(null)
    setStatusPills([{
      status: 'analyzing',
      message: 'Analyzing request...',
      timestamp: Date.now()
    }]) // Show initial status immediately
    setSearchResults(null) // Clear previous search results
    setContextCards([]) // Clear previous context cards

    // Track reasoning metadata to be saved with message
    const collectedStatusPills: typeof statusPills = []
    const collectedSearchResults: typeof searchResults = null

    console.log('[sendChatRequest] effectiveProjectId:', effectiveProjectId)

    let conversationId = conversationIdParam || currentConversationId

    // Only generate title if it's a new conversation or the title is still the default
    const shouldGenerateTitle = !currentConversationId || (currentConversation?.title === 'New Conversation')

    try {
      if (!conversationId) {
        // Create new conversation via mutation to ensure cache update
        const conv = await createConversationMutation.mutateAsync(effectiveProjectId || undefined)
        conversationId = conv.id
        // setCurrentConversationId is handled in onSuccess of mutation

        // If context is provided for the first message, set it as persistent context
        if ((referencedConversations && referencedConversations.length > 0) ||
            (referencedFolders && referencedFolders.length > 0)) {
          // We can't use the mutation here easily because we need to wait for it?
          // Actually we can just fire it.
          setConversationContext(conversationId, referencedConversations, referencedFolders)
        }
      }

      // Track this conversation as loading
      if (conversationId) {
        setLoadingConversations(prev => {
          const newSet = new Set(prev)
          newSet.add(conversationId!)
          return newSet
        })
      }

      // Generate IDs early so we can link attachments
      const userMessageId = userMessageIdParam || crypto.randomUUID()
      const assistantMessageId = assistantMessageIdParam || crypto.randomUUID()

      // Call the unified API
      // Note: Server-side ChatService creates REAL user and assistant messages immediately
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Pass IDs in headers so server uses them instead of generating new ones
          'X-User-Message-Id': userMessageId,
          'X-Assistant-Message-Id': assistantMessageId
        },
        body: JSON.stringify({
          conversationId,
          message: content,
          attachments: attachments, // Pass processed attachments
          referencedConversations,
          referencedFolders,
          useReasoning: reasoningMode // Pass current reasoning mode
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      if (!response.body) throw new Error('No response body')

      // Read REAL message IDs from response headers (backend returns them)
      const realUserMessageId = response.headers.get('X-User-Message-Id') || userMessageId
      const realAssistantMessageId = response.headers.get('X-Assistant-Message-Id') || assistantMessageId

      console.log('[sendChatRequest] Message IDs from backend:', { realUserMessageId, realAssistantMessageId })

      // Set streaming message ID immediately so status pills can be displayed
      setStreamingMessageId(realAssistantMessageId)

      // Handle Streaming
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      // Create a wrapped reader that intercepts status messages
      const wrappedReader = new ReadableStreamDefaultReader(new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                // Mark reasoning as complete when stream ends
                setStatusPills(prev => [...prev, {
                  status: 'complete',
                  message: 'Reasoning complete',
                  timestamp: Date.now()
                }])
                controller.close()
                break
              }

              const text = decoder.decode(value, { stream: true })

              // Check for status messages (JSON format)
              // We split by newline in case multiple chunks came together
              const lines = text.split('\n')
              let contentChunk = ''

              for (let i = 0; i < lines.length; i++) {
                const line = lines[i]

                try {
                  // Try to parse as JSON status, search results, or context cards message
                  if (line.startsWith('{"type":"status"') || line.startsWith('{"type":"search_results"') || line.startsWith('{"type":"context_cards"')) {
                    const parsed = JSON.parse(line)

                    if (parsed.type === 'status') {
                      console.log('[useChat] Parsed status pill:', parsed)
                      setStatusPills(prev => {
                        const updated = [...prev, {
                          status: parsed.status,
                          message: parsed.message,
                          timestamp: parsed.timestamp
                        }]
                        console.log('[useChat] Updated status pills:', updated)
                        return updated
                      })
                      continue // Don't pass this to the content stream
                    }

                    if (parsed.type === 'search_results') {
                      setSearchResults({
                        query: parsed.query,
                        sources: parsed.sources,
                        strategy: parsed.strategy,
                        totalResults: parsed.totalResults
                      })
                      continue // Don't pass this to the content stream
                    }

                    if (parsed.type === 'context_cards') {
                      console.log('[useChat] Parsed context cards:', parsed.cards?.length)
                      setContextCards(parsed.cards || [])
                      continue // Don't pass this to the content stream
                    }
                  }
                } catch (e) {
                  // Not a JSON object, treat as content
                }

                // If not a status message, it's content
                if (line.trim()) {
                  contentChunk += line
                }
                // Add newline after each line (including empty ones) to preserve structure
                // This is critical because split('\n') removes the newlines
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

      // Generate title if needed (fire and forget for performance)
      if (shouldGenerateTitle) {
        generateTitle(conversationId, content)
      }
      
      // Return stream reader, conversationId, REAL message IDs
      return {
        streamReader: wrappedReader,
        conversationId,
        userMessageId: realUserMessageId,
        assistantMessageId: realAssistantMessageId
      }

    } catch (err) {
      console.error('Failed to send message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Remove from loading on error
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
      // Remove from loading on success
      if (conversationId) {
        setLoadingConversations(prev => {
          const newSet = new Set(prev)
          newSet.delete(conversationId!)
          return newSet
        })
      }
      // Refresh credits after sending message (decrement happens server-side)
      refetchCredits()
    }
  }, [currentConversationId, currentConversation, generateTitle, setConversationContext, activeProjectId, reasoningMode, refetchCredits])

  // Legacy wrapper for backward compatibility (if needed)
  const sendMessage = useCallback(async (
    content: string,
    files: File[] = [],
    referencedConversations: { id: string; title: string }[] = [],
    referencedFolders: { id: string; name: string }[] = []
  ) => {
    // 1. Upload
    const uploadedAttachments = await uploadAttachments(files)
    
    // 2. Send (Note: This skips the indexing wait, so it's the "old" behavior)
    // We return the result + uploadedFiles for the caller to handle indexing if they want
    const result = await sendChatRequest(content, uploadedAttachments, referencedConversations, referencedFolders)
    
    if (!result) return null

    // Reconstruct the return shape expected by legacy callers
    const uploadedFilesForIndexing: { file: File; r2Url: string }[] = []
    files.forEach((file, i) => {
      if (uploadedAttachments[i]?.url) {
        uploadedFilesForIndexing.push({
          file,
          r2Url: uploadedAttachments[i].url
        })
      }
    })

    return {
      ...result,
      uploadedFiles: uploadedFilesForIndexing
    }
  }, [uploadAttachments, sendChatRequest])

  const togglePinConversation = useCallback(async (id: string) => {
    const conv = conversations.find(c => c.id === id)
    if (!conv) return
    
    updateConversationMutation.mutate({ 
      id, 
      updates: { isPinned: !conv.isPinned } 
    })
  }, [conversations, updateConversationMutation])

  const updateConversationTags = useCallback(async (id: string, tags: string[]) => {
    updateConversationMutation.mutate({ 
      id, 
      updates: { tags } 
    })
  }, [updateConversationMutation])

  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    updateConversationMutation.mutate({ 
      id, 
      updates: { title: newTitle } 
    })
  }, [updateConversationMutation])

  const getAllTags = useCallback(async (): Promise<string[]> => {
    try {
      return await getAllTagsAction()
    } catch (err) {
      console.error('Failed to get tags:', err)
      return []
    }
  }, [])

  const editMessage = useCallback(async (
    messageId: string,
    newContent: string,
    newAttachments?: (File | any)[], // Accept both File and existing Attachment objects
    referencedConversations?: { id: string; title: string }[],
    referencedFolders?: { id: string; name: string }[]
  ): Promise<{ newMessage: any; conversationPath: string[] }> => {
    console.log('📝 [editMessage] Starting:', {
      messageId,
      conversationId: currentConversationId,
      contentLength: newContent.length,
      hasAttachments: !!newAttachments && newAttachments.length > 0,
      referencedConversations: referencedConversations?.length || 0,
      referencedFolders: referencedFolders?.length || 0
    });

    try {
      // Separate new files (File objects) from existing attachments (objects with url)
      const filesToUpload: File[] = [];
      const existingAttachments: any[] = [];

      if (newAttachments) {
        newAttachments.forEach(item => {
          if (item instanceof File) {
            filesToUpload.push(item);
          } else {
            existingAttachments.push(item);
          }
        });
      }

      // Upload new attachments if any, with PDF processing
      let uploadedAttachments: any[] = [];
      if (filesToUpload.length > 0) {
        console.log('[editMessage] Processing new attachments:', filesToUpload.length);
        uploadedAttachments = await processAttachments(filesToUpload)
        console.log('✅ [editMessage] New attachments processed:', uploadedAttachments.length);
      }

      // Combine existing and new attachments
      const finalAttachments = [...existingAttachments, ...uploadedAttachments];

      // Call server action to create new version
      console.log('🔄 [editMessage] Calling createMessageVersionAction...');
      const result = await createMessageVersionAction(
        currentConversationId!,
        messageId,
        newContent,
        finalAttachments,
        referencedConversations,
        referencedFolders
      )

      console.log('✅ [editMessage] Version created:', {
        newMessageId: result.newMessage.id,
        conversationPath: result.conversationPath,
        hasNewMessage: !!result.newMessage
      });

      // Return the new message and updated path
      return result

    } catch (error) {
      console.error('❌ [editMessage] Failed:', error)
      throw error // Re-throw so caller knows it failed
    }
  }, [currentConversationId])


  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentConversationId) return
    try {
      // We could make this a mutation too, but for now just invalidating is fine
      await deleteMessageAction(currentConversationId, messageId)
      // For messages we might need a separate query if we want to cache them too.
      // Currently messages are not fully cached in this hook (they are fetched in page.tsx or components).
      // But if we want to update the conversation list (e.g. preview text), we should invalidate.
      queryClient.invalidateQueries({ queryKey: ['conversations', effectiveProjectId] })
    } catch (err) {
      console.error('Failed to delete message:', err)
      setError('Failed to delete message')
    }
  }, [currentConversationId, queryClient, effectiveProjectId])

  const switchToMessageVersion = useCallback(async (messageId: string) => {
    if (!currentConversationId) return
    try {
      await switchToMessageVersionAction(currentConversationId, messageId)
      queryClient.invalidateQueries({ queryKey: ['conversations', effectiveProjectId] })
    } catch (error) {
      console.error('Failed to switch message version:', error)
    }
  }, [currentConversationId, queryClient, effectiveProjectId])

  const getMessageVersions = useCallback(async (originalMessageId: string) => {
    try {
      return await getMessageVersionsAction(originalMessageId)
    } catch (error) {
      console.error('Failed to get message versions:', error)
      return []
    }
  }, [])

  // Folder management methods
  // Folder management methods

  const createFolder = useCallback(async (
    name: string,
    description?: string,
    conversationIds?: string[]
  ) => {
    try {
      const folder = await createFolderAction(name, description, conversationIds)
      await loadFolders()
      return folder as Folder
    } catch (err) {
      console.error('Failed to create folder:', err)
      setError('Failed to create folder')
      throw err
    }
  }, [loadFolders])

  const updateFolder = useCallback(async (folderId: string, updates: Partial<Folder>) => {
    try {
      await updateFolderAction(folderId, updates)
      await loadFolders()
    } catch (err) {
      console.error('Failed to update folder:', err)
      setError('Failed to update folder')
      throw err
    }
  }, [loadFolders])

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      await deleteFolderAction(folderId)
      await loadFolders()
    } catch (err) {
      console.error('Failed to delete folder:', err)
      setError('Failed to delete folder')
      throw err
    }
  }, [loadFolders])

  const addConversationToFolder = useCallback(async (folderId: string, conversationId: string) => {
    try {
      await addConversationToFolderAction(folderId, conversationId)
      await loadFolders()
    } catch (err) {
      console.error('Failed to add conversation to folder:', err)
      setError('Failed to add conversation to folder')
      throw err
    }
  }, [loadFolders])

  const removeConversationFromFolder = useCallback(async (folderId: string, conversationId: string) => {
    try {
      await removeConversationFromFolderAction(folderId, conversationId)
      await loadFolders()
    } catch (err) {
      console.error('Failed to remove conversation from folder:', err)
      setError('Failed to remove conversation from folder')
      throw err
    }
  }, [loadFolders])

  // Project management methods
  // Project management methods

  const createProject = useCallback(async (
    name: string,
    description: string,
    instructions?: string,
    attachments?: File[]
  ) => {
    try {
      // Just upload files to R2 - indexing will happen via queue
      let uploadedAttachments: any[] = []
      if (attachments && attachments.length > 0) {
        console.log('[createProject] Uploading attachments to R2:', attachments.length)
        
        uploadedAttachments = await Promise.all(attachments.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          const result = await uploadFileAction(formData)
          
          return {
            ...result,
            name: file.name,
            type: file.type,
            size: file.size
          }
        }))
      }

      // Create project (fast, no blocking)
      const project = await createProjectAction(name, description, instructions, uploadedAttachments)
      await loadProjects()
      
      // Return project immediately with uploaded files for queue processing
      return { project: project as Project, uploadedFiles: attachments || [], uploadResults: uploadedAttachments }
    } catch (err) {
      console.error('Failed to create project:', err)
      setError('Failed to create project')
      throw err
    }
  }, [loadProjects])

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    try {
      await updateProjectAction(projectId, updates)
      await loadProjects()
    } catch (err) {
      console.error('Failed to update project:', err)
      setError('Failed to update project')
      throw err
    }
  }, [loadProjects])

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      await deleteProjectAction(projectId)
      await loadProjects()
      await loadConversations()
    } catch (err) {
      console.error('Failed to delete project:', err)
      setError('Failed to delete project')
      throw err
    }
  }, [loadProjects, loadConversations])

  const branchConversation = useCallback(async (messageId: string) => {
    try {
      const newConversation = await branchConversationAction(currentConversationId!, messageId)
      await queryClient.invalidateQueries({ queryKey: ['conversations', effectiveProjectId] })
      setCurrentConversationId(newConversation.id)
      return newConversation.id
    } catch (err) {
      console.error('Failed to branch conversation:', err)
      setError('Failed to branch conversation')
      throw err
    }
  }, [currentConversationId, queryClient, effectiveProjectId])

  const getMessages = useCallback(async (conversationId: string, limit: number = 50, cursor?: string) => {
    try {
      const result = await getMessagesAction(conversationId, limit, cursor)
      return result
    } catch (err) {
      console.error('Failed to get messages:', err)
      return { messages: [], nextCursor: null }
    }
  }, [])
  
  const searchConversations = useCallback(async (query: string, limit: number = 20, offset: number = 0) => {
    try {
      return await searchConversationsAction(query, limit, offset)
    } catch (err) {
      console.error('Failed to search conversations:', err)
      return []
    }
  }, [])

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
    // Projects
    projects,
    createProject,
    updateProject,
    deleteProject,
    loadProjects,
    branchConversation,
    setConversationContext,
    clearConversationContext,
    // Pagination
    loadMoreConversations,
    hasMoreConversations: hasMore,
    isLoadingMoreConversations: isLoadingMore,
    activeProjectId,
    selectProject,
    // Agentic & Reasoning
    reasoningMode,
    toggleReasoningMode,
    statusPills,
    searchResults,
    contextCards,
    streamingMessageId,
    // Setters for external stream parsing (used by handleSaveEdit)
    setStatusPills,
    setSearchResults,
    setContextCards,
    // Credits
    userCredits,
    refetchCredits,
  }
}
