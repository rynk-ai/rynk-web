import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Message structure with versioning support
interface Message {
  id: string              // Unique message ID
  conversationId: string  // Which conversation this belongs to
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: File[]
  timestamp: number
  parentMessageId?: string  // ID of the parent message (for versions)
  versionOf?: string        // ID of the original message this is a version of
  versionNumber: number     // Version number (1 for original, 2 for first edit, etc.)
  branchId?: string         // Optional branch identifier for grouping
  referencedConversations?: { id: string; title: string }[] // References to other conversations
  referencedFolders?: { id: string; name: string }[] // References to folders of conversations
}

interface Branch {
  id: string
  name: string
  path: string[]          // Array of message IDs
  createdAt: number
  parentVersionId?: string // Which version this branch was created from
}

// Conversation with path reference (not full messages)
interface Conversation {
  id: string
  title: string
  path: string[]           // Array of message IDs (not full message objects!)
  createdAt: number
  updatedAt: number
  tags: string[]
  isPinned: boolean
  activeBranchId?: string  // Which branch is currently active
  branches: Branch[]       // All branches for this conversation
  projectId?: string       // Optional project ID
  preview?: string         // First 50 chars of last message for sidebar display
}

interface Folder {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  conversationIds: string[] // Array of conversation IDs in this folder
}

export interface Project {
  id: string
  name: string
  description: string
  instructions?: string
  attachments?: File[]
  createdAt: number
  updatedAt: number
}

export interface Embedding {
  id: string
  messageId: string
  conversationId: string
  content: string
  vector: number[]
  timestamp: number
}

interface ChatDB extends DBSchema {
  messages: {
    key: string           // message.id
    value: Message
    indexes: {
      'by-conversation': string      // message.conversationId
    }
  }
  conversations: {
    key: string           // conversation.id
    value: Conversation
    indexes: { 'by-updated': number }
  }
  groups: {
    key: string           // folder.id
    value: Folder
    indexes: {
      'by-updated': number
    }
  }
  embeddings: {
    key: string           // id (uuid)
    value: Embedding
    indexes: {
      'by-conversation': string
      'by-message': string
    }
  }
  projects: {
    key: string           // project.id
    value: Project
    indexes: {
      'by-updated': number
    }
  }
}

const DB_NAME = 'simplechat-db'
const DB_VERSION = 10  // Increment to ensure indexes are created
const MESSAGES_STORE = 'messages'
const CONVERSATIONS_STORE = 'conversations'
const FOLDERS_STORE = 'groups' // Keeping the store name as 'groups' for backward compatibility
const PROJECTS_STORE = 'projects'
const EMBEDDINGS_STORE = 'embeddings'

class IndexedDBService {
  private db: IDBPDatabase<ChatDB> | null = null
  private initPromise: Promise<IDBPDatabase<ChatDB>> | null = null

  async init() {
    if (this.db) return this.db

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this._initInternal()
    this.db = await this.initPromise
    return this.db
  }

  private async _initInternal(): Promise<IDBPDatabase<ChatDB>> {
    const db = await openDB<ChatDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, tx) {
        console.log('🔄 Upgrading database from version', oldVersion, 'to', DB_VERSION)

        // Create messages store if it doesn't exist
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const store = db.createObjectStore(MESSAGES_STORE, {
            keyPath: 'id',
          })
          store.createIndex('by-conversation', 'conversationId')
        } else {
          // Ensure index exists
          const store = tx.objectStore(MESSAGES_STORE)
          if (!store.indexNames.contains('by-conversation')) {
            store.createIndex('by-conversation', 'conversationId')
          }
        }

        // Create conversations store if it doesn't exist
        if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
          const store = db.createObjectStore(CONVERSATIONS_STORE, {
            keyPath: 'id',
          })
          store.createIndex('by-updated', 'updatedAt')
        } else {
          // Ensure index exists
          const store = tx.objectStore(CONVERSATIONS_STORE)
          if (!store.indexNames.contains('by-updated')) {
            store.createIndex('by-updated', 'updatedAt')
          }
        }

        // Create folders store if it doesn't exist
        if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
          const store = db.createObjectStore(FOLDERS_STORE, {
            keyPath: 'id',
          })
          store.createIndex('by-updated', 'updatedAt')
        } else {
          // Ensure index exists
          const store = tx.objectStore(FOLDERS_STORE)
          if (!store.indexNames.contains('by-updated')) {
            store.createIndex('by-updated', 'updatedAt')
          }
        }

        // Create embeddings store if it doesn't exist
        if (!db.objectStoreNames.contains(EMBEDDINGS_STORE)) {
          const store = db.createObjectStore(EMBEDDINGS_STORE, {
            keyPath: 'id',
          })
          store.createIndex('by-conversation', 'conversationId')
          store.createIndex('by-message', 'messageId')
        } else {
          // Ensure indexes exist
          const store = tx.objectStore(EMBEDDINGS_STORE)
          if (!store.indexNames.contains('by-conversation')) {
            store.createIndex('by-conversation', 'conversationId')
          }
          if (!store.indexNames.contains('by-message')) {
            store.createIndex('by-message', 'messageId')
          }
        }

        // Create projects store if it doesn't exist
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const store = db.createObjectStore(PROJECTS_STORE, {
            keyPath: 'id',
          })
          store.createIndex('by-updated', 'updatedAt')
        } else {
          // Ensure index exists
          const store = tx.objectStore(PROJECTS_STORE)
          if (!store.indexNames.contains('by-updated')) {
            store.createIndex('by-updated', 'updatedAt')
          }
        }
      },
    })

    await this.migrate(db)
    return db
  }

  private async migrate(db: IDBPDatabase<ChatDB>) {
    console.log('✅ Database initialized - version 8')
    // Migration from version 7 to 8: added embeddings support
    // No data migration needed - embeddings are a new feature
  }

  // Conversation CRUD operations

  async createConversation(title?: string, projectId?: string): Promise<Conversation> {
    const db = await this.init()
    const id = crypto.randomUUID()
    const now = Date.now()

    const conversation: Conversation = {
      id,
      title: title || 'New Conversation',
      path: [], // Empty path
      createdAt: now,
      updatedAt: now,
      tags: [],
      isPinned: false,
      branches: [], // Initialize branches array
      projectId,
    }

    await db.add(CONVERSATIONS_STORE, conversation)
    return conversation
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const db = await this.init()
    return db.get(CONVERSATIONS_STORE, id)
  }

  async getAllConversations(): Promise<Conversation[]> {
    const db = await this.init()
    return db.getAllFromIndex(CONVERSATIONS_STORE, 'by-updated')
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const db = await this.init()
    const tx = db.transaction(CONVERSATIONS_STORE, 'readwrite')
    const store = tx.objectStore(CONVERSATIONS_STORE)

    const existing = await store.get(id)
    if (!existing) {
      throw new Error(`Conversation ${id} not found`)
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    }

    await store.put(updated)
    await tx.done
  }

  async deleteConversation(id: string): Promise<void> {
    const db = await this.init()

    // Delete conversation
    await db.delete(CONVERSATIONS_STORE, id)

    // Delete all messages in this conversation
    const messages = await db.getAllFromIndex(MESSAGES_STORE, 'by-conversation', id)
    for (const msg of messages) {
      await db.delete(MESSAGES_STORE, msg.id)
    }
  }

  /**
   * Branch a conversation from a specific message
   * Creates a new conversation with a copy of all messages up to and including the specified message
   */
  async branchConversation(
    sourceConversationId: string,
    branchFromMessageId: string
  ): Promise<Conversation> {
    console.log('🌿 Branching conversation from message:', branchFromMessageId)

    const db = await this.init()
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')
    const conversationsStore = tx.objectStore(CONVERSATIONS_STORE)
    const messagesStore = tx.objectStore(MESSAGES_STORE)

    // Get source conversation
    const sourceConversation = await conversationsStore.get(sourceConversationId)
    if (!sourceConversation) {
      throw new Error(`Source conversation ${sourceConversationId} not found`)
    }

    // Find the index of the branch point message in the path
    const branchPointIndex = sourceConversation.path.indexOf(branchFromMessageId)
    if (branchPointIndex === -1) {
      throw new Error('Branch point message not found in conversation path')
    }

    // Get all message IDs up to and including the branch point
    const messageIdsToCopy = sourceConversation.path.slice(0, branchPointIndex + 1)

    // Create new conversation
    const now = Date.now()
    const newConversationId = crypto.randomUUID()
    const newConversation: Conversation = {
      id: newConversationId,
      title: `Branch: ${sourceConversation.title}`,
      path: [],
      createdAt: now,
      updatedAt: now,
      tags: [...sourceConversation.tags],
      isPinned: false,
      branches: [],
      projectId: sourceConversation.projectId,
    }

    // Copy each message to the new conversation
    for (const oldMessageId of messageIdsToCopy) {
      const oldMessage = await messagesStore.get(oldMessageId)
      if (!oldMessage) {
        console.warn(`Message ${oldMessageId} not found, skipping`)
        continue
      }

      // Create new message with new ID but same content
      const newMessageId = crypto.randomUUID()
      const newMessage: Message = {
        ...oldMessage,
        id: newMessageId,
        conversationId: newConversationId,
        timestamp: now,
        // Reset branching-related fields for the new conversation
        parentMessageId: undefined,
        versionOf: undefined,
        branchId: undefined,
      }

      // Save the new message
      await messagesStore.put(newMessage)
      
      // Add to new conversation path
      newConversation.path.push(newMessageId)
    }

    // Save the new conversation
    await conversationsStore.put(newConversation)
    await tx.done

    console.log('✅ Branched conversation created:', newConversationId, 'with', newConversation.path.length, 'messages')

    return newConversation
  }

  // Project CRUD operations

  async createProject(
    name: string,
    description: string,
    instructions?: string,
    attachments?: File[]
  ): Promise<Project> {
    const db = await this.init()
    const id = crypto.randomUUID()
    const now = Date.now()

    const project: Project = {
      id,
      name,
      description,
      instructions,
      attachments,
      createdAt: now,
      updatedAt: now,
    }

    await db.add(PROJECTS_STORE, project)
    return project
  }

  async getProject(id: string): Promise<Project | undefined> {
    const db = await this.init()
    return db.get(PROJECTS_STORE, id)
  }

  async getAllProjects(): Promise<Project[]> {
    const db = await this.init()
    return db.getAllFromIndex(PROJECTS_STORE, 'by-updated')
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const db = await this.init()
    const tx = db.transaction(PROJECTS_STORE, 'readwrite')
    const store = tx.objectStore(PROJECTS_STORE)

    const existing = await store.get(id)
    if (!existing) {
      throw new Error(`Project ${id} not found`)
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    }

    await store.put(updated)
    await tx.done
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.init()

    // Delete project
    await db.delete(PROJECTS_STORE, id)

    // Update conversations to remove project reference
    // We don't delete conversations, just unlink them
    const conversations = await db.getAllFromIndex(CONVERSATIONS_STORE, 'by-updated')
    const projectConversations = conversations.filter(c => c.projectId === id)
    
    for (const conv of projectConversations) {
      conv.projectId = undefined
      await db.put(CONVERSATIONS_STORE, conv)
    }
  }

  // Message operations

  async addMessage(
    conversationId: string,
    message: Omit<Message, 'id' | 'conversationId' | 'timestamp' | 'versionNumber'>
  ): Promise<Message> {
    const db = await this.init()
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')
    const conversationsStore = tx.objectStore(CONVERSATIONS_STORE)
    const messagesStore = tx.objectStore(MESSAGES_STORE)

    const conversation = await conversationsStore.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    const messageId = crypto.randomUUID()
    const newMessage: Message = {
      ...message,
      id: messageId,
      conversationId,
      timestamp: Date.now(),
      versionNumber: 1,  // All new messages are version 1
      branchId: conversation.activeBranchId, // Inherit active branch
    }

    // Save message
    await messagesStore.put(newMessage)

    // Add to conversation path
    conversation.path.push(messageId)
    conversation.updatedAt = Date.now()

    // Update conversation title if this is the first user message
    // Title generation is now handled asynchronously by the AI in useChat
    /* 
    if (message.role === 'user') {
      const title = message.content.slice(0, 50)
      conversation.title = title + (message.content.length > 50 ? '...' : '')
    }
    */

    // Update active branch path to include the new message
    if (conversation.activeBranchId && conversation.branches) {
      const activeBranch = conversation.branches.find(b => b.id === conversation.activeBranchId)
      if (activeBranch) {
        activeBranch.path.push(messageId)
        console.log('📝 Updated branch path:', activeBranch.id, activeBranch.path)
      }
    }

    await conversationsStore.put(conversation)
    await tx.done

    return newMessage
  }

  async getMessage(messageId: string): Promise<Message | undefined> {
    const db = await this.init()
    return db.get(MESSAGES_STORE, messageId)
  }

  async updateMessage(messageId: string, updates: Partial<Message>): Promise<Message> {
    const db = await this.init()
    const tx = db.transaction(MESSAGES_STORE, 'readwrite')
    const store = tx.objectStore(MESSAGES_STORE)

    const existing = await store.get(messageId)
    if (!existing) {
      throw new Error(`Message ${messageId} not found`)
    }

    const updated = {
      ...existing,
      ...updates,
    }

    await store.put(updated)
    await tx.done

    return updated
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    const db = await this.init()
    const conversation = await this.getConversation(conversationId)

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // Load messages for each ID in the path
    const messages: Message[] = []
    for (const messageId of conversation.path) {
      const message = await db.get(MESSAGES_STORE, messageId)
      if (message) {
        messages.push(message)
      }
    }

    return messages
  }

  async editMessage(
    messageId: string,
    newContent: string,
    newAttachments?: File[]
  ): Promise<Message> {
    console.log('✏️ Editing message (destructive):', messageId)

    const db = await this.init()
    const tx = db.transaction(MESSAGES_STORE, 'readwrite')
    const store = tx.objectStore(MESSAGES_STORE)

    // Get the message
    const message = await store.get(messageId)
    if (!message) {
      throw new Error(`Message ${messageId} not found`)
    }

    // Update the message in place
    const updatedMessage = {
      ...message,
      content: newContent,
      attachments: newAttachments,
    }

    await store.put(updatedMessage)
    await tx.done

    console.log('✅ Message updated successfully')

    return updatedMessage
  }

  /**
   * Create a new version of a message (for branching)
   * Returns the new version and updates the conversation path
   */
  async createMessageVersion(
    conversationId: string,
    messageId: string,
    newContent: string,
    newAttachments?: File[],
    referencedConversations?: { id: string; title: string }[],
    referencedFolders?: { id: string; name: string }[]
  ): Promise<{ newMessage: Message; conversationPath: string[] }> {
    console.log('🌿 Creating new version of message:', messageId)

    const db = await this.init()
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')
    const conversationsStore = tx.objectStore(CONVERSATIONS_STORE)
    const messagesStore = tx.objectStore(MESSAGES_STORE)

    // Get the original message
    const originalMessage = await messagesStore.get(messageId)
    if (!originalMessage) {
      throw new Error(`Message ${messageId} not found`)
    }

    // Get the conversation
    const conversation = await conversationsStore.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // Find the position of the message in the path
    const messageIndex = conversation.path.indexOf(messageId)
    if (messageIndex === -1) {
      throw new Error('Message not found in conversation path')
    }

    // Create new message (version)
    const newMessageId = crypto.randomUUID()
    const newMessage: Message = {
      ...originalMessage,
      id: newMessageId,
      content: newContent,
      attachments: newAttachments,
      referencedConversations,
      referencedFolders,
      timestamp: Date.now(),
      parentMessageId: messageId,
      versionOf: originalMessage.versionOf || messageId,
      versionNumber: (originalMessage.versionNumber || 1) + 1,
      branchId: crypto.randomUUID(), // Each version creates a new branch
    }

    // Save the new version
    await messagesStore.put(newMessage)

    // Save the original path as a branch before switching
    const originalBranchId = newMessage.branchId!
    const originalBranchName = `Branch from v${newMessage.versionNumber - 1}`
    const originalPath = [...conversation.path]
    console.log('🔍 DEBUG - Creating OLD branch:', { originalBranchId, originalBranchName, path: originalPath })

    // Update all messages in the original path with the original branchId
    for (const msgId of originalPath) {
      const msg = await messagesStore.get(msgId)
      if (msg) {
        msg.branchId = originalBranchId
        await messagesStore.put(msg)
      }
    }

    // Create branch record for the OLD branch
    const oldBranch: Branch = {
      id: originalBranchId,
      name: originalBranchName,
      path: originalPath,
      createdAt: Date.now(),
      parentVersionId: messageId,
    }

    // Update conversation: switch to new path
    const newPath = conversation.path.slice(0, messageIndex)
    newPath.push(newMessageId)
    console.log('🔍 DEBUG - New path:', newPath)

    // Create a NEW branch for the NEW path
    const newBranchId = crypto.randomUUID()
    const newBranchName = `Branch from v${newMessage.versionNumber}`
    const newBranch: Branch = {
      id: newBranchId,
      name: newBranchName,
      path: [...newPath],
      createdAt: Date.now(),
      parentVersionId: messageId,
    }
    console.log('🔍 DEBUG - Creating NEW branch:', { newBranchId, newBranchName, path: newPath })

    // Update newMessage to use the new branch
    newMessage.branchId = newBranchId
    await messagesStore.put(newMessage)

    conversation.path = newPath
    conversation.updatedAt = Date.now()
    conversation.activeBranchId = newBranchId

    // Add both branches to the list
    if (!conversation.branches) {
      conversation.branches = []
    }
    conversation.branches.push(oldBranch)
    conversation.branches.push(newBranch)

    console.log('🔍 DEBUG - Final conversation.branches:', conversation.branches)

    await conversationsStore.put(conversation)
    await tx.done

    console.log('✅ New version created:', newMessageId, '2 branches saved:', { oldBranchId: originalBranchId, newBranchId })

    return {
      newMessage,
      conversationPath: newPath,
    }
  }

  /**
   * Get all versions of a message
   */
  async getMessageVersions(originalMessageId: string): Promise<Message[]> {
    const db = await this.init()
    const allMessages = await db.getAll(MESSAGES_STORE)

    // Find the original message first
    const originalMessage = allMessages.find(m => m.id === originalMessageId)
    if (!originalMessage) {
      return []
    }

    const versions: Message[] = [originalMessage]

    // If the message has a versionOf field, find other versions
    // Otherwise, this is the root, find its children
    const rootVersionId = originalMessage.versionOf || originalMessage.id
    for (const msg of allMessages) {
      // Skip the original message itself
      if (msg.id === originalMessageId) continue

      // Find messages that are versions of the root
      if (msg.versionOf === rootVersionId) {
        versions.push(msg)
      }
    }

    // Sort by version number
    versions.sort((a, b) => a.versionNumber - b.versionNumber)

    return versions
  }

  /**
   * Switch to a specific version of a message and update the conversation path
   */
  async switchToMessageVersion(
    conversationId: string,
    versionMessageId: string
  ): Promise<void> {
    console.log('🔀 Switching to message version:', versionMessageId)

    const db = await this.init()
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')
    const conversationsStore = tx.objectStore(CONVERSATIONS_STORE)
    const messagesStore = tx.objectStore(MESSAGES_STORE)

    const conversation = await conversationsStore.get(conversationId)
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    const versionMessage = await messagesStore.get(versionMessageId)
    if (!versionMessage) {
      throw new Error(`Message version ${versionMessageId} not found`)
    }

    console.log('🔍 DEBUG - versionMessage.branchId:', versionMessage.branchId)
    console.log('🔍 DEBUG - conversation.branches:', conversation.branches)

    // Find the branch that contains this version
    let newPath: string[] = []
    let activeBranchId: string | undefined

    if (versionMessage.branchId) {
      // First, try to find the branch using the version's own branchId
      let branch = conversation.branches?.find(b => b.id === versionMessage.branchId)

      console.log('🔍 DEBUG - Looking for branch by ID:', versionMessage.branchId)
      console.log('🔍 DEBUG - Found branch:', branch)

      if (!branch) {
        // If not found, try to find a branch that contains this versionId
        console.log('🔍 DEBUG - Branch not found by ID, trying to find by path includes:', versionMessageId)
        branch = conversation.branches?.find(b => {
          const found = b.path.includes(versionMessageId)
          if (found) {
            console.log('🔍 DEBUG - Found branch by path:', b.id, b.path)
          }
          return found
        })
      }

      if (branch) {
        // Use the exact saved branch path - this preserves the conversation state
        // as it was when this branch was active, including all specific message versions
        newPath = [...branch.path]
        activeBranchId = branch.id
        console.log('✅ Restoring exact branch state:', { branchId: branch.id, path: newPath })
      } else if (versionMessage.parentMessageId && versionMessage.versionOf) {
        // Version is not in any saved branch
        // Need to reconstruct its path using its parent and descendants
        console.log('🔧 Version not in branch, reconstructing path...')

        // Get all messages in the conversation
        const allMessages = await messagesStore.index('by-conversation').getAll(conversationId)

        // Find the parent version (the one we're editing)
        const parentMessage = allMessages.find(m => m.id === versionMessage.parentMessageId)

        if (parentMessage) {
          // Check if the parent is in the current conversation path
          const parentIndex = conversation.path.indexOf(parentMessage.id)

          if (parentIndex !== -1) {
            // Parent is in current path, build from there
            // Get messages up to (but not including) the parent, since version replaces it
            const pathBeforeParent = conversation.path.slice(0, parentIndex)

            // Find descendants of this version
            const descendants: string[] = []
            const stack = [versionMessageId]
            const visited = new Set<string>()

            while (stack.length > 0) {
              const currentId = stack.shift()!
              if (visited.has(currentId)) continue
              visited.add(currentId)

              for (const msg of allMessages) {
                if (msg.parentMessageId === currentId && !visited.has(msg.id)) {
                  descendants.push(msg.id)
                  stack.push(msg.id)
                }
              }
            }

            newPath = [...pathBeforeParent, versionMessageId, ...descendants]
            activeBranchId = versionMessage.branchId
          } else {
            // Parent not in current path, just use the version
            newPath = [versionMessageId]
            activeBranchId = versionMessage.branchId
          }
        } else {
          // Can't find parent, just use the version
          newPath = [versionMessageId]
          activeBranchId = versionMessage.branchId
        }
      }
    }

    // If no branch found, use the current path
    if (newPath.length === 0) {
      newPath = [...conversation.path]
    }

    // Update conversation
    conversation.path = newPath
    conversation.activeBranchId = activeBranchId
    conversation.updatedAt = Date.now()

    await conversationsStore.put(conversation)
    await tx.done

    console.log('✅ Switched to version, new path:', newPath)
  }

  /**
   * Helper: Find all descendants of a message in the conversation tree
   */
  private findMessageDescendants(messageId: string, allMessages: Message[]): string[] {
    const descendants: string[] = []
    const queue: string[] = [messageId]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      // Find messages that have this as parent
      for (const msg of allMessages) {
        if (msg.parentMessageId === currentId && !visited.has(msg.id)) {
          descendants.push(msg.id)
          queue.push(msg.id)
        }
      }
    }

    return descendants
  }

  /**
   * Get all message versions for display (grouped by original message)
   */
  async getConversationMessageVersions(conversationId: string): Promise<Map<string, Message[]>> {
    const messages = await this.getConversationMessages(conversationId)
    const versionMap = new Map<string, Message[]>()

    for (const message of messages) {
      const rootId = message.versionOf || message.id
      const versions = await this.getMessageVersions(rootId)
      versionMap.set(rootId, versions)
    }

    return versionMap
  }

  /**
   * Get all messages from a conversation (not just the current path)
   */
  async getAllMessagesFromConversation(conversationId: string): Promise<Message[]> {
    const db = await this.init()
    return db.getAllFromIndex(MESSAGES_STORE, 'by-conversation', conversationId)
  }

  /**
   * Get all messages in the database
   */
  async getAllMessages(): Promise<Message[]> {
    const db = await this.init()
    return db.getAll(MESSAGES_STORE)
  }

    async deleteMessage(messageId: string): Promise<void> {
    console.log('🗑️ deleteMessage called for:', messageId)
    const db = await this.init()
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')
    const conversationsStore = tx.objectStore(CONVERSATIONS_STORE)
    const messagesStore = tx.objectStore(MESSAGES_STORE)

    const message = await messagesStore.get(messageId)
    if (!message) {
       console.error('❌ Message not found:', messageId)
       throw new Error(`Message ${messageId} not found`)
    }
    console.log('✅ Message found, conversationId:', message.conversationId)

    const conversation = await conversationsStore.get(message.conversationId)
    if (conversation) {
      // Check if this is a version of another message (has a parent)
      if (message.parentMessageId) {
        console.log('🔄 Message is a version (v' + message.versionNumber + '), reverting to parent:', message.parentMessageId)
        
        // 1. Find the branch that contains the parent message at the same position (or just switch to a branch containing it)
        // Actually, we want to switch to the branch where parentMessageId was the "active" one.
        // We can look for a branch that *ends* with parentMessageId, OR a branch where parentMessageId is followed by something else (if we had replies to v1).
        
        // Simplest approach: Find a branch that contains parentMessageId.
        // Ideally, we want the branch that was active *before* this version was created.
        // When we created this version, we saved the OLD path as a branch.
        // That branch should contain parentMessageId.
        
        const targetBranch = conversation.branches?.find(b => b.path.includes(message.parentMessageId!))
        
        if (targetBranch) {
             console.log('✅ Found target branch to revert to:', targetBranch.id)
             conversation.path = [...targetBranch.path]
             conversation.activeBranchId = targetBranch.id
             conversation.updatedAt = Date.now()
             await conversationsStore.put(conversation)
             
             // Delete the current message version since user explicitly deleted it
             await messagesStore.delete(messageId)
             console.log('🗑️ Deleted the rejected version:', messageId)
             
             await tx.done
             return
        } else {
            console.warn('⚠️ Could not find a branch containing parent message, falling back to cascade delete')
        }
      }

      // Fallback / Standard Logic: Cascade Delete (for root messages or if branch not found)
      const index = conversation.path.indexOf(messageId)
      console.log('📍 Message index in path:', index, 'Path length:', conversation.path.length)
      
      // 1. Determine which messages are being removed from the CURRENT path
      let messagesToRemoveFromPath: string[] = []
      
      if (index !== -1) {
        // Cascade delete: remove this message and everything after it from the active path
        messagesToRemoveFromPath = conversation.path.slice(index)
        console.log('📉 Cascade deleting:', messagesToRemoveFromPath.length, 'messages')
        
        // Update the conversation path
        const newPath = conversation.path.slice(0, index)
        conversation.path = newPath
        conversation.updatedAt = Date.now()
        await conversationsStore.put(conversation)
        console.log('✅ Conversation path updated. New length:', newPath.length)
      } else {
        // Message is not in the active path, but we still want to try deleting it
        console.warn('⚠️ Message not found in active path, deleting only the message record')
        messagesToRemoveFromPath = [messageId]
      }

      // 2. Safely delete message records
      // Only delete a message if it is NOT used in any other branch
      const allBranchPaths = conversation.branches?.map(b => b.path) || []
      const allUsedMessageIds = new Set<string>()
      
      // Collect all message IDs used in ALL branches (excluding the current path which we just updated)
      // Note: conversation.path is already updated, so we don't need to exclude it specifically, 
      // but we should check if the message exists in any *stored* branch definition.
      // Actually, 'conversation.branches' contains the history of branches.
      
      allBranchPaths.forEach(path => {
        path.forEach(id => allUsedMessageIds.add(id))
      })

      for (const id of messagesToRemoveFromPath) {
        if (!allUsedMessageIds.has(id)) {
          // Safe to delete: not used in any other branch
          await messagesStore.delete(id)
          console.log('🗑️ Deleted message record:', id)
        } else {
          console.log(`⚠️ Skipping delete for message ${id} as it is used in another branch`)
        }
      }
      
    } else {
        console.error('❌ Conversation not found:', message.conversationId)
        // Conversation not found, just delete message
        await messagesStore.delete(messageId)
    }

    await tx.done
    console.log('✅ deleteMessage transaction complete')
  }

  // Utility operations

  async clearAllConversations(): Promise<void> {
    const db = await this.init()
    await db.clear(CONVERSATIONS_STORE)
    await db.clear(MESSAGES_STORE)
  }

  async togglePinConversation(id: string): Promise<void> {
    const db = await this.init()
    const tx = db.transaction(CONVERSATIONS_STORE, 'readwrite')
    const store = tx.objectStore(CONVERSATIONS_STORE)

    const conversation = await store.get(id)
    if (!conversation) {
      throw new Error(`Conversation ${id} not found`)
    }

    conversation.isPinned = !conversation.isPinned
    conversation.updatedAt = Date.now()

    await store.put(conversation)
    await tx.done
  }

  async updateConversationTags(id: string, tags: string[]): Promise<void> {
    const db = await this.init()
    const tx = db.transaction(CONVERSATIONS_STORE, 'readwrite')
    const store = tx.objectStore(CONVERSATIONS_STORE)

    const conversation = await store.get(id)
    if (!conversation) {
      throw new Error(`Conversation ${id} not found`)
    }

    conversation.tags = tags
    conversation.updatedAt = Date.now()

    await store.put(conversation)
    await tx.done
  }

  async getAllTags(): Promise<string[]> {
    const db = await this.init()
    const conversations = await db.getAll(CONVERSATIONS_STORE)
    const tagSet = new Set<string>()

    conversations.forEach(conv => {
      if (conv.tags) {
        conv.tags.forEach(tag => tagSet.add(tag))
      }
    })

    return Array.from(tagSet).sort()
  }

  // Folder CRUD operations

  async createFolder(
    name: string,
    description?: string,
    conversationIds?: string[]
  ): Promise<Folder> {
    const db = await this.init()
    const id = crypto.randomUUID()
    const now = Date.now()

    const folder: Folder = {
      id,
      name,
      description,
      conversationIds: conversationIds || [],
      createdAt: now,
      updatedAt: now,
    }

    await db.add(FOLDERS_STORE, folder)
    return folder
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const db = await this.init()
    return db.get(FOLDERS_STORE, id)
  }

  async getAllFolders(): Promise<Folder[]> {
    const db = await this.init()
    return db.getAllFromIndex(FOLDERS_STORE, 'by-updated')
  }

  async updateFolder(id: string, updates: Partial<Folder>): Promise<void> {
    const db = await this.init()
    const tx = db.transaction(FOLDERS_STORE, 'readwrite')
    const store = tx.objectStore(FOLDERS_STORE)

    const existing = await store.get(id)
    if (!existing) {
      throw new Error(`Folder ${id} not found`)
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    }

    await store.put(updated)
    await tx.done
  }

  async deleteFolder(id: string): Promise<void> {
    const db = await this.init()

    const folder = await db.get(FOLDERS_STORE, id)
    if (!folder) {
      throw new Error(`Folder ${id} not found`)
    }

    await db.delete(FOLDERS_STORE, id)
  }

  // Embedding operations

  async addEmbedding(embedding: Omit<Embedding, 'id' | 'timestamp'>): Promise<void> {
    const db = await this.init()
    const id = crypto.randomUUID()
    
    await db.add(EMBEDDINGS_STORE, {
      ...embedding,
      id,
      timestamp: Date.now(),
    })
  }

  async getEmbeddingByMessageId(messageId: string): Promise<Embedding | undefined> {
    const db = await this.init()
    const index = db.transaction(EMBEDDINGS_STORE).store.index('by-message')
    return index.get(messageId)
  }

  async searchEmbeddings(queryVector: number[], limit: number = 5, minScore: number = 0.3): Promise<{ embedding: Embedding; score: number }[]> {
    const db = await this.init()
    const allEmbeddings = await db.getAll(EMBEDDINGS_STORE)
    
    const results = allEmbeddings.map(embedding => {
      const score = this.cosineSimilarity(queryVector, embedding.vector)
      return { embedding, score }
    })
    
    // Filter by min score and sort by score descending
    return results
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }
    
    if (normA === 0 || normB === 0) return 0
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  async addConversationToFolder(folderId: string, conversationId: string): Promise<void> {
    const db = await this.init()

    const folder = await db.get(FOLDERS_STORE, folderId)
    if (!folder) {
      throw new Error(`Folder ${folderId} not found`)
    }

    if (!folder.conversationIds.includes(conversationId)) {
      folder.conversationIds.push(conversationId)
      folder.updatedAt = Date.now()
      await db.put(FOLDERS_STORE, folder)
    }
  }

  async removeConversationFromFolder(folderId: string, conversationId: string): Promise<void> {
    const db = await this.init()

    const folder = await db.get(FOLDERS_STORE, folderId)
    if (!folder) {
      throw new Error(`Folder ${folderId} not found`)
    }

    if (folder.conversationIds.includes(conversationId)) {
      folder.conversationIds = folder.conversationIds.filter(id => id !== conversationId)
      folder.updatedAt = Date.now()
      await db.put(FOLDERS_STORE, folder)
    }
  }

  async getConversationsByFolder(folderId: string): Promise<Conversation[]> {
    const db = await this.init()
    const folder = await db.get(FOLDERS_STORE, folderId)
    
    if (!folder) {
      return []
    }

    const conversations: Conversation[] = []
    for (const convId of folder.conversationIds) {
      const conv = await db.get(CONVERSATIONS_STORE, convId)
      if (conv) {
        conversations.push(conv)
      }
    }

    return conversations
  }

  async getFolderByConversation(conversationId: string): Promise<Folder | undefined> {
    const db = await this.init()
    const folders = await db.getAll(FOLDERS_STORE)
    
    return folders.find(g => g.conversationIds.includes(conversationId))
  }
}

export const dbService = new IndexedDBService()
export type { Message, Conversation, Folder, Branch }
