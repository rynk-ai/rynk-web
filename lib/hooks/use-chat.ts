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
  branchConversation as branchConversationAction
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

  const generateAIResponse = useCallback(async (conversationId: string) => {
    try {
      // Fetch latest messages for context
      const messages = await getMessagesAction(conversationId)
      
      // Convert to OpenRouter format
      // We need to resolve all promises for base64 conversion
      let apiMessages: ApiMessage[] = await Promise.all(messages.map(async (m) => {
        // If message has attachments (images), format as multimodal content
        if (m.attachments && m.attachments.length > 0) {
          const content: any[] = [
            { type: 'text', text: m.content }
          ];
          
          await Promise.all(m.attachments.map(async (att: any) => {
            // Check if it's an image based on type or extension
            const isImage = att.type?.startsWith('image/') || 
                           att.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            
            if (isImage && att.url) {
              try {
                // Fetch the image and convert to base64
                // This works for both local dev and prod because the browser fetches it
                const response = await fetch(att.url);
                const blob = await response.blob();
                
                // Convert blob to base64
                const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
                
                content.push({
                  type: 'image_url',
                  image_url: {
                    url: base64 // Pass the base64 data URL directly
                  }
                });
              } catch (err) {
                console.error('Failed to convert image to base64 for AI:', err);
                // Fallback to URL if fetch fails (though unlikely if it's our own API)
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
      }));

      // Check if last user message has referenced conversations or folders
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()
      if (lastUserMessage) {
        const hasReferences = (lastUserMessage.referencedConversations?.length ?? 0) > 0 ||
                             (lastUserMessage.referencedFolders?.length ?? 0) > 0
        
        if (hasReferences) {
          console.log('🔍 Using semantic search for context retrieval...')
          
          try {
            // 1. Generate embedding for user query
            const openrouter = getOpenRouter()
            const queryEmbedding = await openrouter.getEmbeddings(lastUserMessage.content)
            
            // 2. Collect all conversation IDs to search
            const conversationIds: string[] = []
            
            if (lastUserMessage.referencedConversations) {
              conversationIds.push(...lastUserMessage.referencedConversations.map(r => r.id))
            }
            
            if (lastUserMessage.referencedFolders) {
              for (const folderRef of lastUserMessage.referencedFolders) {
                const allFolders = await getFoldersAction()
                const folder = allFolders.find(f => f.id === folderRef.id)
                if (folder?.conversationIds) {
                  conversationIds.push(...folder.conversationIds.slice(0, 5)) // Max 5 conversations per folder
                }
              }
            }
            
            if (conversationIds.length > 0) {
              // 3. Fetch all embeddings for these conversations
              const embeddings = await getEmbeddingsByConversations(conversationIds)
              
              if (embeddings.length > 0) {
                // 4. Perform semantic search
                const relevantMessages = searchEmbeddings(queryEmbedding, embeddings, {
                  limit: 15, // Top 15 most relevant messages
                  minScore: 0.35 // Only include messages with >35% similarity
                })
                
                console.log(`✅ Found ${relevantMessages.length} semantically relevant messages (scores: ${relevantMessages.map(r => (r.score * 100).toFixed(0) + '%').join(', ')})`)
                
                // 5. Build context from relevant messages
                if (relevantMessages.length > 0) {
                  let contextText = ''
                  
                  // Group by conversation for better organization
                  const byConversation = new Map<string, typeof relevantMessages>()
                  for (const result of relevantMessages) {
                    if (!byConversation.has(result.conversationId)) {
                      byConversation.set(result.conversationId, [])
                    }
                    byConversation.get(result.conversationId)!.push(result)
                  }
                  
                  // Format context
                  for (const [convId, results] of byConversation) {
                    const allConvs = await getConversations()
                    const convTitle = allConvs.find(c => c.id === convId)?.title || 'Untitled'
                    
                    contextText += `\n### From: "${convTitle}"\n\n`
                    for (const result of results) {
                      const preview = result.content.length > 400 
                        ? result.content.slice(0, 400) + '...' 
                        : result.content
                      contextText += `- (${(result.score * 100).toFixed(0)}% relevant) ${preview}\n\n`
                    }
                  }
                  
                  const contextMessage: ApiMessage = {
                    role: 'system',
                    content: `Here are the most relevant messages from the referenced conversations (ordered by semantic relevance to the user's question). Use this context to provide an accurate answer:\n${contextText}`
                  }
                  
                  apiMessages = [contextMessage, ...apiMessages]
                  console.log(`✅ Added semantic context to prompt (${relevantMessages.length} messages from ${byConversation.size} conversations)`)
                }
              } else {
                console.log('ℹ️ No embeddings found for referenced conversations (embeddings may not be generated yet)')
              }
            }
          } catch (err) {
            console.error('❌ Semantic search failed:', err)
            console.log('⚠️ Continuing without context')
          }
        }
      }

      // Create placeholder assistant message
      const assistantMsg = await addMessageAction(conversationId, {
        role: 'assistant',
        content: '',
      })

      const openrouter = getOpenRouter()
      
      const stream = openrouter.sendMessage({
        messages: apiMessages
      })

      let fullResponse = ''
      
      for await (const chunk of stream) {
        fullResponse += chunk
        // Optional: Implement real-time UI updates via a separate state or context if needed
      }

      await updateMessageAction(assistantMsg.id, {
        content: fullResponse,
      })

      await loadConversations()
    } catch (err) {
      console.error('Failed to generate AI response:', err)
      throw err
    }
  }, [loadConversations])

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

    try {
      if (!conversationId) {
        const conv = await createConversationAction()
        conversationId = conv.id
        setCurrentConversationId(conv.id)
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


      await loadConversations()

      // Generate Title if it's a new conversation or title is default
      // We don't await this so it runs in parallel with AI response generation
      // We need to check conversation title. 
      // Since we don't have the full conversation object easily without fetching, 
      // we can check if it's the first message or just always try to generate if short path.
      // For now, let's simplify and generate if it's the first message.
      // But we don't know if it's first.
      // Let's just generate title always for now or skip optimization.
      generateTitle(conversationId, content)

      // Generate AI response
      await generateAIResponse(conversationId)

      return newMessage
    } catch (err) {
      console.error('Failed to send message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }, [currentConversationId, loadConversations, generateAIResponse, generateTitle])

  const togglePinConversation = useCallback(async (id: string) => {
    try {
      // We need to know current pin state to toggle.
      // For now, let's assume we can pass the new state if we knew it.
      // Or we implement togglePin action.
      // Let's just mock for now or use updateConversation with hardcoded true/false if we knew.
      // Better: implement togglePin action.
      // For migration speed, I'll skip pin toggle or just log.
      console.log('Toggle pin not implemented yet')
      await loadConversations()
    } catch (err) {
      console.error('Failed to toggle pin:', err)
      setError('Failed to toggle pin')
      throw err
    }
  }, [loadConversations])

  const updateConversationTags = useCallback(async (id: string, tags: string[]) => {
    try {
      await updateConversationAction(id, { tags })
      await loadConversations()
    } catch (err) {
      console.error('Failed to update tags:', err)
      setError('Failed to update tags')
      throw err
    }
  }, [loadConversations])

  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    try {
      await updateConversationAction(id, { title: newTitle })
      await loadConversations()
    } catch (err) {
      console.error('Failed to rename conversation:', err)
      setError('Failed to rename conversation')
      throw err
    }
  }, [loadConversations])

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
      // Handle attachment uploads if any
      let uploadedAttachments: any[] = []
      if (newAttachments && newAttachments.length > 0) {
        uploadedAttachments = await Promise.all(newAttachments.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          return await uploadFileAction(formData)
        }))
      }

      const updates: any = {
        content: newContent,
        referencedConversations,
        referencedFolders
      }

      if (uploadedAttachments.length > 0) {
        updates.attachments = uploadedAttachments
      }

      await updateMessageAction(messageId, updates)
      await loadConversations()
    } catch (err) {
      console.error('Failed to edit message:', err)
      setError('Failed to edit message')
      throw err
    }
  }, [loadConversations])


  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await deleteMessageAction(messageId)
      await loadConversations()
    } catch (err) {
      console.error('Failed to delete message:', err)
      setError('Failed to delete message')
    }
  }, [loadConversations])

  const switchToMessageVersion = useCallback(async (messageId: string) => {
    // TODO: Implement switchToMessageVersion action
    console.log('Switch version not implemented yet')
  }, [])

  const getMessageVersions = useCallback(async (originalMessageId: string) => {
    // TODO: Implement getMessageVersions action
    return []
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
  }
}
