"use server"



import { auth } from "@/lib/auth"
import { cloudDb } from "@/lib/services/cloud-db"
import { cloudStorage } from "@/lib/services/cloud-storage"
import { revalidatePath } from "next/cache"

export async function getConversations() {
  const session = await auth()
  if (!session?.user?.id) return []
  return await cloudDb.getConversations(session.user.id)
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
  
  // Generate embedding for user messages
  if (message.role === 'user' && message.content && message.content.trim()) {
    try {
      const { getOpenRouter } = await import('@/lib/services/openrouter')
      const openrouter = getOpenRouter()
      const vector = await openrouter.getEmbeddings(message.content)
      await cloudDb.addEmbedding(msg.id, conversationId, session.user.id, message.content, vector)
    } catch (error) {
      console.error('Failed to generate embedding:', error)
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

// --- AI Response with RAG ---

export async function generateAIResponseAction(
  conversationId: string,
  referencedConversations?: { id: string; title: string }[],
  referencedFolders?: { id: string; name: string }[]
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  
  // 1. Get messages from current conversation
  const messages = await cloudDb.getMessages(conversationId)
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()
  if (!lastUserMessage) throw new Error('No user message found')
  
  // 2. Check if user has credits
  const credits = await cloudDb.getUserCredits(session.user.id)
  if (credits <= 0) throw new Error('Insufficient credits')
  
  // 3. Build context from referenced conversations (RAG)
  let contextText = ''
  
  const hasReferences = (referencedConversations?.length ?? 0) > 0 || (referencedFolders?.length ?? 0) > 0
  
  if (hasReferences) {
    try {
      const { getOpenRouter } = await import('@/lib/services/openrouter')
      const { searchEmbeddings } = await import('@/lib/utils/vector')
      const openrouter = getOpenRouter()
      
      // Generate query embedding from user's question
      const queryEmbedding = await openrouter.getEmbeddings(lastUserMessage.content)
      
      // Collect conversation IDs
      const conversationIds: string[] = []
      if (referencedConversations) {
        conversationIds.push(...referencedConversations.map(r => r.id))
      }
      if (referencedFolders) {
        for (const folderRef of referencedFolders) {
          const allFolders = await getFolders()
          const folder = allFolders.find(f => f.id === folderRef.id)
          if (folder?.conversationIds) {
            conversationIds.push(...folder.conversationIds.slice(0, 5))
          }
        }
      }
      
      if (conversationIds.length > 0) {
        // Fetch embeddings
        const embeddings = await cloudDb.getEmbeddingsByConversationIds(conversationIds)
        
        if (embeddings.length > 0) {
          // Perform semantic search
          const relevantMessages = searchEmbeddings(queryEmbedding, embeddings, {
            limit: 15,
            minScore: 0.35
          })
          
          if (relevantMessages.length > 0) {
            // Build context
            const byConversation = new Map()
            
            for (const result of relevantMessages) {
              if (!byConversation.has(result.conversationId)) {
                byConversation.set(result.conversationId, [])
              }
              byConversation.get(result.conversationId)!.push(result)
            }
            
            for (const [convId, results] of byConversation) {
              const allConvs = await getConversations()
              const convTitle = allConvs.find((c: any) => c.id === convId)?.title || 'Untitled'
              
              contextText += `\n### From: "${convTitle}"\n\n`
              for (const result of results) {
                const preview = result.content.length > 400 
                  ? result.content.slice(0, 400) + '...' 
                  : result.content
                contextText += `- (${(result.score * 100).toFixed(0)}% relevant) ${preview}\n\n`
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('RAG context retrieval failed:', err)
      // Continue without context rather than failing
    }
  }
  
  return {
    contextText,
    success: true
  }
}

