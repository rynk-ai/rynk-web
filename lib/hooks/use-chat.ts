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
  getEmbeddingsByConversations,
  branchConversation as branchConversationAction,
  createMessageVersion as createMessageVersionAction,
  getMessageVersions as getMessageVersionsAction,
  switchToMessageVersion as switchToMessageVersionAction,
  addEmbedding,
  setConversationContext as setConversationContextAction,
  clearConversationContext as clearConversationContextAction,
  generateTitleAction
} from "@/app/actions"
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
import { 
  createAttachmentMetadataAction, 
  processBatchForRAGAction,
  completeRAGProcessingAction
} from '@/lib/actions/rag-actions'
import { chunkText } from '@/lib/utils/chunking'

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Use ref to track last fetch time for cache invalidation
  const conversationsLastFetchRef = useRef<number>(0)
  const foldersLastFetchRef = useRef<number>(0)
  const projectsLastFetchRef = useRef<number>(0)

  // Memoize currentConversation to prevent unnecessary recalculations
  const currentConversation = useMemo(
    () => conversations.find(c => c.id === currentConversationId) || null,
    [conversations, currentConversationId]
  )

  const loadConversations = useCallback(async (force = false) => {
    // Cache invalidation: Skip if fetched recently (within 3 seconds) unless forced
    const lastFetch = conversationsLastFetchRef.current
    const timeSinceLastFetch = Date.now() - lastFetch
    if (!force && lastFetch && timeSinceLastFetch < 3000) {
      console.log('[useChat] Skipping loadConversations, last fetch was', timeSinceLastFetch, 'ms ago')
      return
    }
    
    try {
      const limit = 20
      const all = await getConversations(limit, 0)
      setConversations(all)
      setPage(1)
      setHasMore(all.length === limit)
      conversationsLastFetchRef.current = Date.now()
    } catch (err) {
      console.error('Failed to load conversations:', err)
      setError('Failed to load conversations')
    }
  }, [])

  const loadMoreConversations = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const limit = 20
      const offset = page * limit
      const nextBatch = await getConversations(limit, offset)
      
      if (nextBatch.length > 0) {
        setConversations(prev => [...prev, ...nextBatch])
        setPage(prev => prev + 1)
        setHasMore(nextBatch.length === limit)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load more conversations:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [page, hasMore, isLoadingMore])

  // Folders and Projects are not yet migrated to actions fully in this step, keeping empty or TODO
  const loadFolders = useCallback(async (force = false) => {
    const lastFetch = foldersLastFetchRef.current
    const timeSinceLastFetch = Date.now() - lastFetch
    if (!force && lastFetch && timeSinceLastFetch < 3000) {
      return
    }
    
    try {
      const all = await getFoldersAction()
      setFolders(all as Folder[])
      foldersLastFetchRef.current = Date.now()
    } catch (err) {
      console.error('Failed to load folders:', err)
    }
  }, [])

  const loadProjects = useCallback(async (force = false) => {
    const lastFetch = projectsLastFetchRef.current
    const timeSinceLastFetch = Date.now() - lastFetch
    if (!force && lastFetch && timeSinceLastFetch < 3000) {
      return
    }
    
    try {
      const all = await getProjectsAction()
      setProjects(all as Project[])
      projectsLastFetchRef.current = Date.now()
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }, [])

  useEffect(() => {
    loadConversations()
    loadFolders()
    loadProjects()
  }, [loadConversations, loadFolders, loadProjects])

  const createConversation = useCallback(async (projectId?: string) => {
    try {
      const conversation = await createConversationAction(projectId)
      await loadConversations()
      setCurrentConversationId(conversation.id)
      return conversation.id
    } catch (err) {
      console.error('Failed to create conversation:', err)
      setError('Failed to create conversation')
      throw err
    }
  }, [loadConversations])

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await deleteConversationAction(id)
      await loadConversations()
      if (currentConversationId === id) {
        setCurrentConversationId(null)
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
      setError('Failed to delete conversation')
      throw err
    }
  }, [currentConversationId, loadConversations])

  const selectConversation = useCallback((id: string | null, conversation?: Conversation) => {
    if (id && conversation) {
      setConversations(prev => {
        if (prev.find(c => c.id === id)) return prev
        // Add to the beginning of the list as it's now the active one
        return [conversation, ...prev]
      })
    }
    setCurrentConversationId(id)
    // No need to reload conversations on selection - data hasn't changed
  }, [])

  const selectProject = useCallback((id: string | null) => {
    setActiveProjectId(id)
  }, [])



  const generateTitle = useCallback(async (conversationId: string, messageContent: string) => {
    try {
      const title = await generateTitleAction(conversationId, messageContent)
      if (title) {
        // Optimistically update the conversation title without refetching entire list
        setConversations(prev => prev.map(c => 
          c.id === conversationId ? { ...c, title } : c
        ))
      }
    } catch (error) {
      console.error('Failed to generate title:', error)
    }
  }, [])

  const setConversationContext = useCallback(async (
    conversationId: string,
    referencedConversations?: { id: string; title: string }[],
    referencedFolders?: { id: string; name: string }[]
  ) => {
    // Optimistic update - instant UI feedback
    setConversations(prev => prev.map(c => 
      c.id === conversationId
        ? { 
            ...c, 
            activeReferencedConversations: referencedConversations || [],
            activeReferencedFolders: referencedFolders || []
          }
        : c
    ))
    
    // Backend sync (async)
    try {
      await setConversationContextAction(conversationId, referencedConversations, referencedFolders)
    } catch (err) {
      console.error('Failed to set context:', err)
      // Revert on error
      await loadConversations()
    }
  }, [])

  const clearConversationContext = useCallback(async (conversationId: string) => {
    // Optimistic update
    setConversations(prev => prev.map(c =>
      c.id === conversationId
        ? { ...c, activeReferencedConversations: [], activeReferencedFolders: [] }
        : c
    ))
    
    // Backend sync
    try {
      await clearConversationContextAction(conversationId)
    } catch (err) {
      console.error('Failed to clear context:', err)
      await loadConversations() // Revert
    }
  }, [])

  /**
   * Process file attachments, handling PDFs specially:
   * 1. Try to extract text from PDFs
   * 2. If text is insufficient, convert pages to images
   * 3. Upload to R2 and return metadata with processed data
   */
  async function processAttachments(
    files: File[]
  ): Promise<any[]> {
    const processed: any[] = []

    // Maximum text content size (to prevent oversized requests)
    const MAX_TEXT_CONTENT_SIZE = 30000 // ~30KB to leave room for other request data
    const RAG_THRESHOLD = 10000 // Use RAG for files larger than 10KB

    for (const file of files) {
      try {
        // Process PDFs
        if (isPDFFile(file)) {
          console.log('[processAttachments] Processing PDF:', file.name)
          
          // Step 1: Upload to R2 first (we need the URL for metadata)
          const formData = new FormData()
          formData.append('file', file)
          const uploaded = await uploadFileAction(formData)
          
          // Step 2: Try text extraction
          let extractedContent: string | null = null
          let fallbackImages: string[] | null = null
          let useRAG = false
          let attachmentId: string | undefined
          let chunkCount: number | undefined
          
          try {
            extractedContent = await extractTextFromPDF(file)
            
            // Check if we got meaningful text (> 50 chars)
            if (extractedContent && extractedContent.trim().length > 50) {
              console.log('[processAttachments] Text extracted successfully, length:', extractedContent.length)
              
              // Check if we should use RAG
              if (extractedContent.length > RAG_THRESHOLD) {
                console.log('[processAttachments] Large PDF detected, initiating RAG processing')
                try {
                  // Create metadata
                  attachmentId = await createAttachmentMetadataAction({
                    fileName: uploaded.name,
                    fileType: uploaded.type,
                    fileSize: uploaded.size,
                    r2Key: uploaded.url,
                    messageId: null
                  })
                  
                  // Start RAG processing
                  toast.info(`Indexing ${file.name}...`)
                  
                  // 1. Chunk text locally
                  const chunks = chunkText(extractedContent, { chunkSize: 4000, overlap: 400 })
                  console.log(`[processAttachments] Chunked locally: ${chunks.length} chunks`)
                  
                  // 2. Upload in batches
                  const BATCH_SIZE = 5
                  let processedCount = 0
                  
                  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
                    const batch = chunks.slice(i, i + BATCH_SIZE)
                    toast.loading(`Indexing ${file.name} (${Math.round((i / chunks.length) * 100)}%)`, { duration: Infinity })
                    
                    await processBatchForRAGAction(
                      attachmentId, 
                      batch, 
                      i, 
                      {
                        fileName: uploaded.name,
                        fileType: uploaded.type,
                        fileSize: uploaded.size
                      }
                    )
                    processedCount += batch.length
                  }
                  
                  // 3. Mark as complete
                  await completeRAGProcessingAction(attachmentId, chunks.length)
                  
                  useRAG = true
                  chunkCount = chunks.length
                  toast.dismiss()
                  toast.success(`${file.name} indexed (${chunks.length} chunks)`)
                  
                } catch (ragError) {
                  console.error('[processAttachments] RAG processing failed:', ragError)
                  toast.dismiss()
                  toast.error(`Failed to process ${file.name}. Please try again.`)
                  // Re-throw to prevent message from being sent
                  throw new Error(`RAG processing failed for ${file.name}: ${ragError instanceof Error ? ragError.message : 'Unknown error'}`)
                }
              }
              
              // If not using RAG (or RAG failed), apply truncation if needed
              if (!useRAG && extractedContent.length > MAX_TEXT_CONTENT_SIZE) {
                console.warn('[processAttachments] PDF text too large, truncating:', {
                  original: extractedContent.length,
                  truncated: MAX_TEXT_CONTENT_SIZE
                })
                extractedContent = extractedContent.substring(0, MAX_TEXT_CONTENT_SIZE) + 
                  '\n\n...[Content truncated due to size. Only first ~30KB shown]'
                toast.warning(`${file.name} is very large. Only the first ~30KB of text will be sent to AI.`)
              }
            } else {
              console.log('[processAttachments] Insufficient text extracted, falling back to images')
              extractedContent = null
            }
          } catch (error) {
            console.error('[processAttachments] Text extraction failed:', error)
            extractedContent = null
          }
          
          // Step 3: Fallback to images if no text (and not using RAG)
          if (!extractedContent && !useRAG) {
            try {
              fallbackImages = await pdfToBase64Images(file, {
                maxPages: 10,
                scale: 1.0,
                quality: 0.6
              })
              
              console.log('[processAttachments] PDF converted to', fallbackImages.length, 'images')
              
              if (fallbackImages.length === 10) {
                toast.warning(`${file.name} has more than 10 pages. Only the first 10 pages will be sent to AI.`)
              }
            } catch (error) {
              console.error('[processAttachments] Image conversion failed:', error)
              toast.error(`Failed to process ${file.name}`)
            }
          }
          
          // Add processed data to attachment metadata
          processed.push({
            ...uploaded,
            extractedContent: useRAG ? undefined : (extractedContent || undefined),
            fallbackImages: fallbackImages || undefined,
            useRAG,
            attachmentId,
            chunkCount
          })
        }
        // Regular file upload (images, etc.)
        else {
          const formData = new FormData()
          formData.append('file', file)
          const uploaded = await uploadFileAction(formData)
          processed.push(uploaded)
        }
      } catch (error) {
        console.error('[processAttachments] Failed to process file:', file.name, error)
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    return processed
  }

  const sendMessage = useCallback(async (
    content: string,
    files: File[] = [],
    referencedConversations: { id: string; title: string }[] = [],
    referencedFolders: { id: string; name: string }[] = []
  ): Promise<{
    streamReader: ReadableStreamDefaultReader<Uint8Array>;
    conversationId: string;
    userMessageId: string | null;
    assistantMessageId: string | null;
  } | null> => {
    if (!content.trim() && (!files || files.length === 0)) return null

    setIsLoading(true)
    setError(null)

    console.log('[sendMessage] activeProjectId:', activeProjectId)

    let conversationId = currentConversationId

    // Only generate title if it's a new conversation or the title is still the default
    const shouldGenerateTitle = !currentConversationId || (currentConversation?.title === 'New Conversation')

    try {
      if (!conversationId) {
        const conv = await createConversationAction(activeProjectId || undefined)
        conversationId = conv.id
        setCurrentConversationId(conv.id)
        
        // Optimistically add to top of list (newest first)
        setConversations(prev => [conv, ...prev])
        
        // If context is provided for the first message, set it as persistent context
        if ((referencedConversations && referencedConversations.length > 0) || 
            (referencedFolders && referencedFolders.length > 0)) {
          await setConversationContext(conversationId, referencedConversations, referencedFolders)
        }
      }

      // Handle file uploads with PDF processing
      let uploadedAttachments: any[] = []
      if (files && files.length > 0) {
        uploadedAttachments = await processAttachments(files)
      }
      
      // Call the unified API
      // Note: Server-side ChatService creates REAL user and assistant messages immediately
      // So we don't need client-side optimistic messages
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: content,
          attachments: uploadedAttachments,
          referencedConversations,
          referencedFolders
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      if (!response.body) throw new Error('No response body')

      // Extract message IDs from response headers
      const userMessageId = response.headers.get('X-User-Message-Id')
      const assistantMessageId = response.headers.get('X-Assistant-Message-Id')

      // Handle Streaming
      const reader = response.body.getReader()
      
      // Generate title if needed (fire and forget for performance)
      if (shouldGenerateTitle) {
        generateTitle(conversationId, content)
      }
      
      // Return stream reader, conversationId, and message IDs
      return {
        streamReader: reader,
        conversationId,
        userMessageId,
        assistantMessageId
      }

    } catch (err) {
      console.error('Failed to send message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentConversationId, currentConversation, generateTitle, setConversationContext, activeProjectId])

  const togglePinConversation = useCallback(async (id: string) => {
    const conv = conversations.find(c => c.id === id)
    if (!conv) return
    
    // Optimistic update - update state immediately for instant UI feedback
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, isPinned: !c.isPinned } : c
    ))
    
    try {
      await updateConversationAction(id, { isPinned: !conv.isPinned })
      // No loadConversations() - optimistic update is sufficient!
    } catch (err) {
      console.error('Failed to toggle pin:', err)
      setError('Failed to toggle pin')
      // Revert optimistic update on error
      setConversations(prev => prev.map(c =>
        c.id === id ? { ...c, isPinned: conv.isPinned } : c
      ))
      throw err
    }
  }, [conversations])

  const updateConversationTags = useCallback(async (id: string, tags: string[]) => {
    // Store original tags for revert
    const originalTags = conversations.find(c => c.id === id)?.tags || []
    
    // Optimistic update
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, tags } : c
    ))
    
    try {
      await updateConversationAction(id, { tags })
      // No loadConversations() - optimistic update is sufficient!
    } catch (err) {
      console.error('Failed to update tags:', err)
      setError('Failed to update tags')
      // Revert on error
      setConversations(prev => prev.map(c =>
        c.id === id ? { ...c, tags: originalTags } : c
      ))
      throw err
    }
  }, [conversations])

  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    // Store original title for revert
    const originalTitle = conversations.find(c => c.id === id)?.title || ''
    
    // Optimistic update
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, title: newTitle } : c
    ))
    
    try {
      await updateConversationAction(id, { title: newTitle })
      // No loadConversations() - optimistic update is sufficient!
    } catch (err) {
      console.error('Failed to rename conversation:', err)
      setError('Failed to rename conversation')
      // Revert on error
      setConversations(prev => prev.map(c =>
        c.id === id ? { ...c, title: originalTitle } : c
      ))
      throw err
    }
  }, [conversations])

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
      await deleteMessageAction(currentConversationId, messageId)
      await loadConversations()
    } catch (err) {
      console.error('Failed to delete message:', err)
      setError('Failed to delete message')
    }
  }, [currentConversationId, loadConversations])

  const switchToMessageVersion = useCallback(async (messageId: string) => {
    if (!currentConversationId) return
    try {
      await switchToMessageVersionAction(currentConversationId, messageId)
      await loadConversations(true)
    } catch (error) {
      console.error('Failed to switch message version:', error)
    }
  }, [currentConversationId, loadConversations])

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
      // Handle attachment uploads
      let uploadedAttachments: any[] = []
      if (attachments && attachments.length > 0) {
        uploadedAttachments = await Promise.all(attachments.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          return await uploadFileAction(formData)
        }))
      }

      const project = await createProjectAction(name, description, instructions, uploadedAttachments)
      await loadProjects()
      return project as Project
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
      await loadConversations()
      setCurrentConversationId(newConversation.id)
      return newConversation.id
    } catch (err) {
      console.error('Failed to branch conversation:', err)
      setError('Failed to branch conversation')
      throw err
    }
  }, [currentConversationId, loadConversations])

  const getMessages = useCallback(async (conversationId: string) => {
    try {
      const messages = await getMessagesAction(conversationId)
      return messages as Message[]
    } catch (err) {
      console.error('Failed to get messages:', err)
      return []
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
    error,
    createConversation,
    deleteConversation,
    selectConversation,
    searchConversations,
    sendMessage,
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
    selectProject
  }
}
