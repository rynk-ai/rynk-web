import { cloudDb } from "@/lib/services/cloud-db"
import { cloudStorage } from "@/lib/services/cloud-storage"
import { vectorDb } from "@/lib/services/vector-db" // Import vectorDb
import { getAIProvider } from "@/lib/services/ai-factory"
import { type Message as ApiMessage } from "@/lib/services/ai-provider"
import { searchEmbeddings } from "@/lib/utils/vector"
import { 
  isTextFile, 
  isCodeFile, 
  isDataFile,
  isPDFFile,
  isOfficeDocument,
  formatFileSize,
} from '@/lib/utils/file-converter'
import { getFileExtension } from '@/lib/constants/file-config'
import { fetchAndExtractText, formatFileContent, generateFileMetadata } from '@/lib/utils/file-processor'

export class ChatService {
  async handleChatRequest(
    userId: string,
    conversationId: string,
    userMessageContent?: string,
    userMessageId?: string,
    attachments: any[] = [],
    referencedConversations: any[] = [],
    referencedFolders: any[] = [],
    providedUserMessageId?: string | null,
    providedAssistantMessageId?: string | null
  ) {
    console.log('🚀 [chatService.handleChatRequest] Starting:', {
      userId,
      conversationId,
      isEditFlow: !!userMessageId,
      hasNewContent: !!userMessageContent,
      userMessageId,
      providedUserMessageId,
      providedAssistantMessageId
    });

    // 1. Check credits
    const credits = await cloudDb.getUserCredits(userId)
    if (credits <= 0) {
      throw new Error("Insufficient credits")
    }

    let userMessage: any
    let messageContent: string
    let messageRefs: any = { referencedConversations, referencedFolders }

    // 2. Get or Create User Message
    if (userMessageId) {
      // Edit flow: Use existing message
      console.log('📥 [chatService] Edit flow - fetching message:', userMessageId);
      userMessage = await cloudDb.getMessage(userMessageId)
      if (!userMessage) {
        throw new Error(`User message ${userMessageId} not found`)
      }
      console.log('✅ [chatService] Message fetched:', {
        id: userMessage.id,
        content: userMessage.content.substring(0, 100) + '...',
        contentLength: userMessage.content.length
      });
      messageContent = userMessage.content
      // Use message's stored references for RAG context
      messageRefs = {
        referencedConversations: userMessage.referencedConversations || [],
        referencedFolders: userMessage.referencedFolders || []
      }
    } else {
      // Normal flow: Create new user message
      console.log('📝 [chatService] Normal flow - creating new message');
      if (!userMessageContent) {
        throw new Error("Either userMessageContent or userMessageId must be provided")
      }
      userMessage = await cloudDb.addMessage(conversationId, {
        id: providedUserMessageId || undefined,
        role: 'user',
        content: userMessageContent,
        attachments,
        referencedConversations,
        referencedFolders
      })
      messageContent = userMessageContent
      console.log('✅ [chatService] Message created:', {
        id: userMessage.id,
        contentLength: messageContent.length
      });
    }

    // 3. Deduct credit
    await cloudDb.updateCredits(userId, -1)

    // 4. Fetch conversation and project (if exists)
    const conversation = await cloudDb.getConversation(conversationId)
    let project = null
    if (conversation?.projectId) {
      project = await cloudDb.getProject(conversation.projectId)
      console.log('📁 [chatService] Project fetched:', {
        projectId: conversation.projectId,
        hasInstructions: !!project?.instructions,
        hasAttachments: !!project?.attachments?.length
      })
    }

    // 5. Generate Embedding for User Message (Background)
    // This is now critical for Global Knowledge Base (Project Memory & Long-Term Memory)
    // We await this to ensure it completes in serverless environment
    await this.generateEmbeddingInBackground(userMessage.id, conversationId, userId, messageContent)

    // 5. Ingest Attachments into Knowledge Base (Legacy)
    // This is now handled by the frontend via /api/knowledge-base/ingest
    // We keep this block empty or remove it entirely.
    // The frontend sends 'processed: true' in attachment metadata if it handled it.
    
    // However, we might still want to handle text files or other types if not processed by frontend?
    // For now, let's assume frontend handles everything or we add it there.
    // But to be safe, we can check if 'processed' flag is missing.
    
    if (attachments.length > 0) {
      const { knowledgeBase } = await import('@/lib/services/knowledge-base')
      
      for (const att of attachments) {
        // Skip if already processed by frontend pipeline
        if (att.processed) continue
        
        try {
           if (this.isTextBasedFile(att) && att.content) {
             console.log('📚 [chatService] Ingesting legacy text file:', att.name)
               await knowledgeBase.addSource(conversationId, {
                  type: 'text',
                  name: att.name,
                  content: att.content,
                  metadata: { fileType: att.type }
               }, userMessage.id)
           }
        } catch (error) {
          console.error('❌ [chatService] Failed to ingest legacy attachment:', att.name, error)
        }
      }
    }

    // 7. Retrieve Context from Knowledge Base
    console.log('🔍 [chatService] Retrieving context from Knowledge Base...');
    const { knowledgeBase } = await import('@/lib/services/knowledge-base')
    let kbContext = ''
    
    try {
      kbContext = await knowledgeBase.getContext(
        conversationId, 
        messageContent,
        undefined, // targetMessageId
        project?.id // Pass project ID for project-wide context
      )
    } catch (error) {
      console.error('❌ [chatService] Failed to retrieve Knowledge Base context:', error)
      // Continue without KB context rather than failing the entire request
    }
    
    // Legacy context build (for referenced conversations/folders passed explicitly)
    // We can merge this or replace it. The new architecture suggests everything should be a source.
    // But for now, let's keep the legacy "referenced conversations" logic as a fallback or parallel context
    // UNLESS we migrate them to sources too.
    // Let's append the KB context to the legacy context logic for safety during migration.
    
    const legacyContext = await this.buildContext(
      userId,
      conversationId,
      messageContent,
      messageRefs.referencedConversations,
      messageRefs.referencedFolders,
      project?.id // Pass projectId
    )
    
    const finalContext = `${legacyContext}\n\n${kbContext ? `=== RELEVANT KNOWLEDGE BASE CONTEXT ===\n${kbContext}` : ''}`.trim()
    
    console.log('✅ [chatService] Final context length:', finalContext.length);

    // 8. Prepare Messages for AI
    console.log('📤 [chatService] Preparing messages for AI...');
    const messages = await this.prepareMessagesForAI(conversationId, finalContext, project)

    // 9. Determine if we have files (for AI provider selection)
    const hasFiles = this.hasFilesInConversation(messages, project, attachments)
    console.log('📎 [chatService] Has files:', hasFiles);

    // 10. Get AI provider based on content type
    const aiProvider = getAIProvider(hasFiles)
    console.log('🤖 [chatService] Using AI provider:', hasFiles ? 'OpenRouter (multimodal)' : 'Groq (text-only)');

    // 11. Create assistant message placeholder
    const assistantMessage = await cloudDb.addMessage(conversationId, {
      id: providedAssistantMessageId || undefined,
      role: 'assistant',
      content: '', // Will be filled by streaming
      attachments: [],
    })
    console.log('✅ [chatService] Assistant message created:', assistantMessage.id);

    // 12. Stream AI response
    console.log('🚀 [chatService] Starting AI stream...');
    const stream = aiProvider.sendMessage({ messages })

    // 13. Return streaming response
    return this.createStreamResponse(
      stream,
      assistantMessage.id,
      conversationId,
      userId,
      userMessage.id,
      [] // No progress updates for now
    )
  }

  private async buildContext(
    userId: string,
    currentConversationId: string,
    query: string,
    referencedConversations: any[],
    referencedFolders: any[],
    projectId?: string,
    onProgress?: (message: string) => void
  ) {
    let contextText = ''
    
    // --- 1. RECENT CONTEXT (Standard) ---
    // We still inject the recent conversation history directly via `prepareMessagesForAI` (last 1000 msgs).
    // So `buildContext` is primarily for RETRIEVED context (RAG).

    if (!query.trim()) return ''

    try {
      const aiProvider = getAIProvider();
      const queryVector = await aiProvider.getEmbeddings(query);
      
      const retrievedChunks: { content: string, source: string, score: number }[] = [];

      // --- SCOPE 1: CURRENT CONVERSATION (Long-Term Memory) ---
      // Always search current chat for forgotten details
      const longTermMemories = await vectorDb.searchConversationMemory(currentConversationId, queryVector, { limit: 5, minScore: 0.5 });
      longTermMemories.forEach(m => {
        retrievedChunks.push({
          content: m.content,
          source: 'Current Conversation (Past)',
          score: m.score
        });
      });

      // --- SCOPE 2: PROJECT MEMORY (Implicit) ---
      if (projectId) {
        console.log('🧠 [buildContext] Project Mode: Searching Project Memory');
        const projectMemories = await vectorDb.searchProjectMemory(projectId, queryVector, { 
          limit: 10, 
          minScore: 0.5,
          excludeConversationId: currentConversationId 
        });
        
        // Fetch conversation titles for better context
        if (projectMemories.length > 0) {
          const convIds = Array.from(new Set(projectMemories.map(m => m.conversationId)));
          const conversations = await cloudDb.getConversationsBatch(convIds);
          const convMap = new Map(conversations.map(c => [c.id, c.title]));
          
          projectMemories.forEach(m => {
            const title = convMap.get(m.conversationId) || 'Unknown Chat';
            retrievedChunks.push({
              content: m.content,
              source: `Project Chat: "${title}"`,
              score: m.score
            });
          });
        }
      }

      // --- SCOPE 3: REFERENCED CONTEXT (Explicit) ---
      // Only if NOT in project mode (or if user explicitly references something outside project)
      if (referencedConversations.length > 0) {
        console.log('🧠 [buildContext] Normal Mode: Searching Referenced Context');
        
        for (const ref of referencedConversations) {
          // A. Search Messages in Referenced Chat
          const refMemories = await vectorDb.searchConversationMemory(ref.id, queryVector, { limit: 5 });
          refMemories.forEach(m => {
            retrievedChunks.push({
              content: m.content,
              source: `Referenced Chat: "${ref.title}"`,
              score: m.score
            });
          });

          // B. Search Files in Referenced Chat (Transitive Knowledge)
          const sources = await vectorDb.getSourcesForConversation(ref.id);
          const sourceIds = sources.map(s => s.sourceId);
          
          if (sourceIds.length > 0) {
            const fileChunks = await vectorDb.searchKnowledgeBase(sourceIds, queryVector, { limit: 5 });
            fileChunks.forEach(c => {
              retrievedChunks.push({
                content: c.content,
                source: `File in "${ref.title}"`,
                score: c.score
              });
            });
          }
        }
      }

      // --- DEDUPLICATE & RANK ---
      // Sort by score
      retrievedChunks.sort((a, b) => b.score - a.score);
      
      // Take top 15 chunks
      const topChunks = retrievedChunks.slice(0, 15);
      
      if (topChunks.length > 0) {
        contextText += `\n=== RELEVANT RETRIEVED CONTEXT ===\n`;
        contextText += `The following information was retrieved from your knowledge base (past chats, project memory, or files) to help answer the request:\n\n`;
        
        topChunks.forEach(chunk => {
          contextText += `--- [Source: ${chunk.source}] ---\n${chunk.content}\n\n`;
        });
        
        contextText += `=== END OF RETRIEVED CONTEXT ===\n`;
      }

    } catch (err) {
      console.error('❌ [buildContext] Error in Unified RAG:', err);
    }

    return contextText
  }

  private async prepareMessagesForAI(conversationId: string, contextText: string, project: any = null): Promise<ApiMessage[]> {
    console.log('📋 [prepareMessagesForAI] Fetching messages for conversation:', conversationId);
    // Fetch up to 1000 messages for AI context (should be enough for most cases)
    const { messages } = await cloudDb.getMessages(conversationId, 1000)
    console.log('📋 [prepareMessagesForAI] Messages retrieved:', {
      count: messages.length,
      messageIds: messages.map(m => m.id),
      userMessages: messages.filter(m => m.role === 'user').map(m => ({
        id: m.id,
        contentPreview: m.content.substring(0, 50) + '...',
        contentLength: m.content.length
      }))
    });
    
    const apiMessages: ApiMessage[] = []

    // 1. Add Project Instructions as first system message (if exists)
    if (project?.instructions) {
      console.log('📁 [prepareMessagesForAI] Adding project instructions');
      apiMessages.push({
        role: 'system',
        content: project.instructions
      })
    }

    // 2. Add Context from Knowledge Base & References
    if (contextText) {
      apiMessages.push({
        role: 'system',
        content: `Use the following context to answer the user's request. The context may contain extracted content from uploaded files (PDFs, docs) or previous conversation history:\n\n${contextText}`
      })
    }

    // 3. Add Project Attachments as USER message (images only)
    // PDFs are now handled via RAG (Knowledge Base), so we only inject images here for visual context
    if (project?.attachments && project.attachments.length > 0) {
      console.log('📁 [prepareMessagesForAI] Project has attachments (PDFs handled via KB)');
      
      const imageAttachments = project.attachments.filter((att: any) => att.type?.startsWith('image/'))
      
      if (imageAttachments.length > 0) {
        const content: any[] = [
          { type: 'text', text: 'These are the project context images for reference:' }
        ]
        
        for (const att of imageAttachments) {
          try {
            // Try to convert to base64 for reliable access
            const base64Url = await this.fetchImageAsBase64(att.url)
            console.log('📎 [prepareMessagesForAI] Converted to base64:', { original: att.url, success: !!base64Url });
            
            content.push({
              type: 'image_url',
              image_url: { url: base64Url || att.url } // Fallback to URL if base64 fails
            })
          } catch (e) {
            console.error('Failed to convert project image to base64:', e)
            // Fallback to absolute URL
            content.push({
              type: 'image_url',
              image_url: { url: this.toAbsoluteUrl(att.url) }
            })
          }
        }
        
        // Add as USER message (images don't work in system messages)
        apiMessages.push({ role: 'user', content })
        
        // Add assistant acknowledgment so it doesn't respond to the files
        apiMessages.push({ 
          role: 'assistant', 
          content: 'I can see the project context images. I\'ll use them as reference for our conversation.' 
        })
      }
    }

    // 4. Convert DB messages to API messages
    for (const m of messages) {
      if (m.attachments && m.attachments.length > 0) {
        // Handle multimodal content
        const content: any[] = [{ type: 'text', text: m.content }]
        
        // Process each attachment based on its type
        for (const att of m.attachments) {
          console.log('📎 [prepareMessagesForAI] Processing attachment:', {
            name: att.name,
            type: att.type,
            size: att.size
          });
          
          try {
            // IMAGES: Convert to base64 and send as image_url
            if (att.type?.startsWith('image/')) {
              const base64Url = await this.fetchImageAsBase64(att.url)
              content.push({
                type: 'image_url',
                image_url: { url: base64Url || this.toAbsoluteUrl(att.url) }
              })
              console.log('✅ [prepareMessagesForAI] Image processed:', att.name);
            }
            // PDFs: Use processed data (text or images)
            else if (att.type === 'application/pdf' || getFileExtension(att.name) === '.pdf') {
              console.log('📄 [prepareMessagesForAI] PDF detected:', att.name);
              
              // Priority 0: Use RAG (Context already injected in system message)
              if (att.useRAG) {
                console.log('🔍 [prepareMessagesForAI] PDF uses RAG. Context should be in system message.');
                
                // We don't need to inject chunks here again if they are in contextText.
                // Just add a marker that the file is available.
                content.push({
                  type: 'text',
                  text: `📄 **PDF: ${att.name}**\n*(Content provided in system context)*`
                })
              }
              // Priority 1: Use extracted text content (legacy/small files)
              else if (att.extractedContent) {
                console.log('✅ [prepareMessagesForAI] Using extracted text, length:', att.extractedContent.length);
                content.push({
                  type: 'text',
                  text: `📄 **PDF: ${att.name}**\n\n${att.extractedContent}`
                })
              }
              // Priority 2: Use fallback images (REUSE image_url logic!)
              else if (att.fallbackImages && att.fallbackImages.length > 0) {
                console.log('✅ [prepareMessagesForAI] Using fallback images, count:', att.fallbackImages.length);
                att.fallbackImages.forEach((base64Url: string, index: number) => {
                  content.push({
                    type: 'image_url',
                    image_url: { url: base64Url }
                  })
                  console.log(`   📸 Added page ${index + 1}`);
                })
              }
              // Priority 3: Metadata only (legacy or processing failed)
              else {
                console.log('⚠️ [prepareMessagesForAI] No processed data, using metadata only');
                content.push({
                  type: 'text',
                  text: `📄 **PDF Document**: ${att.name}\n*(${att.size ? formatFileSize(att.size) : 'size unknown'})*\n\n*Note: PDF content could not be extracted. This may be an encrypted or corrupted file.*`
                })
              }
            }
            // TEXT/CODE/DATA FILES: Extract content
            else if (this.isTextBasedFile(att)) {
              console.log('📝 [prepareMessagesForAI] Text-based file, extracting content:', att.name);
              const textContent = await fetchAndExtractText(att.url, att.name)
              const formattedContent = this.formatTextFileContent(att.name, att.type, textContent)
              content.push({
                type: 'text',
                text: formattedContent
              })
              console.log('✅ [prepareMessagesForAI] Text file processed:', att.name, `(${textContent.length} chars)`);
            }
            // OFFICE DOCUMENTS: Provide metadata only
            else if (isOfficeDocument({ type: att.type } as File)) {
              console.log('📑 [prepareMessagesForAI] Office document, providing metadata:', att.name);
              content.push({
                type: 'text',
                text: generateFileMetadata(att)
              })
            }
            // OTHER FILES: Provide metadata
            else {
              console.log('📎 [prepareMessagesForAI] Unknown file type, providing metadata:', att.name);
              content.push({
                type: 'text',
                text: `📎 **Attachment**: ${att.name}\n**Type**: ${att.type || 'unknown'}\n**Size**: ${att.size ? formatFileSize(att.size) : 'unknown'}`
              })
            }
          } catch (e) {
            console.error('❌ [prepareMessagesForAI] Failed to process attachment:', att.name, e);
            // Fallback: provide basic metadata
            content.push({
              type: 'text',
              text: `⚠️ **Attachment** (processing failed): ${att.name}`
            })
          }
        }
        
        apiMessages.push({ role: m.role, content })
      } else {
        apiMessages.push({ role: m.role, content: m.content })
      }
    }

    console.log('📤 [prepareMessagesForAI] Final messages for AI:', {
      count: apiMessages.length,
      roles: apiMessages.map(m => m.role),
      hasProjectInstructions: !!project?.instructions,
      hasProjectAttachments: !!project?.attachments?.length,
      lastUserMessage: apiMessages.filter(m => m.role === 'user').slice(-1)[0]
    });

    return apiMessages
  }

  /**
   * Fetch image from R2 and convert to base64 data URL
   */
  private async fetchImageAsBase64(url: string): Promise<string | null> {
    try {
      // Extract key from URL
      let key = url
      
      // Handle /api/files/KEY
      if (url.includes('/api/files/')) {
        key = url.split('/api/files/')[1]
      } 
      // Handle R2 public URL
      else if (url.startsWith('http')) {
        const urlObj = new URL(url)
        // Key is the pathname without leading slash
        key = urlObj.pathname.substring(1)
      }

      // Decode URI component in case of spaces/special chars
      key = decodeURIComponent(key)
      
      console.log('🔍 [fetchImageAsBase64] Fetching key:', key)
      const object = await cloudStorage.getFile(key)
      
      if (!object) {
        console.warn('⚠️ [fetchImageAsBase64] File not found in R2:', key)
        return null
      }

      const buffer = await object.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mimeType = object.httpMetadata?.contentType || 'image/png' // Default to png if unknown
      
      return `data:${mimeType};base64,${base64}`
    } catch (error) {
      console.error('❌ [fetchImageAsBase64] Error:', error)
      return null
    }
  }

  /**
   * Check if attachment is a text-based file that can be read
   */
  private isTextBasedFile(att: { type?: string; name: string }): boolean {
    // Create a mock File object for type checking
    const mockFile = { type: att.type || '', name: att.name } as File
    return isTextFile(mockFile) || isCodeFile(mockFile) || isDataFile(mockFile)
  }

  /**
   * Format text file content for AI consumption
   */
  private formatTextFileContent(filename: string, mimeType: string | undefined, content: string): string {
    const ext = getFileExtension(filename)
    
    // Code files - wrap in code block with language
    if (mimeType && (isCodeFile({ type: mimeType, name: filename } as File) || ext.match(/\.(js|ts|py|java|cpp|c|go|rs|rb|php|html|css|sql|sh)/))) {
      const languageMap: Record<string, string> = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.go': 'go',
        '.rs': 'rust',
        '.rb': 'ruby',
        '.php': 'php',
        '.html': 'html',
        '.css': 'css',
        '.sql': 'sql',
        '.sh': 'bash',
      }
      
      const language = languageMap[ext] || ''
      return `**File: ${filename}**\n\`\`\`${language}\n${content}\n\`\`\``
    }
    
    // Data files - format based on type
    if (ext === '.json') {
      try {
        const parsed = JSON.parse(content)
        const formatted = JSON.stringify(parsed, null, 2)
        return `**File: ${filename}** (JSON)\n\`\`\`json\n${formatted}\n\`\`\``
      } catch {
        return `**File: ${filename}**\n\`\`\`\n${content}\n\`\`\``
      }
    }
    
    if (ext === '.csv') {
      return `**File: ${filename}** (CSV)\n\`\`\`csv\n${content}\n\`\`\``
    }
    
    if (ext === '.xml') {
      return `**File: ${filename}** (XML)\n\`\`\`xml\n${content}\n\`\`\``
    }
    
    // Markdown files - render as markdown
    if (ext === '.md' || ext === '.markdown') {
      return `**File: ${filename}** (Markdown)\n\n${content}`
    }
    
    // Other text files
    return `**File: ${filename}**\n\`\`\`\n${content}\n\`\`\``
  }

  /**
   * Check if the conversation has any files/attachments that require multimodal support
   * Returns true if images, PDFs, or any non-text-based files are present
   */
  private hasFilesInConversation(messages: ApiMessage[], project: any = null, rawAttachments: any[] = []): boolean {
    // Check raw attachments first (before they're processed into messages)
    // This catches PDFs with RAG processing which may not have image_url content
    if (rawAttachments && rawAttachments.length > 0) {
      const hasPDFsOrImages = rawAttachments.some((att: any) => {
        // Check for PDFs (both RAG and non-RAG)
        if (att.type === 'application/pdf' || att.name?.endsWith('.pdf')) {
          return true
        }
        // Check for images
        if (att.type?.startsWith('image/')) {
          return true
        }
        // Check for RAG processed files
        if (att.useRAG) {
          return true
        }
        return false
      })
      if (hasPDFsOrImages) {
        console.log('✅ [hasFilesInConversation] Found PDF/RAG/Image in raw attachments')
        return true
      }
    }

    // Check project attachments (images specifically, as they're processed as multimodal)
    if (project?.attachments && project.attachments.length > 0) {
      const hasProjectImages = project.attachments.some((att: any) => att.type?.startsWith('image/'))
      if (hasProjectImages) return true
    }

    // Check message attachments in the prepared messages
    for (const msg of messages) {
      // Skip system messages (they don't have user attachments)
      if (msg.role === 'system') continue

      // Check if message has multimodal content (array format indicates files)
      // This includes images (image_url), PDFs (text with PDF content), etc.
      if (Array.isArray(msg.content) && msg.content.length > 1) {
        // Array content with more than just text indicates files are present
        console.log('✅ [hasFilesInConversation] Found multimodal content in message history')
        return true
      }
    }

    return false
  }



  private createStreamResponse(
    stream: AsyncGenerator<string, void, unknown>,
    assistantMessageId: string,
    conversationId: string,
    userId: string,
    userMessageId: string,
    progressUpdates: string[] = []
  ) {
    const encoder = new TextEncoder()
    let fullResponse = ''

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          // STEP 1: Stream progress updates first
          for (const update of progressUpdates) {
            controller.enqueue(encoder.encode(update))
          }
          
          // STEP 2: Stream AI response
          for await (const chunk of stream) {
            fullResponse += chunk
            controller.enqueue(encoder.encode(chunk))
          }
          
          // Stream finished, save full response
          await cloudDb.updateMessage(assistantMessageId, { content: fullResponse })
          
          // Generate embedding for assistant response
          // We await this to ensure it completes before the stream closes in serverless environments
          const service = new ChatService()
          await service.generateEmbeddingInBackground(assistantMessageId, conversationId, userId, fullResponse)

          controller.close()
        } catch (err) {
          controller.error(err)
        }
      }
    })

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-User-Message-Id': userMessageId,
        'X-Assistant-Message-Id': assistantMessageId
      }
    })
  }
  private async generateEmbeddingInBackground(messageId: string, conversationId: string, userId: string, content: string) {
    try {
      if (!content || !content.trim()) return
      
      // Check if embedding already exists for this message
      // Note: We might want to re-generate if content changed, but for now skip if exists
      // const existingEmbedding = await cloudDb.getEmbeddingByMessageId(messageId)
      // if (existingEmbedding) {
      //   console.log('⏭️ Skipping embedding generation - already exists for message:', messageId)
      //   return
      // }
      
      const aiProvider = getAIProvider()
      const vector = await aiProvider.getEmbeddings(content)
      
      // Store in Vectorize (Global Knowledge Base)
      // We need to fetch the conversation to get the projectId (if any)
      const conversation = await cloudDb.getConversation(conversationId)
      
      await vectorDb.upsertMessageMemory(
        messageId, 
        conversationId, 
        content, 
        vector,
        conversation?.projectId // Optional
      )
      
      console.log('✅ [chatService] Vectorized message:', messageId)
    } catch (error) {
      console.error('Failed to generate embedding in background:', error)
    }
  }

  /**
   * Convert relative URLs to absolute URLs for external API access
   * OpenRouter needs absolute URLs to fetch images
   */
  private toAbsoluteUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url // Already absolute
    }
    
    // Get base URL from environment or use default
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:8788'
    
    // Remove leading slash if present to avoid double slashes
    const path = url.startsWith('/') ? url : `/${url}`
    return `${baseUrl}${path}`
  }
}

export const chatService = new ChatService()
