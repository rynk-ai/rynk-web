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

export async function deleteMessage(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.deleteMessage(messageId)
  revalidatePath('/')
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
