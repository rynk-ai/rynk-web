"use server"



import { auth } from "@/lib/auth"
import { cloudDb } from "@/lib/services/cloud-db"
import { cloudStorage } from "@/lib/services/cloud-storage"
import { revalidatePath } from "next/cache"

export async function getConversations() {
  const session = await auth()
  if (!session?.user?.id) return []
  const convs = await cloudDb.getConversations(session.user.id)
  return convs
}

export async function createConversation(projectId?: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const conv = await cloudDb.createConversation(session.user.id, undefined, projectId)
  revalidatePath('/')
  return conv
}

export async function sendMessage(conversationId: string, message: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Check credits
  const credits = await cloudDb.getUserCredits(session.user.id)
  if (credits <= 0) {
    throw new Error("Insufficient credits")
  }

  // Deduct credit (assuming 1 credit per message for now)
  await cloudDb.updateCredits(session.user.id, -1)

  const msg = await cloudDb.addMessage(conversationId, message)
  console.log(`✅ Message saved: ${msg.id}, role: ${message.role}`)
  
  // Generate embedding for user messages
  if (message.role === 'user' && message.content && message.content.trim()) {
    console.log(`🔄 Generating embedding for user message: ${msg.id}`)
    try {
      const { getOpenRouter } = await import('@/lib/services/openrouter')
      const openrouter = getOpenRouter()
      const vector = await openrouter.getEmbeddings(message.content)
      console.log(`✅ Got embedding vector (length: ${vector.length})`)
      await cloudDb.addEmbedding(msg.id, conversationId, session.user.id, message.content, vector)
      console.log(`✅ Embedding saved for message: ${msg.id}`)
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error)
      // Don't fail the message send if embedding fails
    }
  }

  revalidatePath('/')
  return msg
}

export async function getMessages(conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) return []
  // TODO: Verify user owns conversation
  return await cloudDb.getMessages(conversationId)
}

export async function updateMessage(messageId: string, updates: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.updateMessage(messageId, updates)
  
  // Generate embedding if content was updated
  if (updates.content && typeof updates.content === 'string' && updates.content.trim()) {
    try {
      // Fetch message to check role and get conversationId
      const message = await cloudDb.getMessage(messageId)
      
      if (message && message.role === 'assistant') {
        const { getOpenRouter } = await import('@/lib/services/openrouter')
        const openrouter = getOpenRouter()
        const vector = await openrouter.getEmbeddings(updates.content)
        await cloudDb.addEmbedding(messageId, message.conversationId, session.user.id, updates.content, vector)
      }
    } catch (error) {
      console.error('Failed to generate embedding for assistant message:', error)
    }
  }

  revalidatePath('/')
}

export async function updateConversation(conversationId: string, updates: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.updateConversation(conversationId, updates)
  revalidatePath('/')
}

export async function addMessage(conversationId: string, message: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const msg = await cloudDb.addMessage(conversationId, message)
  revalidatePath('/')
  return msg
}

export async function deleteConversation(conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.deleteConversation(conversationId)
  revalidatePath('/')
}

export async function deleteMessage(conversationId: string, messageId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.deleteMessage(conversationId, messageId)
  revalidatePath('/chat')
}

export async function getAllTags() {
  const session = await auth()
  if (!session?.user?.id) return []
  return await cloudDb.getAllTags(session.user.id)
}

export async function uploadFile(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  const file = formData.get('file') as File
  if (!file) throw new Error("No file provided")
  
  const key = `${session.user.id}/${Date.now()}-${file.name}`
  await cloudStorage.uploadFile(file, key)
  
  return {
    url: `/api/files/${key}`,
    name: file.name,
    type: file.type,
    size: file.size
  }
}

export async function createMessageVersion(
  conversationId: string,
  messageId: string,
  newContent: string,
  newAttachments?: any[],
  referencedConversations?: any[],
  referencedFolders?: any[]
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  const result = await cloudDb.createMessageVersion(
    conversationId,
    messageId,
    newContent,
    newAttachments,
    referencedConversations,
    referencedFolders
  )
  
  // Generate embedding for the new message version
  if (result.newMessage && result.newMessage.role === 'user' && newContent && newContent.trim()) {
    try {
      const { getOpenRouter } = await import('@/lib/services/openrouter')
      const openrouter = getOpenRouter()
      const vector = await openrouter.getEmbeddings(newContent)
      await cloudDb.addEmbedding(result.newMessage.id, conversationId, session.user.id, newContent, vector)
    } catch (error) {
      console.error('Failed to generate embedding for message version:', error)
    }
  }
  
  revalidatePath('/chat')
  return result
}

export async function getMessageVersions(originalMessageId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  return await cloudDb.getMessageVersions(originalMessageId)
}

export async function switchToMessageVersion(conversationId: string, versionMessageId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  await cloudDb.switchToMessageVersion(conversationId, versionMessageId)
  revalidatePath('/chat')
}

// --- Folders ---

export async function getFolders() {
  const session = await auth()
  if (!session?.user?.id) return []
  return await cloudDb.getFolders(session.user.id)
}

export async function createFolder(name: string, description?: string, conversationIds?: string[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const folder = await cloudDb.createFolder(session.user.id, name, description, conversationIds)
  revalidatePath('/')
  return folder
}

export async function updateFolder(folderId: string, updates: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.updateFolder(folderId, updates)
  revalidatePath('/')
}

export async function deleteFolder(folderId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.deleteFolder(folderId)
  revalidatePath('/')
}

export async function addConversationToFolder(folderId: string, conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.addConversationToFolder(folderId, conversationId)
  revalidatePath('/')
}

export async function removeConversationFromFolder(folderId: string, conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.removeConversationFromFolder(folderId, conversationId)
  revalidatePath('/')
}

// --- Projects ---

export async function getProjects() {
  const session = await auth()
  if (!session?.user?.id) return []
  return await cloudDb.getProjects(session.user.id)
}

export async function createProject(name: string, description: string, instructions?: string, attachments?: any[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const project = await cloudDb.createProject(session.user.id, name, description, instructions, attachments)
  revalidatePath('/')
  return project
}

export async function updateProject(projectId: string, updates: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.updateProject(projectId, updates)
  revalidatePath('/')
}

export async function deleteProject(projectId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.deleteProject(projectId)
  revalidatePath('/')
}

export async function getUserCredits() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return await cloudDb.getUserCredits(session.user.id)
}

// --- Embeddings ---

export async function addEmbedding(messageId: string, conversationId: string, content: string, vector: number[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  return cloudDb.addEmbedding(messageId, conversationId, session.user.id, content, vector)
}

export async function getEmbeddingsByConversations(conversationIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  return cloudDb.getEmbeddingsByConversationIds(conversationIds)
}

export async function branchConversation(conversationId: string, messageId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  const newConversation = await cloudDb.branchConversation(conversationId, messageId)
  revalidatePath('/')
  return newConversation
}

// --- Conversation Context Management ---

export async function setConversationContext(
  conversationId: string,
  referencedConversations?: { id: string; title: string }[],
  referencedFolders?: { id: string; name: string }[]
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  await cloudDb.updateConversation(conversationId, {
    activeReferencedConversations: referencedConversations || [],
    activeReferencedFolders: referencedFolders || []
  })
  
  revalidatePath('/chat')
  return { success: true }
}

export async function clearConversationContext(conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  await cloudDb.updateConversation(conversationId, {
    activeReferencedConversations: [],
    activeReferencedFolders: []
  })
  
  revalidatePath('/chat')
  return { success: true }
}

// --- AI Response with RAG ---

export async function generateAIResponseAction(
  conversationId: string,
  referencedConversations?: { id: string; title: string }[],
  referencedFolders?: { id: string; name: string }[]
) {
  console.log('🎯 generateAIResponseAction called')
  console.log('  conversationId:', conversationId)
  console.log('  referencedConversations:', referencedConversations)
  console.log('  referencedFolders:', referencedFolders)
  
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  // 1. Get messages from current conversation
  const messages = await cloudDb.getMessages(conversationId)
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()
  if (!lastUserMessage) throw new Error('No user message found')
  
  console.log(`  lastUserMessage content: "${lastUserMessage.content}"`)
  
  // 2. Check if user has credits
  const credits = await cloudDb.getUserCredits(session.user.id)
  if (credits <= 0) throw new Error('Insufficient credits')
  
  // 3. Build context from referenced conversations
  let contextText = ''
  
  // Get conversation to check for persistent context
  const conversations = await getConversations()
  const conversation = conversations.find(c => c.id === conversationId)
  
  let finalReferencedConversations = referencedConversations
  let finalReferencedFolders = referencedFolders
  
  // Prioritize conversation-level context
  if (conversation?.activeReferencedConversations || conversation?.activeReferencedFolders) {
    const activeConvs = conversation.activeReferencedConversations
    const activeFolders = conversation.activeReferencedFolders
    
    finalReferencedConversations = activeConvs && activeConvs.length > 0 
      ? activeConvs 
      : referencedConversations
      
    finalReferencedFolders = activeFolders && activeFolders.length > 0
      ? activeFolders
      : referencedFolders
      
    console.log('  Using conversation-level context:', {
      conversations: finalReferencedConversations,
      folders: finalReferencedFolders
    })
  }
  
  // Collect all conversation IDs
  const finalConversationIds: string[] = []
  
  if (finalReferencedConversations) {
    finalConversationIds.push(...finalReferencedConversations.map(c => c.id))
  }
  
  if (finalReferencedFolders) {
    for (const folderRef of finalReferencedFolders) {
      const allFolders = await getFolders()
      const folder = allFolders.find(f => f.id === folderRef.id)
      if (folder?.conversationIds) {
        finalConversationIds.push(...folder.conversationIds)
      }
    }
  }
  
  if (finalConversationIds.length === 0) {
    console.log('  No context references found')
    return { contextText: '', success: true }
  }
  
  try {
    // Fetch ALL messages from referenced conversations
    interface ConversationContext {
      conversationId: string
      conversationTitle: string
      messages: typeof messages
    }
    
    const allContextMessages: ConversationContext[] = []
    
    for (const convId of finalConversationIds) {
      const contextMessages = await cloudDb.getMessages(convId)
      const conv = conversations.find(c => c.id === convId)
      const title = conv?.title || 'Untitled'
      
      allContextMessages.push({
        conversationId: convId,
        conversationTitle: title,
        messages: contextMessages.filter(m => m.role !== 'system') // Exclude system messages
      })
    }
    
    console.log(`📥 Fetched messages from ${allContextMessages.length} conversations`)
    
    // Calculate total character count for token estimation
    const totalChars = allContextMessages.reduce((sum, ctx) => 
      sum + ctx.messages.reduce((msgSum, msg) => msgSum + msg.content.length, 0)
    , 0)
    const estimatedTokens = Math.ceil(totalChars / 4) // Rough estimate: 1 token ≈ 4 chars
    
    console.log(`📊 Estimated tokens: ${estimatedTokens}`)
    
    // Token limit for Claude 3 Haiku (conservative to leave room for conversation)
    const TOKEN_LIMIT = 50000
    
    if (estimatedTokens < TOKEN_LIMIT) {
      // Include everything - full context
      console.log(`✅ Including full context (under ${TOKEN_LIMIT} token limit)`)
      
      for (const ctx of allContextMessages) {
        contextText += `\n### Context from: "${ctx.conversationTitle}"\n\n`
        
        for (const msg of ctx.messages) {
          const roleLabel = msg.role === 'user' ? 'User' : 'Assistant'
          contextText += `**${roleLabel}**: ${msg.content}\n\n`
        }
      }
      
      console.log(`✅ Built full context (${contextText.length} characters)`)
    } else {
      // Smart compression using embeddings
      console.log(`⚠️ Context too large (${estimatedTokens} tokens), using smart compression`)
      
      const { getOpenRouter } = await import('@/lib/services/openrouter')
      const { searchEmbeddings } = await import('@/lib/utils/vector')
      const openrouter = getOpenRouter()
      
      // Generate query embedding
      const queryEmbedding = await openrouter.getEmbeddings(lastUserMessage.content)
      
      // Fetch embeddings for referenced conversations
      const embeddings = await cloudDb.getEmbeddingsByConversationIds(finalConversationIds)
      console.log(`📊 Fetched ${embeddings.length} embeddings for compression`)
      
      if (embeddings.length > 0) {
        // Rank by relevance
        const rankedResults = searchEmbeddings(queryEmbedding, embeddings, {
          limit: 100, // Higher limit for compression
          minScore: 0.1 // Lower threshold
        })
        
        console.log(`🔍 Ranked ${rankedResults.length} messages by relevance`)
        
        // Take top results until we hit token budget
        let currentTokens = 0
        const selectedMessages: Array<{ 
          conversationTitle: string
          content: string
          score: number 
        }> = []
        
        for (const result of rankedResults) {
          const msgTokens = Math.ceil(result.content.length / 4)
          if (currentTokens + msgTokens < TOKEN_LIMIT) {
            const ctx = allContextMessages.find(c => c.conversationId === result.conversationId)
            selectedMessages.push({
              conversationTitle: ctx?.conversationTitle || 'Unknown',
              content: result.content,
              score: result.score
            })
            currentTokens += msgTokens
          } else {
            break
          }
        }
        
        // Build compressed context grouped by conversation
        const byConversation = new Map<string, typeof selectedMessages>()
        for (const msg of selectedMessages) {
          if (!byConversation.has(msg.conversationTitle)) {
            byConversation.set(msg.conversationTitle, [])
          }
          byConversation.get(msg.conversationTitle)!.push(msg)
        }
        
        for (const [title, messages] of byConversation) {
          contextText += `\n### Context from: "${title}"\n\n`
          for (const msg of messages) {
            contextText += `- ${msg.content}\n\n`
          }
        }
        
        console.log(`✅ Compressed context to ${currentTokens} tokens (${selectedMessages.length} messages)`)
      } else {
        console.warn('⚠️ No embeddings available for compression')
        // Fallback: Include first N messages from each conversation
        let currentTokens = 0
        for (const ctx of allContextMessages) {
          contextText += `\n### Context from: "${ctx.conversationTitle}"\n\n`
          
          for (const msg of ctx.messages) {
            const msgTokens = Math.ceil(msg.content.length / 4)
            if (currentTokens + msgTokens < TOKEN_LIMIT) {
              const roleLabel = msg.role === 'user' ? 'User' : 'Assistant'
              contextText += `**${roleLabel}**: ${msg.content}\n\n`
              currentTokens += msgTokens
            } else {
              break
            }
          }
          
          if (currentTokens >= TOKEN_LIMIT) break
        }
        
        console.log(`✅ Naive truncation to ${currentTokens} tokens`)
      }
    }
  } catch (err) {
    console.error('❌ Context retrieval failed:', err)
    // Continue without context rather than failing
  }
  
  console.log(`🎯 Returning context (${contextText.length} characters)`)
  
  return {
    contextText,
    success: true
  }
}
