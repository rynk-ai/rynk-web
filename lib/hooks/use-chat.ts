"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  getConversations, 
  createConversation as createConversationAction, 
  deleteConversation as deleteConversationAction,
  sendMessage as sendMessageAction,
  addMessage as addMessageAction,
  updateMessage as updateMessageAction,
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
  clearConversationContext as clearConversationContextAction
} from "@/app/actions"
import { type CloudConversation as Conversation, type CloudMessage as Message, type Folder, type Project } from "@/lib/services/cloud-db"
import { getOpenRouter, type Message as ApiMessage } from "@/lib/services/openrouter"
import { searchEmbeddings } from "@/lib/utils/vector"
import {
  filesToBase64,
  fileToBase64,
  isImageFile,
  isPDFFile,
  isSupportedForMultimodal,
  pdfToBase64Images,
} from "@/lib/utils/file-converter"

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  const currentConversation = conversations.find(c => c.id === currentConversationId) || null

  const loadConversations = useCallback(async () => {
    try {
      const all = await getConversations()
      setConversations(all)
    } catch (err) {
      console.error('Failed to load conversations:', err)
      setError('Failed to load conversations')
    }
  }, [])

  // Folders and Projects are not yet migrated to actions fully in this step, keeping empty or TODO
  const loadFolders = useCallback(async () => {
    try {
      const all = await getFoldersAction()
      setFolders(all as Folder[])
    } catch (err) {
      console.error('Failed to load folders:', err)
    }
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const all = await getProjectsAction()
      setProjects(all as Project[])
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

  const selectConversation = useCallback((id: string | null) => {
    setCurrentConversationId(id)
    // No need to reload conversations on selection - data hasn't changed
  }, [])

  const generateAIResponse = useCallback(async (
    conversationId: string,
    onStreamUpdate?: (content: string) => void
  ) => {
    try {
      setIsLoading(true)
      
      // Fetch latest messages for context
      const messages = await getMessagesAction(conversationId)
      
      // Convert to OpenRouter format
      let apiMessages: ApiMessage[] = await Promise.all(messages.map(async (m) => {
        // If message has attachments (images), format as multimodal content
        if (m.attachments && m.attachments.length > 0) {
          const content: any[] = [
            { type: 'text', text: m.content }
          ];
          
          await Promise.all(m.attachments.map(async (att: any) => {
            const isImage = att.type?.startsWith('image/') || 
                           att.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            
            if (isImage && att.url) {
              try {
                const response = await fetch(att.url);
                const blob = await response.blob();
                
                const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
                
                content.push({
                  type: 'image_url',
                  image_url: {
                    url: base64
                  }
                });
              } catch (err) {
                console.error('Failed to convert image to base64 for AI:', err);
                content.push({
                  type: 'image_url',
                  image_url: {
                    url: att.url
                  }
                });
              }
            }
          }));
          
          return {
            role: m.role,
            content: content
          };
        }
        
        return {
          role: m.role,
          content: m.content
        };
      }))

      // Check for RAG context from backend
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()
      if (lastUserMessage) {
        try {
          console.log('🔍 Fetching RAG context from backend...')
          const { generateAIResponseAction } = await import('@/app/actions')
          const result = await generateAIResponseAction(
            conversationId,
            lastUserMessage.referencedConversations,
            lastUserMessage.referencedFolders
          )
          
          if (result && result.contextText) {
            apiMessages.unshift({
              role: 'system',
              content: `Here is relevant context from referenced conversations:\n\n${result.contextText}`
            })
            console.log(`✅ Added RAG context (${result.contextText.length} chars)`)
          }
        } catch (err) {
          console.error('❌ RAG context retrieval failed:', err)
        }
      }

      // Create placeholder assistant message
      const assistantMsg = await addMessageAction(conversationId, {
        role: 'assistant',
        content: '',
      })

      const openrouter = getOpenRouter()
      
      console.log('📤 Getting AI response (streaming)...')
      
      let fullResponse = "";
      let lastUpdate = 0;
      const throttleInterval = 50; // 50ms throttling

      // Use streaming API call
      for await (const chunk of openrouter.sendMessage({ messages: apiMessages })) {
        fullResponse += chunk;
        const now = Date.now();
        if (onStreamUpdate && (now - lastUpdate > throttleInterval)) {
          onStreamUpdate(fullResponse);
          lastUpdate = now;
        }
      }
      
      // Final update to ensure we have the complete message
      if (onStreamUpdate) {
        onStreamUpdate(fullResponse);
      }
      
      console.log('✅ Got full response:', fullResponse.substring(0, 100) + '...')

      // Update the assistant message with full response
      await updateMessageAction(assistantMsg.id, {
        content: fullResponse,
      })
      
      // Fetch and return updated messages
      const updatedMessages = await getMessagesAction(conversationId)
      return {
        messages: updatedMessages,
        assistantMessageId: assistantMsg.id
      }
    } catch (err) {
      console.error('Failed to generate AI response:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const generateTitle = useCallback(async (conversationId: string, messageContent: string) => {
    try {
      const openrouter = getOpenRouter()
      const title = await openrouter.sendMessageOnce({
        messages: [
          {
            role: 'system',
            content: 'Analyze this conversation and generate a concise, descriptive title (3-7 words) that captures the main topic or purpose. The title should:\n- Be specific enough to distinguish this chat from others\n- Use natural language, not formal or robotic phrasing\n- Focus on the core subject matter or task\n- Avoid generic phrases like "Help with" or "Question about"\n- Use title case\n\nExamples:\n- "Python Web Scraping Tutorial"\n- "Marketing Strategy for Tech Startup"\n- "Debugging React Component Error"\n- "Mediterranean Diet Meal Plan"'
          },
          {
            role: 'user',
            content: `Conversation:\n${messageContent}\n\nReturn only the title, nothing else.`
          }
        ]
      })

      if (title) {
        await updateConversationAction(conversationId, { title: title.trim().replace(/^["']|["']$/g, '') })
        await loadConversations()
      }
    } catch (error) {
      console.error('Failed to generate title:', error)
    }
  }, [loadConversations])

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

  const sendMessage = useCallback(async (
    content: string,
    files?: File[],
    referencedConversations?: { id: string; title: string }[],
    referencedFolders?: { id: string; name: string }[]
  ) => {
    if (!content.trim() && (!files || files.length === 0)) return

    setIsLoading(true)
    setError(null)

    let conversationId = currentConversationId

    // Only generate title if it's a new conversation or the title is still the default
    const shouldGenerateTitle = !currentConversationId || (currentConversation?.title === 'New Conversation')

    try {
      if (!conversationId) {
        const conv = await createConversationAction()
        conversationId = conv.id
        setCurrentConversationId(conv.id)
        
        // Optimistically add to list
        setConversations(prev => [...prev, conv])
        
        // If context is provided for the first message, set it as persistent context
        if ((referencedConversations && referencedConversations.length > 0) || 
            (referencedFolders && referencedFolders.length > 0)) {
          await setConversationContext(conversationId, referencedConversations, referencedFolders)
        }
      }

      // Add user message
      // Handle file uploads
      let uploadedAttachments: any[] = []
      if (files && files.length > 0) {
        uploadedAttachments = await Promise.all(files.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          return await uploadFileAction(formData)
        }))
      }
      
      const newMessage = await sendMessageAction(conversationId, {
        role: 'user',
        content,
        attachments: uploadedAttachments,
        referencedConversations,
        referencedFolders
      });

      // No need to reload conversations - conversation data hasn't changed

      // Generate Title if it's a new conversation or title is default
      if (shouldGenerateTitle) {
        generateTitle(conversationId, content)
      }

      // AI response is now handled by the caller with streaming support

      // Ensure the message includes conversationId for the caller
      return { ...newMessage, conversationId }
    } catch (err) {
      console.error('Failed to send message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }, [currentConversationId, currentConversation, generateTitle, setConversationContext])

  const togglePinConversation = useCallback(async (id: string) => {
    const conv = conversations.find(c => c.id === id)
    if (!conv) return
    
    // Optimistic update
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, isPinned: !c.isPinned } : c
    ))
    
    try {
      await updateConversationAction(id, { isPinned: !conv.isPinned })
    } catch (err) {
      console.error('Failed to toggle pin:', err)
      setError('Failed to toggle pin')
      await loadConversations() // Revert
      throw err
    }
  }, [conversations])

  const updateConversationTags = useCallback(async (id: string, tags: string[]) => {
    // Optimistic update
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, tags } : c
    ))
    
    try {
      await updateConversationAction(id, { tags })
    } catch (err) {
      console.error('Failed to update tags:', err)
      setError('Failed to update tags')
      await loadConversations() // Revert
      throw err
    }
  }, [])

  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    // Optimistic update
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, title: newTitle } : c
    ))
    
    try {
      await updateConversationAction(id, { title: newTitle })
    } catch (err) {
      console.error('Failed to rename conversation:', err)
      setError('Failed to rename conversation')
      await loadConversations() // Revert
      throw err
    }
  }, [])

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
    newAttachments?: File[],
    referencedConversations?: { id: string; title: string }[],
    referencedFolders?: { id: string; name: string }[]
  ) => {
    try {
      // Upload new attachments if any
      let uploadedAttachments: any[] | undefined;
      if (newAttachments && newAttachments.length > 0) {
        uploadedAttachments = await Promise.all(newAttachments.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })
          if (!response.ok) throw new Error('Failed to upload file')
          const data = await response.json() as { url: string }
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            url: data.url
          }
        }))
      }

      // Call server action to create new version
      await createMessageVersionAction(
        currentConversationId!,
        messageId,
        newContent,
        uploadedAttachments,
        referencedConversations,
        referencedFolders
      )

      // Reload conversations to update the path and trigger message reload in UI
      await loadConversations()
      
    } catch (error) {
      console.error('Failed to edit message:', error)
      throw error // Re-throw so caller knows it failed
    }
  }, [currentConversationId, loadConversations])


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
      await loadConversations()
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
    generateAIResponse,
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
  }
}
