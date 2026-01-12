"use server"



import { auth } from "@/lib/auth"
import { cloudDb } from "@/lib/services/cloud-db"
import { cloudStorage } from "@/lib/services/cloud-storage"
import { revalidatePath } from "next/cache"

export async function getConversations(limit: number = 20, offset: number = 0, projectId?: string) {
  const session = await auth()
  if (!session?.user?.id) return []
  const convs = await cloudDb.getConversations(session.user.id, limit, offset, projectId)
  return convs
}

export async function searchConversations(query: string, limit: number = 20, offset: number = 0) {
  const session = await auth()
  if (!session?.user?.id) return []
  if (!query.trim()) return []
  return await cloudDb.searchConversations(session.user.id, query, limit, offset)
}

export async function createConversation(projectId?: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  console.log('[createConversation] projectId:', projectId)
  const conv = await cloudDb.createConversation(session.user.id, undefined, projectId)
  revalidatePath('/chat')
  return conv
}



export async function getMessages(conversationId: string, limit: number = 50, cursor?: string) {
  console.log('[getMessages] Starting fetch for:', conversationId)
  const session = await auth()
  console.log('[getMessages] Session status:', { 
    hasSession: !!session, 
    hasUser: !!session?.user,
    userId: session?.user?.id 
  })
  
  if (!session?.user?.id) {
    console.warn('[getMessages] Unauthorized access attempt')
    return { messages: [], nextCursor: null }
  }
  // TODO: Verify user owns conversation
  return await cloudDb.getMessages(conversationId, limit, cursor)
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

export async function updateMessage(messageId: string, updates: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.updateMessage(messageId, updates)
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
  
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `${session.user.id}/${Date.now()}-${sanitizedName}`
  const url = await cloudStorage.uploadFile(file, key)
  
  return {
    url, // Now uses R2 public URL directly
    name: file.name,
    type: file.type,
    size: file.size
  }
}

export async function initiateMultipartUpload(filename: string, contentType: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `${session.user.id}/${Date.now()}-${sanitizedName}`
  
  return await cloudStorage.createMultipartUpload(key, contentType)
}

export async function uploadPart(key: string, uploadId: string, partNumber: number, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const chunk = formData.get('chunk') as File
  if (!chunk) throw new Error("No chunk provided")
  
  const buffer = await chunk.arrayBuffer()
  return await cloudStorage.uploadPart(key, uploadId, partNumber, buffer)
}

export async function completeMultipartUpload(key: string, uploadId: string, parts: any[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return await cloudStorage.completeMultipartUpload(key, uploadId, parts)
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
  
  console.log('🔷 [createMessageVersion] Starting:', {
    conversationId,
    messageId,
    userId: session.user.id,
    contentLength: newContent.length,
    hasAttachments: !!newAttachments && newAttachments.length > 0,
    referencedConversations: referencedConversations?.length || 0,
    referencedFolders: referencedFolders?.length || 0
  });
  
  const result = await cloudDb.createMessageVersion(
    conversationId,
    messageId,
    newContent,
    newAttachments,
    referencedConversations,
    referencedFolders
  )
  
  console.log('✅ [createMessageVersion] Result:', {
    newMessageId: result.newMessage.id,
    conversationPath: result.conversationPath,
    hasNewMessage: !!result.newMessage
  });
  
  // Generate embedding for the new message version
  if (result.newMessage && result.newMessage.role === 'user' && newContent && newContent.trim()) {
    try {
      console.log('🔍 [createMessageVersion] Generating embedding...');
      const { getAIProvider } = await import('@/lib/services/ai-factory')
      const aiProvider = getAIProvider()
      const vector = await aiProvider.getEmbeddings(newContent)
      await cloudDb.addEmbedding(result.newMessage.id, conversationId, session.user.id, newContent, vector)
      console.log('✅ [createMessageVersion] Embedding created');
    } catch (error) {
      console.error('❌ [createMessageVersion] Failed to generate embedding:', error)
    }
  }
  
  revalidatePath('/chat')
  console.log('🏁 [createMessageVersion] Complete');
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

export async function createProject(name: string, description: string, instructions?: string, attachments?: any[], useChatsAsKnowledge: boolean = true) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const project = await cloudDb.createProject(session.user.id, name, description, instructions, attachments, useChatsAsKnowledge)
  
  // Process attachments through knowledge base
  if (attachments && attachments.length > 0) {
    const { processProjectAttachments } = await import('@/lib/services/project-ingestion')
    // Run in background to not block response
    processProjectAttachments(project.id, attachments).catch(err => 
      console.error('Failed to process project attachments:', err)
    )
  }

  revalidatePath('/chat')
  return project
}

export async function updateProject(projectId: string, updates: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await cloudDb.updateProject(projectId, updates)
  
  // Process new attachments if any
  if (updates.attachments && updates.attachments.length > 0) {
    const { processProjectAttachments } = await import('@/lib/services/project-ingestion')
    // Run in background
    processProjectAttachments(projectId, updates.attachments).catch(err => 
      console.error('Failed to process project attachments update:', err)
    )
  }

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
    const { getAIProvider } = await import('@/lib/services/ai-factory')
    const aiProvider = getAIProvider()
    const title = await aiProvider.sendMessageOnce({
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
    const { getAIProvider } = await import('@/lib/services/ai-factory')
    const aiProvider = getAIProvider()
    return await aiProvider.getEmbeddings(text)
  } catch (error) {
    console.error('Failed to get embeddings:', error)
    throw error
  }
}

// --- Surface Suggestion ---

// Simple in-memory rate limiting (per-instance, resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 50 // requests per window
const RATE_WINDOW_MS = 60 * 1000 // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false
  }
  
  entry.count++
  return true
}

const VALID_SURFACE_TYPES = [
  'chat', 'learning', 'guide', 'quiz', 'comparison',
  'flashcard', 'timeline', 'wiki', 'finance', 'research'
] as const

type SurfaceSuggestionType = typeof VALID_SURFACE_TYPES[number]

export interface SurfaceSuggestionResult {
  suggestedSurface: SurfaceSuggestionType | null
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

/**
 * Suggest the best surface format based on user query.
 * Uses Groq's fast model for quick classification.
 */
export async function suggestSurface(query: string): Promise<SurfaceSuggestionResult> {
  const session = await auth()
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const guestId = cookieStore.get("guest-session-id")?.value
  const identifier = session?.user?.id || guestId || "anonymous"
  
  // Rate limit check
  if (!checkRateLimit(identifier)) {
    return { suggestedSurface: null, confidence: 'low', reason: 'Rate limit exceeded' }
  }
  
  const trimmedQuery = query?.trim()
  if (!trimmedQuery || trimmedQuery.length < 5) {
    return { suggestedSurface: null, confidence: 'low', reason: '' }
  }
  
  // Truncate very long queries
  const truncatedQuery = trimmedQuery.slice(0, 300)
  
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.warn('[SurfaceSuggestion] Missing GROQ_API_KEY')
    return { suggestedSurface: null, confidence: 'low', reason: '' }
  }
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'system',
          content: `You are a query classifier. Analyze the user's query and suggest the BEST content format.

Available formats:
- "chat" - General conversation, opinions, quick questions
- "learning" - Educational courses with chapters, structured curriculum
- "guide" - Step-by-step instructions, how-to tutorials
- "quiz" - Test knowledge, practice questions
- "comparison" - Compare 2+ things side-by-side (A vs B)
- "flashcard" - Memorization, study cards
- "timeline" - Historical events, chronological sequences
- "wiki" - Encyclopedia-style comprehensive overview
- "finance" - Stock prices, crypto, market data
- "research" - Deep-dive analysis with citations

Respond ONLY with JSON:
{"surface": "type", "confidence": "high|medium|low", "reason": "brief 5-word reason"}

Rules:
- If query mentions "compare", "vs", "versus", "or which" → comparison
- If query asks for price/stock/crypto → finance  
- If query starts with "teach me", "learn", "explain" → learning or wiki
- If query has "quiz", "test me", "assess" → quiz
- If query has "timeline", "history of", "chronology" → timeline
- If query has "flashcard", "memorize" → flashcard
- If query has "how to", "step by step", "guide" → guide
- If unclear or simple question → chat (default)
- confidence: high = clear match, medium = reasonable guess, low = defaulting`
        }, {
          role: 'user',
          content: truncatedQuery
        }],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 100
      })
    })
    
    if (!response.ok) {
      console.error('[SurfaceSuggestion] Groq API error:', response.status)
      return { suggestedSurface: null, confidence: 'low', reason: '' }
    }
    
    const data: any = await response.json()
    const result = JSON.parse(data.choices[0]?.message?.content || '{}')
    
    const surface = result.surface as SurfaceSuggestionType
    const confidence = result.confidence as 'high' | 'medium' | 'low'
    const reason = result.reason?.slice(0, 50) || ''
    
    // Only return a suggestion if we have medium+ confidence and it's not just "chat"
    if (VALID_SURFACE_TYPES.includes(surface) && surface !== 'chat' && ['high', 'medium'].includes(confidence)) {
      return { suggestedSurface: surface, confidence, reason }
    }
    
    return { suggestedSurface: null, confidence: 'low', reason: '' }
  } catch (error) {
    console.error('[SurfaceSuggestion] Error:', error)
    return { suggestedSurface: null, confidence: 'low', reason: '' }
  }
}
