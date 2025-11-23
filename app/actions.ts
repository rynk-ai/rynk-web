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
  revalidatePath('/chat')
  return conv
}



export async function getMessages(conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) return []
  // TODO: Verify user owns conversation
  return await cloudDb.getMessages(conversationId)
}



export async function updateConversation(conversationId: string, updates: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.updateConversation(conversationId, updates)
  revalidatePath('/chat')
}



export async function deleteConversation(conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.deleteConversation(conversationId)
  revalidatePath('/chat')
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
  revalidatePath('/chat')
  return folder
}

export async function updateFolder(folderId: string, updates: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.updateFolder(folderId, updates)
  revalidatePath('/chat')
}

export async function deleteFolder(folderId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.deleteFolder(folderId)
  revalidatePath('/chat')
}

export async function addConversationToFolder(folderId: string, conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.addConversationToFolder(folderId, conversationId)
  revalidatePath('/chat')
}

export async function removeConversationFromFolder(folderId: string, conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.removeConversationFromFolder(folderId, conversationId)
  revalidatePath('/chat')
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
  revalidatePath('/chat')
  return project
}

export async function updateProject(projectId: string, updates: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.updateProject(projectId, updates)
  revalidatePath('/chat')
}

export async function deleteProject(projectId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.deleteProject(projectId)
  revalidatePath('/chat')
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
  revalidatePath('/chat')
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


export async function generateTitleAction(conversationId: string, messageContent: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  try {
    const { getOpenRouter } = await import('@/lib/services/openrouter')
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
      await cloudDb.updateConversation(conversationId, { title: title.trim().replace(/^["']|["']$/g, '') })
      revalidatePath('/chat')
      return title
    }
  } catch (error) {
    console.error('Failed to generate title:', error)
  }
}

export async function getEmbeddingsAction(text: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  try {
    const { getOpenRouter } = await import('@/lib/services/openrouter')
    const openrouter = getOpenRouter()
    return await openrouter.getEmbeddings(text)
  } catch (error) {
    console.error('Failed to get embeddings:', error)
    throw error
  }
}
