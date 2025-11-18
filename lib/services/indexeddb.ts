import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Message structure
interface Message {
  id: string              // Unique message ID
  conversationId: string  // Which conversation this belongs to
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: File[]
  timestamp: number
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
}

const DB_NAME = 'simplechat-db'
const DB_VERSION = 5  // Increment for new schema
const MESSAGES_STORE = 'messages'
const CONVERSATIONS_STORE = 'conversations'

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

        // Migration from v4 to v5: remove versioning and paths store
        if (oldVersion < 5) {
          console.log('🔄 Migrating to simplified schema...')
          // Migration will be handled in migrate() method
        }
      },
    })

    await this.migrate(db)
    return db
  }

  private async migrate(db: IDBPDatabase<ChatDB>) {
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')
    const store = tx.objectStore(CONVERSATIONS_STORE)
    const messagesStore = tx.objectStore(MESSAGES_STORE)

    try {
      // Get all conversations
      const conversations = await store.getAll()

      for (const conv of conversations) {
        // Check if this is old schema (has messages array, no path)
        if ((conv as any).messages && !conv.path) {
          console.log('📦 Migrating conversation:', conv.id)

          // Convert old messages to new schema
          const oldMessages: any[] = (conv as any).messages
          const newPath: string[] = []

          for (let i = 0; i < oldMessages.length; i++) {
            const oldMsg = oldMessages[i]

            // Create new message
            const newMessage: Message = {
              id: oldMsg.id || crypto.randomUUID(),
              conversationId: conv.id,
              role: oldMsg.role,
              content: oldMsg.content,
              attachments: oldMsg.attachments,
              timestamp: oldMsg.timestamp || Date.now(),
            }

            await messagesStore.put(newMessage)
            newPath.push(newMessage.id)
          }

          // Update conversation with new schema
          conv.path = newPath
          ;(conv as any).messages = undefined // Remove old field
          await store.put(conv)

          console.log('✅ Migrated conversation:', conv.id, 'with', newPath.length, 'messages')
        }

        // Remove branching fields from conversation
        if ((conv as any).parentId || (conv as any).branchFromMessageId || (conv as any).branchFromConversationId || (conv as any).branchVersion) {
          delete (conv as any).parentId
          delete (conv as any).branchFromMessageId
          delete (conv as any).branchFromConversationId
          delete (conv as any).branchVersion
          await store.put(conv)
        }
      }

      // Get all messages and remove versioning fields
      const messages = await messagesStore.getAll()
      for (const msg of messages) {
        let updated = false
        if ((msg as any).chainVersion !== undefined) {
          delete (msg as any).chainVersion
          updated = true
        }
        if ((msg as any).parentMessageId !== undefined) {
          delete (msg as any).parentMessageId
          updated = true
        }
        if (updated) {
          await messagesStore.put(msg)
        }
      }

      await tx.done
      console.log('✅ Migration complete')
    } catch (err) {
      await tx.done
      console.error('❌ Migration failed:', err)
      throw err
    }
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
}

export const dbService = new IndexedDBService()
export type { Conversation, Message }
