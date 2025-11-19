"use client"

import { useState, useEffect, useCallback } from "react"
import { dbService, type Conversation, type Message, type Folder, type Project } from "@/lib/services/indexeddb"
import { getOpenRouter, type Message as ApiMessage } from "@/lib/services/openrouter"
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
      const all = await dbService.getAllConversations()
      setConversations(all.reverse())
    } catch (err) {
      console.error('Failed to load conversations:', err)
      setError('Failed to load conversations')
    }
  }, [])

  const loadFolders = useCallback(async () => {
    try {
      const all = await dbService.getAllFolders()
      setFolders(all.reverse())
    } catch (err) {
      console.error('Failed to load folders:', err)
      setError('Failed to load folders')
    }
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const all = await dbService.getAllProjects()
      setProjects(all.reverse())
    } catch (err) {
      console.error('Failed to load projects:', err)
      setError('Failed to load projects')
    }
  }, [])

  useEffect(() => {
    loadConversations()
    loadFolders()
    loadProjects()
  }, [loadConversations, loadFolders, loadProjects])

  const createConversation = useCallback(async (projectId?: string) => {
    try {
      const conversation = await dbService.createConversation(undefined, projectId)
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
      await dbService.deleteConversation(id)
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
    if (id) {
      loadConversations()
    }
  }, [loadConversations])

  const generateAIResponse = useCallback(async (conversationId: string) => {
    try {
      // Get conversation messages from the path
      const messages = await dbService.getConversationMessages(conversationId)
      if (!messages) {
        throw new Error('Messages not found')
      }

      const conversation = await dbService.getConversation(conversationId)
      const project = conversation?.projectId ? await dbService.getProject(conversation.projectId) : null

      // Format messages for API - convert files to base64 for multimodal models
      const apiMessages: ApiMessage[] = []
      for (const msg of messages) {
        // Inject context if referenced conversations or groups exist
        if (msg.role === 'user' && ((msg.referencedConversations && msg.referencedConversations.length > 0) || (msg.referencedFolders && msg.referencedFolders.length > 0))) {
          const contextParts: string[] = [];

          // Handle referenced conversations
          if (msg.referencedConversations && msg.referencedConversations.length > 0) {
            const conversationContexts = await Promise.all(
              msg.referencedConversations.map(async (c) => {
                const refMessages = await dbService.getConversationMessages(c.id);
                const formatted = refMessages
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .map(m => `${m.role.toUpperCase()}: ${m.content}`)
                  .join("\n");
                return `[Reference Conversation: ${c.title}]\n${formatted}`;
              })
            );
            contextParts.push(...conversationContexts);
          }

          // Handle referenced folders
          if (msg.referencedFolders && msg.referencedFolders.length > 0) {
            const folderContexts = await Promise.all(
              msg.referencedFolders.map(async (f) => {
                const folders = await dbService.getAllFolders();
                const folder = folders.find(fol => fol.id === f.id);
                
                if (!folder) return `[Reference Folder: ${f.name} (Not Found)]`;

                const folderConversations = await Promise.all(
                  folder.conversationIds.map(async (cid) => {
                    const conv = await dbService.getConversation(cid);
                    const msgs = await dbService.getConversationMessages(cid);
                    const formatted = msgs
                      .sort((a, b) => a.timestamp - b.timestamp)
                      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
                      .join("\n");
                    return `Conversation: ${conv?.title || 'Untitled'}\n${formatted}`;
                  })
                );
                
                return `[Reference Folder: ${f.name}]\n${folderConversations.join("\n\n---\n\n")}`;
              })
            );
            contextParts.push(...folderContexts);
          }

          const contextContent = contextParts.join("\n\n---\n\n");
          
          // Add context as a SYSTEM message before the user message
          apiMessages.push({
            role: 'system',
            content: `Context from previous conversations/folders:\n${contextContent}`
          });
        }

        if (msg.role === 'assistant' || msg.role === 'system') {
          // Assistant and system messages are plain text
          apiMessages.push({
            role: msg.role,
            content: msg.content,
          })
        } else if (msg.role === 'user') {
          // User messages may have attachments
          if (msg.attachments && msg.attachments.length > 0) {
            // Create multimodal message content
            const multimodalContent: any[] = []

            // Add text if present
            if (msg.content.trim()) {
              multimodalContent.push({
                type: 'text' as const,
                text: msg.content,
              })
            }

            // Process each attachment
            for (const file of msg.attachments) {
              if (isImageFile(file)) {
                // Direct image - convert to base64
                const base64 = await fileToBase64(file)
                multimodalContent.push({
                  type: 'image_url' as const,
                  image_url: {
                    url: base64,
                    detail: 'auto',
                  },
                })
              } else if (isPDFFile(file)) {
                // PDF - convert each page to image
                try {
                  const pdfImages = await pdfToBase64Images(file)
                  for (const imageBase64 of pdfImages) {
                    multimodalContent.push({
                      type: 'image_url' as const,
                      image_url: {
                        url: imageBase64,
                        detail: 'auto',
                      },
                    })
                  }
                } catch (error) {
                  console.error('Failed to convert PDF to images:', error)
                  // Continue processing other files
                }
              }
              // Other file types are ignored for AI processing
            }

            apiMessages.push({
              role: 'user',
              content: multimodalContent.length === 1 && multimodalContent[0].type === 'text'
                ? multimodalContent[0].text // If only text, use simple string format
                : multimodalContent,
            })
          } else {
            // No attachments, plain text
            apiMessages.push({
              role: 'user',
              content: msg.content,
            })
          }
        }
      }

      // Add system message if this is the first interaction
      if (apiMessages.length === 1) {
        apiMessages.unshift({
          role: 'system',
          content: 'You are a helpful AI assistant. Provide clear and concise responses.',
        })
      }

      // Inject Project Context
      if (project) {
        const projectContextParts = []
        if (project.description) projectContextParts.push(`Project Description: ${project.description}`)
        if (project.instructions) projectContextParts.push(`Project Instructions: ${project.instructions}`)
        
        if (projectContextParts.length > 0) {
          apiMessages.unshift({
            role: 'system',
            content: `Current Project Context (${project.name}):\n${projectContextParts.join('\n\n')}`
          })
        }

        // Handle project attachments
        if (project.attachments && project.attachments.length > 0) {
           const attachmentContent: any[] = []
           attachmentContent.push({
             type: 'text',
             text: `Project Attachments for ${project.name}:`
           })

           for (const file of project.attachments) {
              if (isImageFile(file)) {
                const base64 = await fileToBase64(file)
                attachmentContent.push({
                  type: 'image_url',
                  image_url: { url: base64, detail: 'auto' }
                })
              } else if (isPDFFile(file)) {
                 try {
                   const pdfImages = await pdfToBase64Images(file)
                   for (const imageBase64 of pdfImages) {
                     attachmentContent.push({
                       type: 'image_url',
                       image_url: { url: imageBase64, detail: 'auto' }
                     })
                   }
                 } catch (e) {
                   console.error('Failed to process PDF attachment in project:', e)
                 }
              } else {
                 // For text files, we could try to read them, but for now let's skip or just mention them
                 // Ideally we should read text files too.
                 // Let's try to read text content if possible, or just leave it for now as the file-converter might not support text reading directly here easily without more utils.
                 // Assuming file-converter handles images/pdfs mostly.
              }
           }
           
           if (attachmentContent.length > 1) {
             // Insert after system messages but before user messages
             // Find index of first user message
             const firstUserIndex = apiMessages.findIndex(m => m.role === 'user')
             if (firstUserIndex !== -1) {
               apiMessages.splice(firstUserIndex, 0, {
                 role: 'user',
                 content: attachmentContent
               })
             } else {
                apiMessages.push({
                  role: 'user',
                  content: attachmentContent
                })
             }
           }
        }
      }

      const openrouter = getOpenRouter()

      // Stream the response
      const stream = openrouter.sendMessage({
        messages: apiMessages,
      })

      let assistantMessageId: string | null = null
      let fullResponse = ''

      // Create assistant message entry
      const assistantMsg = await dbService.addMessage(conversationId, {
        role: 'assistant',
        content: '',
      })
      assistantMessageId = assistantMsg.id

      // Process stream
      for await (const chunk of stream) {
        fullResponse += chunk

        if (assistantMessageId) {
          try {
            // Update the message with current response incrementally
            await dbService.updateMessage(assistantMessageId, {
              content: fullResponse,
            })
          } catch (err) {
            console.error('❌ Failed to update assistant message:', {
              conversationId,
              assistantMessageId,
              error: err
            })
            // Don't throw - continue streaming
          }
        } else {
          console.warn('⚠️ assistantMessageId is null/undefined during streaming')
        }
      }

      console.log('✅ AI response complete, reloading conversations...')
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
        await dbService.updateConversation(conversationId, { title: title.trim().replace(/^["']|["']$/g, '') })
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
        conversationId = await createConversation()
      }

      // Add user message
      const newMessage = await dbService.addMessage(conversationId, {
        role: 'user',
        content,
        attachments: files,
        referencedConversations,
        referencedFolders
      })

      await loadConversations()

      // Generate Title if it's a new conversation or title is default
      // We don't await this so it runs in parallel with AI response generation
      const conversation = await dbService.getConversation(conversationId)
      if (conversation && (conversation.title === 'New Conversation' || conversation.path.length <= 1)) {
         generateTitle(conversationId, content)
      }

      // Generate AI response
      await generateAIResponse(conversationId)

      return newMessage
    } catch (err) {
      console.error('Failed to send message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }, [currentConversationId, createConversation, loadConversations, generateAIResponse])

  const togglePinConversation = useCallback(async (id: string) => {
    try {
      await dbService.togglePinConversation(id)
      await loadConversations()
    } catch (err) {
      console.error('Failed to toggle pin:', err)
      setError('Failed to toggle pin')
      throw err
    }
  }, [loadConversations])

  const updateConversationTags = useCallback(async (id: string, tags: string[]) => {
    try {
      await dbService.updateConversationTags(id, tags)
      await loadConversations()
    } catch (err) {
      console.error('Failed to update tags:', err)
      setError('Failed to update tags')
      throw err
    }
  }, [loadConversations])

  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    try {
      await dbService.updateConversation(id, { title: newTitle })
      await loadConversations()
    } catch (err) {
      console.error('Failed to rename conversation:', err)
      setError('Failed to rename conversation')
      throw err
    }
  }, [loadConversations])

  const getAllTags = useCallback(async (): Promise<string[]> => {
    try {
      return await dbService.getAllTags()
    } catch (err) {
      console.error('Failed to get tags:', err)
      setError('Failed to get tags')
      throw err
    }
  }, [])

  const editMessage = useCallback(async (
    messageId: string,
    newContent: string,
    newAttachments?: File[],
    referencedConversations?: { id: string; title: string }[],
    referencedFolders?: { id: string; name: string }[]
  ) => {
    if (!currentConversationId) {
      throw new Error('No current conversation')
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('✏️ EDITING MESSAGE (with versioning):', {
        messageId,
        currentConversationId,
        newContent: newContent.substring(0, 50)
      })

      // Get conversation and messages to find the position
      const conversation = await dbService.getConversation(currentConversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      const messageIndex = conversation.path.indexOf(messageId)
      if (messageIndex === -1) {
        throw new Error('Message not found in conversation path')
      }

      // Create a new version of the message instead of editing in place
      const { newMessage } = await dbService.createMessageVersion(
        currentConversationId,
        messageId,
        newContent,
        newAttachments,
        referencedConversations,
        referencedFolders
      )

      console.log('✅ New version created:', newMessage.id)

      await loadConversations()
      console.log('✅ Conversations reloaded')

      // Generate a new AI response for the edited message
      console.log('🤖 Generating fresh AI response for edited message...')
      await generateAIResponse(currentConversationId)
      console.log('✅ Fresh AI response generated')

    } catch (err) {
      console.error('Failed to edit message:', err)
      setError(err instanceof Error ? err.message : 'Failed to edit message')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentConversationId, generateAIResponse, loadConversations])


  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentConversationId) {
      throw new Error('No current conversation')
    }

    try {
      setIsLoading(true)
      setError(null)

      await dbService.deleteMessage(messageId)
      await loadConversations()

    } catch (err) {
      console.error('Failed to delete message:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete message')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentConversationId, loadConversations])

  const switchToMessageVersion = useCallback(async (messageId: string) => {
    if (!currentConversationId) {
      throw new Error('To current conversation')
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('🔀 Switching to message version:', messageId)

      await dbService.switchToMessageVersion(currentConversationId, messageId)
      await loadConversations()

      // Force reload of message versions by clearing the cache
      // The useEffect will detect the conversation change and reload
      console.log('✅ Switched to version successfully')
    } catch (err) {
      console.error('Failed to switch to message version:', err)
      setError(err instanceof Error ? err.message : 'Failed to switch version')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentConversationId, loadConversations])

  const getMessageVersions = useCallback(async (originalMessageId: string) => {
    try {
      return await dbService.getMessageVersions(originalMessageId)
    } catch (err) {
      console.error('Failed to get message versions:', err)
      setError(err instanceof Error ? err.message : 'Failed to get versions')
      throw err
    }
  }, [])

  // Folder management methods

  const createFolder = useCallback(async (
    name: string,
    description?: string,
    conversationIds?: string[]
  ) => {
    try {
      const folder = await dbService.createFolder(name, description, conversationIds)
      await loadFolders()
      return folder
    } catch (err) {
      console.error('Failed to create folder:', err)
      setError('Failed to create folder')
      throw err
    }
  }, [loadFolders])

  const updateFolder = useCallback(async (folderId: string, updates: Partial<Folder>) => {
    try {
      await dbService.updateFolder(folderId, updates)
      await loadFolders()
    } catch (err) {
      console.error('Failed to update folder:', err)
      setError('Failed to update folder')
      throw err
    }
  }, [loadFolders])

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      await dbService.deleteFolder(folderId)
      await loadFolders()
    } catch (err) {
      console.error('Failed to delete folder:', err)
      setError('Failed to delete folder')
      throw err
    }
  }, [loadFolders])

  const addConversationToFolder = useCallback(async (folderId: string, conversationId: string) => {
    try {
      await dbService.addConversationToFolder(folderId, conversationId)
      await loadFolders()
    } catch (err) {
      console.error('Failed to add conversation to folder:', err)
      setError('Failed to add conversation to folder')
      throw err
    }
  }, [loadFolders])

  const removeConversationFromFolder = useCallback(async (folderId: string, conversationId: string) => {
    try {
      await dbService.removeConversationFromFolder(folderId, conversationId)
      await loadFolders()
    } catch (err) {
      console.error('Failed to remove conversation from folder:', err)
      setError('Failed to remove conversation from folder')
      throw err
    }
  }, [loadFolders])

  // Project management methods

  const createProject = useCallback(async (
    name: string,
    description: string,
    instructions?: string,
    attachments?: File[]
  ) => {
    try {
      const project = await dbService.createProject(name, description, instructions, attachments)
      await loadProjects()
      return project
    } catch (err) {
      console.error('Failed to create project:', err)
      setError('Failed to create project')
      throw err
    }
  }, [loadProjects])

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    try {
      await dbService.updateProject(projectId, updates)
      await loadProjects()
    } catch (err) {
      console.error('Failed to update project:', err)
      setError('Failed to update project')
      throw err
    }
  }, [loadProjects])

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      await dbService.deleteProject(projectId)
      await loadProjects()
      // Also reload conversations to reflect unlinking
      await loadConversations()
    } catch (err) {
      console.error('Failed to delete project:', err)
      setError('Failed to delete project')
      throw err
    }
  }, [loadProjects, loadConversations])

  const branchConversation = useCallback(async (messageId: string) => {
    if (!currentConversationId) {
      throw new Error('No current conversation')
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('🌿 Branching conversation from message:', messageId)

      // Create the branched conversation
      const newConversation = await dbService.branchConversation(currentConversationId, messageId)
      
      // Reload conversations list
      await loadConversations()

      // Navigate to the new conversation
      setCurrentConversationId(newConversation.id)

      console.log('✅ Branch created and navigated:', newConversation.id)
    } catch (err) {
      console.error('Failed to branch conversation:', err)
      setError(err instanceof Error ? err.message : 'Failed to branch conversation')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentConversationId, loadConversations])

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
