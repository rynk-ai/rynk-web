/**
 * Onboarding Service
 * 
 * Creates an onboarding conversation for new users with pre-populated
 * back-and-forth messages explaining Rynk's features.
 */

import { ONBOARDING_MESSAGES, ONBOARDING_CONVERSATION_TITLE } from './onboarding-content'

/**
 * Creates an onboarding conversation for a new user.
 * This function is called from the NextAuth createUser event.
 * 
 * @param db - D1 database binding
 * @param userId - The new user's ID
 */
export async function createOnboardingConversation(db: any, userId: string): Promise<void> {
  try {
    console.log('🚀 [Onboarding] Creating onboarding conversation for user:', userId)
    
    // 1. Create the conversation
    const conversationId = crypto.randomUUID()
    const now = Date.now()
    const path: string[] = []
    
    await db.prepare(
      'INSERT INTO conversations (id, userId, projectId, title, path, tags, isPinned, branches, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      conversationId,
      userId,
      null, // no project
      ONBOARDING_CONVERSATION_TITLE,
      '[]', // path will be updated as we add messages
      '[]', // no tags
      1,    // isPinned = true so it appears at top
      '[]', // no branches
      now,
      now
    ).run()
    
    console.log('📝 [Onboarding] Created conversation:', conversationId)
    
    // 2. Add messages with incrementing timestamps for proper ordering
    const messageIds: string[] = []
    let timestamp = now
    
    for (const msg of ONBOARDING_MESSAGES) {
      const messageId = crypto.randomUUID()
      messageIds.push(messageId)
      timestamp += 100 // Increment by 100ms for each message to ensure ordering
      
      await db.prepare(
        `INSERT INTO messages (id, conversationId, role, content, attachments, referencedConversations, referencedFolders, timestamp, createdAt, versionNumber, branchId, reasoning_content, reasoning_metadata, web_annotations, model_used) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        messageId,
        conversationId,
        msg.role,
        msg.content,
        '[]', // no attachments
        '[]', // no referenced conversations
        '[]', // no referenced folders
        timestamp,
        timestamp,
        1,    // version 1
        null, // no branch
        null, // no reasoning content
        null, // no reasoning metadata
        null, // no web annotations
        null  // no model used
      ).run()
    }
    
    // 3. Update conversation path with all message IDs
    await db.prepare(
      'UPDATE conversations SET path = ?, updatedAt = ? WHERE id = ?'
    ).bind(
      JSON.stringify(messageIds),
      timestamp,
      conversationId
    ).run()
    
    console.log('✅ [Onboarding] Successfully created onboarding conversation with', messageIds.length, 'messages')
    
  } catch (error) {
    // Log error but don't throw - onboarding failure shouldn't block user creation
    console.error('❌ [Onboarding] Failed to create onboarding conversation:', error)
  }
}
