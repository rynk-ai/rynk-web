import { cloudDb } from "@/lib/services/cloud-db"
import { cloudStorage } from "@/lib/services/cloud-storage"
import { getOpenRouter, type Message as ApiMessage } from "@/lib/services/openrouter"
import { searchEmbeddings } from "@/lib/utils/vector"

export class ChatService {
  async handleChatRequest(
    userId: string,
    conversationId: string,
    userMessageContent?: string,
    userMessageId?: string,
    attachments: any[] = [],
    referencedConversations: any[] = [],
    referencedFolders: any[] = []
  ) {
    console.log('🚀 [chatService.handleChatRequest] Starting:', {
      userId,
      conversationId,
      isEditFlow: !!userMessageId,
      hasNewContent: !!userMessageContent,
      userMessageId
    });

    // 1. Check credits
    const credits = await cloudDb.getUserCredits(userId)
    if (credits <= 0) {
      throw new Error("Insufficient credits")
    }

    let userMessage: any
    let messageContent: string
    let messageRefs: any = { referencedConversations, referencedFolders }

    // 2. Get or Create User Message
    if (userMessageId) {
      // Edit flow: Use existing message
      console.log('📥 [chatService] Edit flow - fetching message:', userMessageId);
      userMessage = await cloudDb.getMessage(userMessageId)
      if (!userMessage) {
        throw new Error(`User message ${userMessageId} not found`)
      }
      console.log('✅ [chatService] Message fetched:', {
        id: userMessage.id,
        content: userMessage.content.substring(0, 100) + '...',
        contentLength: userMessage.content.length
      });
      messageContent = userMessage.content
      // Use message's stored references for RAG context
      messageRefs = {
        referencedConversations: userMessage.referencedConversations || [],
        referencedFolders: userMessage.referencedFolders || []
      }
    } else {
      // Normal flow: Create new user message
      console.log('📝 [chatService] Normal flow - creating new message');
      if (!userMessageContent) {
        throw new Error("Either userMessageContent or userMessageId must be provided")
      }
      userMessage = await cloudDb.addMessage(conversationId, {
        role: 'user',
        content: userMessageContent,
        attachments,
        referencedConversations,
        referencedFolders
      })
      messageContent = userMessageContent
      console.log('✅ [chatService] Message created:', {
        id: userMessage.id,
        contentLength: messageContent.length
      });
    }

    // 3. Deduct credit
    await cloudDb.updateCredits(userId, -1)

    // 4. Fetch conversation and project (if exists)
    const conversation = await cloudDb.getConversation(conversationId)
    let project = null
    if (conversation?.projectId) {
      project = await cloudDb.getProject(conversation.projectId)
      console.log('📁 [chatService] Project fetched:', {
        projectId: conversation.projectId,
        hasInstructions: !!project?.instructions,
        hasAttachments: !!project?.attachments?.length
      })
    }

    // 5. Generate Embedding for User Message (Background)
    // We don't await this to keep latency low
    this.generateEmbeddingInBackground(userMessage.id, conversationId, userId, messageContent)

    // 6. Build Context (RAG) with progress streaming
    console.log('🔍 [chatService] Building context for query:', messageContent.substring(0, 50) + '...');
    
    // We'll collect progress updates and stream them later
    const progressUpdates: string[] = []
    const contextText = await this.buildContext(
      userId,
      conversationId,
      messageContent,
      messageRefs.referencedConversations,
      messageRefs.referencedFolders,
      (progress) => {
        progressUpdates.push(`[CONTEXT_PROGRESS]${progress}\n`)
      }
    )
    console.log('✅ [chatService] Context built, length:', contextText.length);

    // 7. Prepare Messages for AI
    console.log('📤 [chatService] Preparing messages for API...');
    const messages = await this.prepareMessagesForAI(conversationId, contextText, project)
    const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0]
    const lastContent = lastUserMsg?.content
    const contentPreview = typeof lastContent === 'string' 
      ? lastContent.substring(0, 100) 
      : JSON.stringify(lastContent).substring(0, 100)

    console.log('✅ [chatService] Messages prepared:', {
      messageCount: messages.length,
      lastUserMessage: contentPreview + '...'
    });

    // 7. Create Placeholder Assistant Message
    const assistantMessage = await cloudDb.addMessage(conversationId, {
      role: 'assistant',
      content: '',
    })

    // 8. Call AI and Stream
    console.log('📤 [chatService] Sending message to OpenRouter API (Direct)...');
    const openRouter = getOpenRouter()
    const stream = await openRouter.sendMessage({ messages })
    console.log('📥 [chatService] Received response stream');

    // 9. Return stream with message metadata in headers and progress updates
    return this.createStreamResponse(
      stream, 
      assistantMessage.id, 
      conversationId, 
      userId,
      userMessage.id,
      progressUpdates
    )
  }

  // REMOVED: generateAIResponseForMessage() - now handled by handleChatRequest with messageId

  private async generateEmbeddingInBackground(messageId: string, conversationId: string, userId: string, content: string) {
    try {
      if (!content || !content.trim()) return
      
      // Check if embedding already exists for this message
      const existingEmbedding = await cloudDb.getEmbeddingByMessageId(messageId)
      if (existingEmbedding) {
        console.log('⏭️ Skipping embedding generation - already exists for message:', messageId)
        return
      }
      
      const openRouter = getOpenRouter()
      const vector = await openRouter.getEmbeddings(content)
      await cloudDb.addEmbedding(messageId, conversationId, userId, content, vector)
    } catch (error) {
      console.error('Failed to generate embedding in background:', error)
    }
  }

  /**
   * Convert relative URLs to absolute URLs for external API access
   * OpenRouter needs absolute URLs to fetch images
   */
  private toAbsoluteUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url // Already absolute
    }
    
    // Get base URL from environment or use default
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:8788'
    
    // Remove leading slash if present to avoid double slashes
    const path = url.startsWith('/') ? url : `/${url}`
    return `${baseUrl}${path}`
  }

  private async buildContext(
    userId: string,
    currentConversationId: string,
    query: string,
    referencedConversations: any[],
    referencedFolders: any[],
    onProgress?: (message: string) => void
  ) {
    // Logic adapted from generateAIResponseAction
    let contextText = ''
    const conversationIds = new Set<string>()

    // Add referenced conversations
    referencedConversations.forEach(c => conversationIds.add(c.id))

    // Add referenced folders
    if (referencedFolders.length > 0) {
      const allFolders = await cloudDb.getFolders(userId)
      for (const ref of referencedFolders) {
        const folder = allFolders.find(f => f.id === ref.id)
        if (folder) {
          folder.conversationIds.forEach(cid => conversationIds.add(cid))
        }
      }
    }

    if (conversationIds.size === 0) return ''

    const finalConversationIds = Array.from(conversationIds)
    
    // STRATEGY: Full Context Injection with Batch Queries
    // We inject the ENTIRE conversation history using optimized batch queries.
    
    try {
      console.log('🔍 [buildContext] Fetching full content for conversations:', finalConversationIds);
      
      // OPTIMIZATION: Batch fetch all conversations and messages
      const [conversations, messagesMap] = await Promise.all([
        cloudDb.getConversationsBatch(finalConversationIds),
        cloudDb.getMessagesBatch(finalConversationIds)
      ])
      
      // Build a conversation map for quick lookup
      const convMap = new Map(conversations.map(c => [c.id, c]))
      
      // Process each conversation
      for (const convId of  finalConversationIds) {
        const conv = convMap.get(convId)
        if (!conv) continue

        const messages = messagesMap.get(convId) || []
        if (messages.length === 0) continue

        // Send progress update
        if (onProgress) {
          onProgress(JSON.stringify({
            type: 'loading',
            conversation: conv.title,
            messageCount: messages.length
          }))
        }

        // CONTEXT WINDOW MANAGEMENT
        // STRATEGY: Full Context Injection
        // We inject the ENTIRE conversation history.
        // Modern models handle 128k+ tokens easily. 
        // A typical 100-msg chat is ~5k-10k tokens.
        // We only truncate if it's absolutely massive (safety cap).
        
        // Safety cap: ~100k tokens approx (400k chars) to prevent request failures
        const MAX_CHARS = 400000;
        let currentChars = 0;
        
        contextText += `\n=== START OF CONTEXT FROM CONVERSATION: "${conv.title}" ===\n`
        
        // Process all messages
        for (const msg of messages) {
          const role = msg.role === 'user' ? 'User' : 'Assistant'
          const content = msg.content
          
          // Check if adding this message would exceed safety cap
          if (currentChars + content.length > MAX_CHARS) {
            contextText += `\n[...Remaining ${messages.length - messages.indexOf(msg)} messages truncated due to size limit...]\n`
            break;
          }
          
          contextText += `\n${role}: ${content}\n`
          currentChars += content.length
        }
        
        contextText += `\n=== END OF CONTEXT FROM CONVERSATION: "${conv.title}" ===\n`
        
        // Send completion progress
        if (onProgress) {
          onProgress(JSON.stringify({
            type: 'loaded',
            conversation: conv.title
          }))
        }
      }
      
      // Send final completion
      if (onProgress) {
        onProgress(JSON.stringify({
          type: 'complete'
        }))
      }
      
      console.log('✅ [buildContext] Context built, length:', contextText.length);

    } catch (err) {
      console.error('Error building context:', err)
    }

    return contextText
  }

  private async prepareMessagesForAI(conversationId: string, contextText: string, project: any = null): Promise<ApiMessage[]> {
    console.log('📋 [prepareMessagesForAI] Fetching messages for conversation:', conversationId);
    const messages = await cloudDb.getMessages(conversationId)
    console.log('📋 [prepareMessagesForAI] Messages retrieved:', {
      count: messages.length,
      messageIds: messages.map(m => m.id),
      userMessages: messages.filter(m => m.role === 'user').map(m => ({
        id: m.id,
        contentPreview: m.content.substring(0, 50) + '...',
        contentLength: m.content.length
      }))
    });
    
    const apiMessages: ApiMessage[] = []

    // 1. Add Project Instructions as first system message (if exists)
    if (project?.instructions) {
      console.log('📁 [prepareMessagesForAI] Adding project instructions');
      apiMessages.push({
        role: 'system',
        content: project.instructions
      })
    }

    // 2. Add Context from Referenced Conversations (as background knowledge)
    if (contextText) {
      apiMessages.push({
        role: 'system',
        content: `The following conversation histories are provided for your reference and awareness. Use this information naturally when relevant to the current discussion:\n\n${contextText}`
      })
    }

    // 3. Add Project Attachments as USER message (images don't work in system messages)
    if (project?.attachments && project.attachments.length > 0) {
      console.log('📁 [prepareMessagesForAI] Adding project attachments:', project.attachments.length);
      
      const imageAttachments = project.attachments.filter((att: any) => att.type?.startsWith('image/'))
      
      if (imageAttachments.length > 0) {
        const content: any[] = [
          { type: 'text', text: 'These are the project context files for reference:' }
        ]
        
        for (const att of imageAttachments) {
          try {
            // Try to convert to base64 for reliable access
            const base64Url = await this.fetchImageAsBase64(att.url)
            console.log('📎 [prepareMessagesForAI] Converted to base64:', { original: att.url, success: !!base64Url });
            
            content.push({
              type: 'image_url',
              image_url: { url: base64Url || att.url } // Fallback to URL if base64 fails
            })
          } catch (e) {
            console.error('Failed to convert project image to base64:', e)
            // Fallback to absolute URL
            content.push({
              type: 'image_url',
              image_url: { url: this.toAbsoluteUrl(att.url) }
            })
          }
        }
        
        // Add as USER message (images don't work in system messages)
        apiMessages.push({ role: 'user', content })
        
        // Add assistant acknowledgment so it doesn't respond to the files
        apiMessages.push({ 
          role: 'assistant', 
          content: 'I can see the project context files. I\'ll use them as reference for our conversation.' 
        })
      }
      // TODO: Handle PDFs - for now they're included as attachments but not processed
    }

    // 4. Convert DB messages to API messages
    for (const m of messages) {
      if (m.attachments && m.attachments.length > 0) {
        // Handle multimodal
        const content: any[] = [{ type: 'text', text: m.content }]
        
        // We need to fetch images and convert to base64 or pass URLs if supported
        // OpenRouter supports URLs.
        // Assuming attachments have 'url' property.
        for (const att of m.attachments) {
           if (att.type?.startsWith('image/')) {
             try {
               const base64Url = await this.fetchImageAsBase64(att.url)
               content.push({
                 type: 'image_url',
                 image_url: { url: base64Url || this.toAbsoluteUrl(att.url) }
               })
             } catch (e) {
               console.error('Failed to convert message image to base64:', e)
               content.push({
                 type: 'image_url',
                 image_url: { url: this.toAbsoluteUrl(att.url) }
               })
             }
           }
        }
        apiMessages.push({ role: m.role, content })
      } else {
        apiMessages.push({ role: m.role, content: m.content })
      }
    }

    console.log('📤 [prepareMessagesForAI] Final messages for AI:', {
      count: apiMessages.length,
      roles: apiMessages.map(m => m.role),
      hasProjectInstructions: !!project?.instructions,
      hasProjectAttachments: !!project?.attachments?.length,
      lastUserMessage: apiMessages.filter(m => m.role === 'user').slice(-1)[0]
    });

    return apiMessages
  }

  /**
   * Fetch image from R2 and convert to base64 data URL
   */
  private async fetchImageAsBase64(url: string): Promise<string | null> {
    try {
      // Extract key from URL
      let key = url
      
      // Handle /api/files/KEY
      if (url.includes('/api/files/')) {
        key = url.split('/api/files/')[1]
      } 
      // Handle R2 public URL
      else if (url.startsWith('http')) {
        const urlObj = new URL(url)
        // Key is the pathname without leading slash
        key = urlObj.pathname.substring(1)
      }

      // Decode URI component in case of spaces/special chars
      key = decodeURIComponent(key)
      
      console.log('🔍 [fetchImageAsBase64] Fetching key:', key)
      const object = await cloudStorage.getFile(key)
      
      if (!object) {
        console.warn('⚠️ [fetchImageAsBase64] File not found in R2:', key)
        return null
      }

      const buffer = await object.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mimeType = object.httpMetadata?.contentType || 'image/png' // Default to png if unknown
      
      return `data:${mimeType};base64,${base64}`
    } catch (error) {
      console.error('❌ [fetchImageAsBase64] Error:', error)
      return null
    }
  }

  private createStreamResponse(
    stream: AsyncGenerator<string, void, unknown>,
    assistantMessageId: string,
    conversationId: string,
    userId: string,
    userMessageId: string,
    progressUpdates: string[] = []
  ) {
    const encoder = new TextEncoder()
    let fullResponse = ''

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          // STEP 1: Stream progress updates first
          for (const update of progressUpdates) {
            controller.enqueue(encoder.encode(update))
          }
          
          // STEP 2: Stream AI response
          for await (const chunk of stream) {
            fullResponse += chunk
            controller.enqueue(encoder.encode(chunk))
          }
          
          // Stream finished, save full response
          await cloudDb.updateMessage(assistantMessageId, { content: fullResponse })
          
          // Generate embedding for assistant response
          // We await this to ensure it completes before the stream closes in serverless environments
          const service = new ChatService()
          await service.generateEmbeddingInBackground(assistantMessageId, conversationId, userId, fullResponse)

          controller.close()
        } catch (err) {
          controller.error(err)
        }
      }
    })

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-User-Message-Id': userMessageId,
        'X-Assistant-Message-Id': assistantMessageId
      }
    })
  }
}

export const chatService = new ChatService()
