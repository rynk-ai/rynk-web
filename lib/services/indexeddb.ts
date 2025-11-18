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
}

interface Group {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  conversationIds: string[] // Array of conversation IDs in this group
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
    key: string           // group.id
    value: Group
    indexes: {
      'by-updated': number
    }
  }
}

const DB_NAME = 'simplechat-db'
const DB_VERSION = 7  // Increment for new schema (added group support)
const MESSAGES_STORE = 'messages'
const CONVERSATIONS_STORE = 'conversations'
const GROUPS_STORE = 'groups'

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
      upgrade(db, oldVersion) {
        console.log('🔄 Upgrading database from version', oldVersion, 'to', DB_VERSION)

        // Create messages store if it doesn't exist
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const store = db.createObjectStore(MESSAGES_STORE, {
            keyPath: 'id',
          })
          store.createIndex('by-conversation', 'conversationId')
        }

        // Create conversations store if it doesn't exist
        if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
          const store = db.createObjectStore(CONVERSATIONS_STORE, {
            keyPath: 'id',
          })
          store.createIndex('by-updated', 'updatedAt')
        }

        // Create groups store if it doesn't exist (version 7+)
        if (!db.objectStoreNames.contains(GROUPS_STORE)) {
          const store = db.createObjectStore(GROUPS_STORE, {
            keyPath: 'id',
          })
          store.createIndex('by-updated', 'updatedAt')
        }
      },
    })

    await this.migrate(db)
    return db
  }

  private async migrate(db: IDBPDatabase<ChatDB>) {
    console.log('✅ Database initialized - version 7')
    // Migration from version 6 to 7: added groups support
    // No data migration needed - groups are a new feature
  }

  // Conversation CRUD operations

  async createConversation(title?: string): Promise<Conversation> {
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

  // Message operations

  async addMessage(
    conversationId: string,
    message: Omit<Message, 'id' | 'conversationId' | 'timestamp'>
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
    if (message.role === 'user') {
      const title = message.content.slice(0, 50)
      conversation.title = title + (message.content.length > 50 ? '...' : '')
    }

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
    newAttachments?: File[]
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
        const allMessages = await messagesStore.getAllFromIndex('by-conversation', conversationId)

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

  async deleteMessage(messageId: string): Promise<void> {
    const db = await this.init()
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')
    const conversationsStore = tx.objectStore(CONVERSATIONS_STORE)
    const messagesStore = tx.objectStore(MESSAGES_STORE)

    const message = await messagesStore.get(messageId)
    if (!message) {
      throw new Error(`Message ${messageId} not found`)
    }

    // Remove from conversation path
    const conversation = await conversationsStore.get(message.conversationId)
    if (conversation) {
      conversation.path = conversation.path.filter(id => id !== messageId)
      conversation.updatedAt = Date.now()
      await conversationsStore.put(conversation)
    }

    // Delete message
    await messagesStore.delete(messageId)

    await tx.done
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

  // Group CRUD operations

  async createGroup(
    name: string,
    description?: string,
    conversationIds?: string[]
  ): Promise<Group> {
    const db = await this.init()
    const id = crypto.randomUUID()
    const now = Date.now()

    const group: Group = {
      id,
      name,
      description,
      conversationIds: conversationIds || [],
      createdAt: now,
      updatedAt: now,
    }

    await db.add(GROUPS_STORE, group)
    return group
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const db = await this.init()
    return db.get(GROUPS_STORE, id)
  }

  async getAllGroups(): Promise<Group[]> {
    const db = await this.init()
    return db.getAllFromIndex(GROUPS_STORE, 'by-updated')
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<void> {
    const db = await this.init()
    const tx = db.transaction(GROUPS_STORE, 'readwrite')
    const store = tx.objectStore(GROUPS_STORE)

    const existing = await store.get(id)
    if (!existing) {
      throw new Error(`Group ${id} not found`)
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    }

    await store.put(updated)
    await tx.done
  }

  async deleteGroup(id: string): Promise<void> {
    const db = await this.init()

    // Get the group
    const group = await db.get(GROUPS_STORE, id)
    if (!group) {
      throw new Error(`Group ${id} not found`)
    }

    // Delete the group
    await db.delete(GROUPS_STORE, id)
  }

  async addConversationToGroup(groupId: string, conversationId: string): Promise<void> {
    const db = await this.init()
    const group = await db.get(GROUPS_STORE, groupId)
    if (!group) {
      throw new Error(`Group ${groupId} not found`)
    }

    if (!group.conversationIds.includes(conversationId)) {
      group.conversationIds.push(conversationId)
      group.updatedAt = Date.now()
      await db.put(GROUPS_STORE, group)
    }
  }

  async removeConversationFromGroup(groupId: string, conversationId: string): Promise<void> {
    const db = await this.init()
    const group = await db.get(GROUPS_STORE, groupId)
    if (!group) {
      throw new Error(`Group ${groupId} not found`)
    }

    group.conversationIds = group.conversationIds.filter(id => id !== conversationId)
    group.updatedAt = Date.now()
    await db.put(GROUPS_STORE, group)
  }

  async getConversationsByGroup(groupId: string): Promise<Conversation[]> {
    const group = await this.getGroup(groupId)
    if (!group) return []

    const db = await this.init()
    const conversations: Conversation[] = []

    for (const convId of group.conversationIds) {
      const conv = await db.get(CONVERSATIONS_STORE, convId)
      if (conv) {
        conversations.push(conv)
      }
    }

    return conversations
  }

  async getGroupByConversation(conversationId: string): Promise<Group | undefined> {
    const db = await this.init()
    const groups = await db.getAll(GROUPS_STORE)

    for (const group of groups) {
      if (group.conversationIds.includes(conversationId)) {
        return group
      }
    }

    return undefined
  }
}

export const dbService = new IndexedDBService()
export type { Conversation, Message, Group }
