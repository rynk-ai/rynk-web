import { cloudDb } from "@/lib/services/cloud-db"
import { getOpenRouter, type Message as ApiMessage } from "@/lib/services/openrouter"
import { searchEmbeddings } from "@/lib/utils/vector"

export class ChatService {
  async handleChatRequest(
    userId: string,
    conversationId: string,
    userMessageContent: string,
    attachments: any[] = [],
    referencedConversations: any[] = [],
    referencedFolders: any[] = []
  ) {
    // 1. Check credits
    const credits = await cloudDb.getUserCredits(userId)
    if (credits <= 0) {
      throw new Error("Insufficient credits")
    }

    // 2. Save User Message
    const userMessage = await cloudDb.addMessage(conversationId, {
      role: 'user',
      content: userMessageContent,
      attachments,
      referencedConversations,
      referencedFolders
    })

    // 3. Deduct credit
    await cloudDb.updateCredits(userId, -1)

    // 4. Generate Embedding for User Message (Background)
    // We don't await this to keep latency low
    this.generateEmbeddingInBackground(userMessage.id, conversationId, userId, userMessageContent)

    // 5. Build Context (RAG)
    const contextText = await this.buildContext(
      userId,
      conversationId,
      userMessageContent,
      referencedConversations,
      referencedFolders
    )

    // 6. Prepare Messages for AI
    const messages = await this.prepareMessagesForAI(conversationId, contextText)

    // 7. Create Placeholder Assistant Message
    const assistantMessage = await cloudDb.addMessage(conversationId, {
      role: 'assistant',
      content: '',
    })

    // 8. Call AI and Stream
    const openRouter = getOpenRouter()
    const stream = await openRouter.sendMessage({ messages })

    // 9. Return stream and handle completion to save assistant message
    return this.createStreamResponse(stream, assistantMessage.id, conversationId, userId)
  }

  private async generateEmbeddingInBackground(messageId: string, conversationId: string, userId: string, content: string) {
    try {
      if (!content || !content.trim()) return
      const openRouter = getOpenRouter()
      const vector = await openRouter.getEmbeddings(content)
      await cloudDb.addEmbedding(messageId, conversationId, userId, content, vector)
    } catch (error) {
      console.error('Failed to generate embedding in background:', error)
    }
  }

  private async buildContext(
    userId: string,
    currentConversationId: string,
    query: string,
    referencedConversations: any[],
    referencedFolders: any[]
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
    
    // Fetch embeddings for RAG
    // We use a simplified RAG approach here: fetch embeddings for all referenced conversations
    // and rank them against the current query.
    
    try {
      const openRouter = getOpenRouter()
      const queryEmbedding = await openRouter.getEmbeddings(query)
      const embeddings = await cloudDb.getEmbeddingsByConversationIds(finalConversationIds)

      if (embeddings.length === 0) {
        // Fallback: Fetch last few messages from each conversation if no embeddings
        // For now, let's just return empty if no embeddings to save complexity, 
        // or implement the naive fetch if needed. 
        // Let's stick to the plan of "Smart compression" if possible, but for now, 
        // if no embeddings, we might skip context or do a simple fetch.
        return '' 
      }

      const rankedResults = searchEmbeddings(queryEmbedding, embeddings, {
        limit: 20, // Top 20 relevant chunks
        minScore: 0.2
      })

      // Group by conversation for readability
      const byConversation = new Map<string, string[]>()
      
      // We need conversation titles. Fetching all conversations might be expensive if user has many.
      // But we only need titles for the ones in rankedResults.
      const relevantConvIds = new Set(rankedResults.map(r => r.conversationId))
      const allConvs = await cloudDb.getConversations(userId) // This is cached/fast usually? Or we can optimize.
      const convMap = new Map(allConvs.map(c => [c.id, c.title]))

      for (const result of rankedResults) {
        const title = convMap.get(result.conversationId) || 'Unknown Conversation'
        if (!byConversation.has(title)) {
          byConversation.set(title, [])
        }
        byConversation.get(title)!.push(result.content)
      }

      for (const [title, snippets] of byConversation) {
        contextText += `\n### Context from: "${title}"\n\n`
        snippets.forEach(snippet => {
          contextText += `- ${snippet}\n\n`
        })
      }

    } catch (err) {
      console.error('Error building context:', err)
    }

    return contextText
  }

  private async prepareMessagesForAI(conversationId: string, contextText: string): Promise<ApiMessage[]> {
    const messages = await cloudDb.getMessages(conversationId)
    
    const apiMessages: ApiMessage[] = []

    // Add System Prompt with Context if available
    if (contextText) {
      apiMessages.push({
        role: 'system',
        content: `Here is relevant context from referenced conversations:\n\n${contextText}`
      })
    }

    // Convert DB messages to API messages
    for (const m of messages) {
      if (m.attachments && m.attachments.length > 0) {
        // Handle multimodal
        const content: any[] = [{ type: 'text', text: m.content }]
        
        // We need to fetch images and convert to base64 or pass URLs if supported
        // OpenRouter supports URLs.
        // Assuming attachments have 'url' property.
        for (const att of m.attachments) {
           if (att.type?.startsWith('image/')) {
             content.push({
               type: 'image_url',
               image_url: { url: att.url }
             })
           }
        }
        apiMessages.push({ role: m.role, content })
      } else {
        apiMessages.push({ role: m.role, content: m.content })
      }
    }

    return apiMessages
  }

  private createStreamResponse(
    stream: AsyncGenerator<string, void, unknown>,
    assistantMessageId: string,
    conversationId: string,
    userId: string
  ) {
    const encoder = new TextEncoder()
    let fullResponse = ''

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            fullResponse += chunk
            controller.enqueue(encoder.encode(chunk))
          }
          
          // Stream finished, save full response
          await cloudDb.updateMessage(assistantMessageId, { content: fullResponse })
          
          // Generate embedding for assistant response in background
          // We can't call 'this' easily here if we lose context, but we can use the static reference or imported service
          // Re-instantiating service or using a helper is fine.
          // For simplicity, let's just fire and forget the embedding generation here.
          const service = new ChatService()
          service.generateEmbeddingInBackground(assistantMessageId, conversationId, userId, fullResponse)

          controller.close()
        } catch (err) {
          controller.error(err)
        }
      }
    })

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      }
    })
  }
}

export const chatService = new ChatService()
