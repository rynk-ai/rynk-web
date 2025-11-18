"use client"

import { useState, useEffect, useCallback } from "react"
import { dbService, type Conversation, type Message } from "@/lib/services/indexeddb"
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

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const createConversation = useCallback(async () => {
    try {
      const conversation = await dbService.createConversation()
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

  const selectConversation = useCallback((id: string) => {
    setCurrentConversationId(id)
    loadConversations()
  }, [currentConversationId, loadConversations])

  const generateAIResponse = useCallback(async (conversationId: string) => {
    try {
      // Get conversation messages from the path
      const messages = await dbService.getConversationMessages(conversationId)
      if (!messages) {
        throw new Error('Messages not found')
      }

      // Format messages for API - convert files to base64 for multimodal models
      const apiMessages: ApiMessage[] = []
      for (const msg of messages) {
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
            const content: any[] = []

            // Add text if present
            if (msg.content.trim()) {
              content.push({
                type: 'text' as const,
                text: msg.content,
              })
            }

            // Process each attachment
            for (const file of msg.attachments) {
              if (isImageFile(file)) {
                // Direct image - convert to base64
                const base64 = await fileToBase64(file)
                content.push({
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
                    content.push({
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
              content: content.length === 1 && content[0].type === 'text'
                ? content[0].text // If only text, use simple string format
                : content,
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

  const sendMessage = useCallback(async (
    content: string,
    files?: File[]
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
      await dbService.addMessage(conversationId, {
        role: 'user',
        content,
        attachments: files,
      })

      await loadConversations()

      // Generate AI response
      await generateAIResponse(conversationId)

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
    newAttachments?: File[]
  ) => {
    if (!currentConversationId) {
      throw new Error('No current conversation')
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('✏️ EDITING MESSAGE:', {
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

      // Update the edited message
      await dbService.updateMessage(messageId, {
        content: newContent,
        attachments: newAttachments,
      })

      console.log('✅ Message updated successfully')

      // Remove all messages after the edited message (including AI responses)
      const messagesToRemove = conversation.path.slice(messageIndex + 1)
      if (messagesToRemove.length > 0) {
        console.log('🗑️ Removing', messagesToRemove.length, 'subsequent messages')

        for (const msgId of messagesToRemove) {
          await dbService.deleteMessage(msgId)
        }

        // Update conversation path to only include messages up to the edited one
        conversation.path = conversation.path.slice(0, messageIndex + 1)
        await dbService.updateConversation(currentConversationId, {
          path: conversation.path
        })

        console.log('✅ Subsequent messages removed, conversation truncated')
      }

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

  return {
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
    getAllTags,
    editMessage,
    deleteMessage,
  }
}
