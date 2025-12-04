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
    providedAssistantMessageId?: string | null,
    useReasoning: 'auto' | 'on' | 'online' | 'off' = 'auto'
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
    console.log('💬 [chatService] Conversation loaded:', {
      conversationId,
      hasProjectId: !!conversation?.projectId,
      projectId: conversation?.projectId
    })
    
    let project = null
    if (conversation?.projectId) {
      project = await cloudDb.getProject(conversation.projectId)
      console.log('📁 [chatService] Project fetched:', {
        projectId: conversation.projectId,
        projectName: project?.name,
        hasInstructions: !!project?.instructions,
        hasAttachments: !!project?.attachments?.length
      })
    } else {
      console.log('ℹ️ [chatService] No project associated with this conversation')
    }

    // 5. Generate Embedding for User Message (Background)
    // Fire-and-forget to avoid blocking the response
    this.generateEmbeddingInBackground(
      userMessage.id, 
      conversationId, 
      userId, 
      messageContent,
      project?.id  // Pass projectId directly (from line 96-103)
    ).catch(err => console.error('❌ [chatService] User message vectorization failed:', err))

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

    // 9. Reasoning Detection & Web Search Orchestration
    let reasoningDetection = null
    let shouldUseReasoning = false
    let shouldUseWebSearch = false
    let selectedModel = ''
    let searchResults: any = null
    
    if (userMessageContent && useReasoning !== 'off') {
      const { detectReasoning, resolveReasoningMode, getReasoningModel } = await import('./reasoning-detector')
      
      // Detect reasoning needs
      console.log('🧠 [chatService] Detecting reasoning needs...')
      reasoningDetection = await detectReasoning(messageContent)
      console.log('🧠 [chatService] Reasoning detection:', {
        needsReasoning: reasoningDetection.needsReasoning,
        needsWebSearch: reasoningDetection.needsWebSearch,
        confidence: reasoningDetection.confidence,
        types: reasoningDetection.detectedTypes
      })
      
      // Resolve mode based on user preference and detection
      const resolved = resolveReasoningMode(useReasoning, reasoningDetection)
      shouldUseReasoning = resolved.useReasoning
      shouldUseWebSearch = resolved.useWebSearch
      
      // Get the appropriate model (no longer using :online suffix)
      selectedModel = getReasoningModel(shouldUseReasoning, false) // Always false for online
      
      // If web search is needed, use search orchestrator
      if (shouldUseWebSearch) {
        console.log('🌐 [chatService] Performing web search...')
        const { orchestrateSearch } = await import('./search-orchestrator')
        searchResults = await orchestrateSearch(messageContent)
        console.log('🌐 [chatService] Search complete:', {
          strategy: searchResults.searchStrategy,
          totalResults: searchResults.totalResults,
          hasSynthesis: !!searchResults.synthesizedResponse
        })
      }
      
      console.log('🤖 [chatService] Reasoning mode:', {
        userMode: useReasoning,
        shouldUseReasoning,
        shouldUseWebSearch,
        selectedModel,
        hasSearchResults: !!searchResults
      })
    }

    // 10. Determine if we have files (for AI provider selection)
    const hasFiles = this.hasFilesInConversation(messages, project, attachments)
    console.log('📎 [chatService] Has files:', hasFiles);

    // 11. Get AI provider based on content type and reasoning needs
    // If reasoning is needed, we'll use OpenRouter with the selected model
    // Otherwise, use the standard provider selection
    const aiProvider = (shouldUseReasoning || hasFiles) 
      ? getAIProvider(true)  // Use OpenRouter for reasoning or files
      : getAIProvider(false) // Use Groq for simple text
    
    console.log('🤖 [chatService] Using AI provider:', 
      shouldUseReasoning 
        ? `OpenRouter (${selectedModel})` 
        : (hasFiles ? 'OpenRouter (multimodal)' : 'Groq (text-only)'));

    // 11. Create assistant message placeholder
    const assistantMessage = await cloudDb.addMessage(conversationId, {
      id: providedAssistantMessageId || undefined,
      role: 'assistant',
      content: '', // Will be filled by streaming
      attachments: [],
    })
    console.log('✅ [chatService] Assistant message created:', assistantMessage.id);

    // 12. Stream AI response with search context
    console.log('🚀 [chatService] Starting AI stream...')
    
    // Create status update stream
    const statusUpdates: string[] = []
    if (shouldUseReasoning || shouldUseWebSearch) {
      statusUpdates.push(JSON.stringify({ type: 'status', status: 'analyzing', message: 'Analyzing request...', timestamp: Date.now() }) + '\n')
      
      if (shouldUseWebSearch) {
        // First: status update that search started
        statusUpdates.push(JSON.stringify({ type: 'status', status: 'searching', message: `Searching ${searchResults?.searchStrategy.join(', ')}...`, timestamp: Date.now() }) + '\n')
        
        // Second: send search results as structured data
        if (searchResults && searchResults.sources.length > 0) {
          statusUpdates.push(JSON.stringify({ 
            type: 'search_results', 
            query: searchResults.query,
            sources: searchResults.sources,
            strategy: searchResults.searchStrategy,
            totalResults: searchResults.totalResults,
            timestamp: Date.now()
          }) + '\n')
        }
      }
      
      statusUpdates.push(JSON.stringify({ type: 'status', status: 'synthesizing', message: 'Synthesizing response...', timestamp: Date.now() }) + '\n')
    }

    // If we have search results, augment the messages with search context
    let finalMessages = messages
    if (searchResults && searchResults.sources.length > 0) {
      // Add search context to the system message or as a separate message
      let searchContext = `\n\n=== WEB SEARCH RESULTS ===\n`
      
      // Add synthesized answer if available (high quality)
      if (searchResults.synthesizedResponse) {
        searchContext += `Summary: ${searchResults.synthesizedResponse}\n\n`
      }
      
      // Add sources
      searchContext += `Sources:\n${searchResults.sources.slice(0, 5).map((s: any, i: number) => 
        `[${i + 1}] ${s.title}\n${s.snippet}\nSource: ${s.url}`
      ).join('\n\n')}`
      
      searchContext += `\n=== END SEARCH RESULTS ===\n\nInstructions: Use the above search results to answer the user's question. Cite sources using [1], [2] format.`
      
      // Find the last message and append search context
      finalMessages = [...messages]
      const lastUserMessage = finalMessages[finalMessages.length - 1]
      if (lastUserMessage.role === 'user') {
        finalMessages[finalMessages.length - 1] = {
          ...lastUserMessage,
          content: typeof lastUserMessage.content === 'string' 
            ? lastUserMessage.content + searchContext
            : lastUserMessage.content // Keep array format for multimodal
        }
      }
    }

    // Pass selected model if reasoning is enabled
    const stream =  aiProvider.sendMessage({ messages: finalMessages })

    // 13. Return streaming response with reasoning metadata
    // Convert status updates to statusPills format
    const statusPills = statusUpdates.map(update => {
      try {
        const parsed = JSON.parse(update.trim())
        if (parsed.type === 'status') {
          return {
            status: parsed.status,
            message: parsed.message,
            timestamp: parsed.timestamp
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
      return null
    }).filter(Boolean)
    
    const reasoningMetadata = shouldUseReasoning || shouldUseWebSearch ? {
      statusPills: statusPills as any,
      searchResults: searchResults || undefined
    } : undefined
    
    console.log('📊 [chatService] Metadata being passed to stream:', {
      shouldUseReasoning,
      shouldUseWebSearch,
      statusPillsCount: statusPills.length,
      hasSearchResults: !!searchResults,
      reasoningMetadata
    })
    
    return this.createStreamResponse(
      stream,
      assistantMessage.id,
      conversationId,
      userId,
      userMessage.id,
      statusUpdates,
      {
        reasoning_metadata: reasoningMetadata,
        model_used: selectedModel || undefined
      }
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
        console.log('🧠 [buildContext] Project Mode: Searching Project Memory', {
          projectId,
          currentConversationId
        });
        const projectMemories = await vectorDb.searchProjectMemory(projectId, queryVector, { 
          limit: 10, 
          minScore: 0.5,
          excludeConversationId: currentConversationId 
        });
        console.log('📊 [buildContext] Project memories found:', projectMemories.length);
        
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
    progressUpdates: string[] = [],
    metadata: {
      reasoning_metadata?: any
      model_used?: string
    } = {}
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
          
          // Stream finished, save full response and metadata
          console.log('💾 [chatService] Saving assistant message:', {
            assistantMessageId,
            contentLength: fullResponse.length,
            hasReasoningMetadata: !!metadata.reasoning_metadata,
            metadata: metadata.reasoning_metadata
          })
          
          await cloudDb.updateMessage(assistantMessageId, { 
            content: fullResponse,
            reasoning_metadata: metadata.reasoning_metadata,
            model_used: metadata.model_used
          })
          
          // Generate embedding for assistant response
      // Fire-and-forget to avoid blocking
      const conversation = await cloudDb.getConversation(conversationId)
      const service = new ChatService()
      service.generateEmbeddingInBackground(
        assistantMessageId, 
        conversationId, 
        userId, 
        fullResponse,
        conversation?.projectId
      ).catch(err => console.error('❌ [chatService] Assistant message vectorization failed:', err))

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
  private async generateEmbeddingInBackground(
    messageId: string, 
    conversationId: string, 
    userId: string, 
    content: string,
    projectId?: string  // Accept projectId directly to avoid DB race condition
  ) {
    try {
      if (!content || !content.trim()) return
      
      const aiProvider = getAIProvider()
      const vector = await aiProvider.getEmbeddings(content)
      
      // Store in Vectorize (Global Knowledge Base)
      // projectId is passed directly from the caller
      await vectorDb.upsertMessageMemory(
        messageId, 
        conversationId, 
        content, 
        vector,
        projectId
      )
      
      console.log('✅ [chatService] Vectorized message:', { messageId, projectId: projectId || 'none' })
    } catch (error) {
      console.error('❌ [chatService] Failed to generate embedding:', error)
      throw error  // Re-throw so caller can log it
    }
  }

  /**
   * AGENTIC REQUEST HANDLER
   * Orchestrates multi-source research with real-time status updates
   * Uses Groq for fast intent analysis, then fetches from multiple sources in parallel
   */
  async handleAgenticRequest(
    userId: string,
    conversationId: string,
    userMessage: string,
    providedUserMessageId?: string,
    providedAssistantMessageId?: string
  ): Promise<Response> {
    const { StatusEmitter } = await import('./agentic/status-emitter')
    const { analyzeIntent } = await import('./agentic/intent-analyzer')
    const { SourceOrchestrator } = await import('./agentic/source-orchestrator')
    const { ResponseSynthesizer } = await import('./agentic/response-synthesizer')
    
    const statusEmitter = new StatusEmitter()
    const orchestrator = new SourceOrchestrator()
    const synthesizer = new ResponseSynthesizer()
    
    // Create user message
    const userMsg = await cloudDb.addMessage(conversationId, {
      id: providedUserMessageId || undefined,
      role: 'user',
      content: userMessage,
      attachments: [],
    })
    
    // Create assistant message placeholder
    const assistantMsg = await cloudDb.addMessage(conversationId, {
      id: providedAssistantMessageId || undefined,
      role: 'assistant',
      content: '',
      attachments: [],
    })
    
    // Fetch recent conversation history for context
    const { messages: recentMessages } = await cloudDb.getMessages(conversationId, 10)
    const history = recentMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))
      .reverse() // getMessages returns newest first, we want chronological order for context

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Quick pattern detection
          statusEmitter.emitStatus(controller, 'analyzing', 'Understanding question...')
          const { quickAnalysis, sourcePlan } = await analyzeIntent(userMessage, history)
          
          console.log('[AgenticRequest] Intent analysis:', {
            category: quickAnalysis.category,
            sources: sourcePlan.sources,
            reasoning: sourcePlan.reasoning
          })
          
          // Step 2: Planning complete
          statusEmitter.emitStatus(controller, 'analyzing', 'Planning research...')
          
          // Step 3: Fetch from sources
          statusEmitter.emitStatus(controller, 'searching', 'Finding sources...')
          const sourceResults = await orchestrator.executeSourcePlan(sourcePlan)
          
          // Step 4: Reading articles
          statusEmitter.emitStatus(controller, 'searching', 'Reading articles...')
          
          // Small delay to show status
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Step 5: Analyzing information
          statusEmitter.emitStatus(controller, 'synthesizing', 'Analyzing information...')
          
          // Step 6: Writing response
          statusEmitter.emitStatus(controller, 'synthesizing', 'Writing response...')
          
          // Synthesize response
          const { content, citations } = await synthesizer.synthesize(
            userMessage,
            sourceResults,
            history
          )
          
          // Emit the content
          statusEmitter.emitContent(controller, content)
          
          // Add citations
          if (citations.length > 0) {
            statusEmitter.emitContent(
              controller,
              '\n\n## Sources\n' + 
              citations.map((c, i) => `${i+1}. [${c.title}](${c.url})`).join('\n')
            )
          }
          
          // Save the full response to database
          const fullContent = content + (citations.length > 0 
            ? '\n\n## Sources\n' + citations.map((c, i) => `${i+1}. [${c.title}](${c.url})`).join('\n')
            : '')
          
          await cloudDb.updateMessage(assistantMsg.id, { 
            content: fullContent
          })
          
          // Complete
          statusEmitter.emitStatus(controller, 'complete', 'Complete')
          controller.close()
          
        } catch (error) {
          console.error('[AgenticRequest] Error:', error)
          statusEmitter.emitContent(
            controller,
            `\n\n⚠️ An error occurred while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
          controller.close()
        }
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-User-Message-Id': userMsg.id,
        'X-Assistant-Message-Id': assistantMsg.id
      }
    })
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
