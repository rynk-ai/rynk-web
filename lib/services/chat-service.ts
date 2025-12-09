import { cloudDb } from "@/lib/services/cloud-db"
import { cloudStorage } from "@/lib/services/cloud-storage"
import { vectorDb } from "@/lib/services/vector-db" // Import vectorDb
import { getCloudflareContext } from '@opennextjs/cloudflare'
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
import { getDomainName } from '@/lib/types/citation'
import { StreamManager } from './stream-manager'
import { ResponseFormatter } from './response-formatter'

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
      userMessage = await cloudDb.getMessage(userMessageId)
      if (!userMessage) {
        throw new Error(`User message ${userMessageId} not found`)
      }
      messageContent = userMessage.content
      messageRefs = {
        referencedConversations: userMessage.referencedConversations || [],
        referencedFolders: userMessage.referencedFolders || []
      }
    } else {
      // Normal flow: Create new user message
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
    }

    // 3. Deduct credit
    await cloudDb.updateCredits(userId, -1)

    // 4. Fetch conversation and project (if exists)
    const conversation = await cloudDb.getConversation(conversationId)
    let project = null
    if (conversation?.projectId) {
      project = await cloudDb.getProject(conversation.projectId)
    }

    // 5. Create assistant message placeholder EARLY
    const assistantMessage = await cloudDb.addMessage(conversationId, {
      id: providedAssistantMessageId || undefined,
      role: 'assistant',
      content: '', // Will be filled by streaming
      attachments: [],
    })

    // 6. Start Streaming Response Immediately
    const stream = new ReadableStream({
      start: async (controller) => {
        const streamManager = new StreamManager(controller)
        let fullResponse = ''
        let reasoningMetadata: any = undefined
        let selectedModel = ''

        try {
          // --- PHASE 1: ANALYSIS ---
          streamManager.sendStatus('analyzing', 'Analyzing request...')

          // Generate Embedding for User Message (Background with waitUntil)
          // Use waitUntil to ensure vectorization completes even after response is sent
          try {
            const cfContext = getCloudflareContext()
            cfContext.ctx.waitUntil(
              this.generateEmbeddingInBackground(
                userMessage.id, 
                conversationId, 
                userId, 
                messageContent,
                project?.id
              ).catch(err => console.error('❌ [chatService] User message vectorization failed:', err))
            )
          } catch (e) {
            // Fallback: if waitUntil not available, still try fire-and-forget
            this.generateEmbeddingInBackground(
              userMessage.id, conversationId, userId, messageContent, project?.id
            ).catch(err => console.error('❌ [chatService] User message vectorization failed:', err))
          }

          // Ingest legacy attachments (if any)
          if (attachments.length > 0) {
             // ... (Legacy ingestion logic if needed, skipping for brevity as frontend handles it)
          }

          // Retrieve Context from Knowledge Base
          const { knowledgeBase } = await import('@/lib/services/knowledge-base')
          let kbContext = ''
          try {
            kbContext = await knowledgeBase.getContext(
              conversationId, 
              messageContent,
              undefined, 
              project?.id
            )
          } catch (error) {
            console.error('❌ [chatService] Failed to retrieve KB context:', error)
          }

          const { contextText: legacyContext, retrievedChunks } = await this.buildContext(
            userId,
            conversationId,
            messageContent,
            messageRefs.referencedConversations,
            messageRefs.referencedFolders,
            project?.id
          )
          
          // Send context cards to frontend (shows what RAG found)
          if (retrievedChunks.length > 0) {
            streamManager.sendContextCards(
              retrievedChunks.slice(0, 5).map(chunk => ({
                source: chunk.source,
                snippet: chunk.content.substring(0, 200),
                score: chunk.score
              }))
            )
          }
          
          const finalContext = `${legacyContext}\n\n${kbContext ? `=== RELEVANT KNOWLEDGE BASE CONTEXT ===\n${kbContext}` : ''}`.trim()

          // Prepare Messages
          const messages = await this.prepareMessagesForAI(conversationId, finalContext, project)

          // Inject System Identity (Rynk)
          const identity = ResponseFormatter.getSystemIdentity()
          const systemMsgIndex = messages.findIndex(m => m.role === 'system')
          if (systemMsgIndex >= 0) {
             const existingContent = messages[systemMsgIndex].content as string
             messages[systemMsgIndex] = {
               ...messages[systemMsgIndex],
               content: `${identity}\n\nCurrent Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n${existingContent}`
             }
          } else {
             messages.unshift({
               role: 'system',
               content: `${identity}\n\nCurrent Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
             })
          }

          // Reasoning Detection
          let shouldUseReasoning = false
          let shouldUseWebSearch = false
          let searchResults: any = null
          let detectionResult: any = null

          if (userMessageContent && useReasoning !== 'off') {
            // Use enhanced domain-aware detection
            const { detectEnhanced, resolveReasoningMode, getReasoningModel } = await import('./reasoning-detector')
            
            detectionResult = await detectEnhanced(messageContent)
            const resolved = resolveReasoningMode(useReasoning, detectionResult)
            shouldUseReasoning = resolved.useReasoning
            shouldUseWebSearch = resolved.useWebSearch
            selectedModel = getReasoningModel(shouldUseReasoning, false)
            
            console.log('🎯 [chatService] Enhanced detection result:', {
              domain: detectionResult.domain,
              subDomain: detectionResult.subDomain,
              informationType: detectionResult.informationType,
              needsDisclaimer: detectionResult.responseRequirements?.needsDisclaimer
            })
          }

            // --- PHASE 2: SEARCH (If needed) ---
            if (shouldUseWebSearch) {
              streamManager.sendStatus('searching', 'Analyzing search intent...')
              
              // 1. Analyze Intent & Plan
              const { analyzeIntent } = await import('./agentic/intent-analyzer')
              const { quickAnalysis, sourcePlan } = await analyzeIntent(messageContent)
              
              streamManager.sendStatus('searching', `Searching ${sourcePlan.sources.join(', ')}...`)
              
              // 2. Execute Plan
              const { SourceOrchestrator } = await import('./agentic/source-orchestrator')
              const orchestrator = new SourceOrchestrator()
              const sourceResults = await orchestrator.executeSourcePlan(sourcePlan)
              
              // 3. Map to Legacy Format for Frontend Compatibility
              const allSources: any[] = []
              
              sourceResults.forEach(res => {
                if (res.citations) {
                  res.citations.forEach(cit => {
                    allSources.push({
                      type: res.source,
                      url: cit.url,
                      title: cit.title,
                      snippet: cit.snippet || ''
                    })
                  })
                }
              })
              
              // Deduplicate sources
              const uniqueSources = Array.from(
                new Map(allSources.map(s => [s.url, s])).values()
              )

              searchResults = {
                query: sourcePlan.searchQueries.exa || sourcePlan.searchQueries.perplexity || messageContent,
                sources: uniqueSources,
                searchStrategy: sourcePlan.sources,
                totalResults: uniqueSources.length
              }
              
              if (searchResults) {
                streamManager.sendSearchResults({
                  query: searchResults.query,
                  sources: searchResults.sources,
                  strategy: searchResults.searchStrategy,
                  totalResults: searchResults.totalResults
                })

                // Update status to show what we found
                const domains = searchResults.sources.slice(0, 3).map((s: any) => getDomainName(s.url))
                const uniqueDomains = [...new Set(domains)]
                const searchMessage = `Reading ${uniqueDomains.join(', ')}${searchResults.sources.length > 3 ? ' and more...' : '...'}`
                streamManager.sendStatus('searching', searchMessage)
              }
            }

          // --- PHASE 3: SYNTHESIS ---
          streamManager.sendStatus('synthesizing', 'Synthesizing response...')

          // Augment messages with search context (inject into SYSTEM message for clarity)
          let finalMessages = [...messages]
          
          if (searchResults && searchResults.sources.length > 0) {
            const searchContext = `
<search_results>
Query: ${searchResults.query}

${searchResults.sources.map((s: any, i: number) => 
  `[${i + 1}] ${s.title}
${s.snippet}
Source: ${s.url}`
).join('\n\n')}
</search_results>

<synthesis_instructions>
You have access to the search results above. Follow these rules STRICTLY:
1. **Synthesize**: Cross-reference facts from multiple sources to build a complete picture. Do NOT simply list sources.
2. **Cite**: Use [1], [2] format immediately after each claim. Every factual statement must be cited.
3. **NEVER include raw URLs in your response**. The citation numbers are enough.
4. **NEVER repeat the search results or source snippets verbatim**. Synthesize the information naturally.
5. **Resolve Conflicts**: If sources disagree, acknowledge the discrepancy.
6. **Be Complete**: Use ALL relevant information. Do not ignore details.
7. **Direct Answer**: Provide the answer directly. Do not mention these instructions.
</synthesis_instructions>`
            
            // Inject into system message (not user message)
            const systemMsgIndex = finalMessages.findIndex(m => m.role === 'system')
            if (systemMsgIndex >= 0) {
              const existingContent = finalMessages[systemMsgIndex].content as string
              finalMessages[systemMsgIndex] = {
                ...finalMessages[systemMsgIndex],
                content: existingContent + '\n\n' + searchContext
              }
            } else {
              finalMessages.unshift({
                role: 'system',
                content: searchContext
              })
            }
          }

          // Apply Domain-Specific Response Formatting (Enhanced)
          if (detectionResult) {
            // Use the new enhanced format instructions based on domain and information type
            const formatInstructions = ResponseFormatter.getEnhancedFormatInstructions(detectionResult)
            
            // Inject as system message (or append to existing system message)
            const systemMsgIndex = finalMessages.findIndex(m => m.role === 'system')
            if (systemMsgIndex >= 0) {
              const existingContent = finalMessages[systemMsgIndex].content as string
              finalMessages[systemMsgIndex] = {
                ...finalMessages[systemMsgIndex],
                content: existingContent + '\n\n' + formatInstructions
              }
            } else {
              finalMessages.unshift({
                role: 'system',
                content: formatInstructions
              })
            }
          }

          // Determine AI Provider
          // Use OpenRouter only for files (multimodal), otherwise use Groq with Kimi K2
          const hasFiles = this.hasFilesInConversation(messages, project, attachments)
          const aiProvider = getAIProvider(hasFiles)

          // Stream the AI response
          const aiStream = aiProvider.sendMessage({ messages: finalMessages })
          
          for await (const chunk of aiStream) {
            fullResponse += chunk
            streamManager.sendText(chunk)
          }

          // --- PHASE 4: COMPLETION ---
          // Prepare metadata
          const statusPills = [] // We don't need to reconstruct pills here, the client has them.
          // But we DO need to save them to the DB for history.
          // We can reconstruct what we sent.
          if (shouldUseReasoning || shouldUseWebSearch) {
             statusPills.push({ status: 'analyzing', message: 'Analyzing request...', timestamp: Date.now() })
             if (shouldUseWebSearch) {
               statusPills.push({ status: 'searching', message: 'Searching...', timestamp: Date.now() })
             }
             statusPills.push({ status: 'synthesizing', message: 'Synthesizing response...', timestamp: Date.now() })
             statusPills.push({ status: 'complete', message: 'Reasoning complete', timestamp: Date.now() })
          }

          reasoningMetadata = (shouldUseReasoning || shouldUseWebSearch) ? {
            statusPills, // This is an approximation for history. Ideally we'd track exact timestamps.
            searchResults: searchResults || undefined
          } : undefined

          // Save to DB
          console.log('💾 [chatService] Saving assistant message:', assistantMessage.id)
          await cloudDb.updateMessage(assistantMessage.id, { 
            content: fullResponse,
            reasoning_metadata: reasoningMetadata,
            model_used: selectedModel
          })

          // Vectorize Assistant Response (Background with waitUntil)
          try {
            const cfContext = getCloudflareContext()
            cfContext.ctx.waitUntil(
              this.generateEmbeddingInBackground(
                assistantMessage.id, 
                conversationId, 
                userId, 
                fullResponse,
                project?.id
              ).catch(err => console.error('❌ [chatService] Assistant message vectorization failed:', err))
            )
          } catch (e) {
            // Fallback: if waitUntil not available, still try fire-and-forget
            this.generateEmbeddingInBackground(
              assistantMessage.id, conversationId, userId, fullResponse, project?.id
            ).catch(err => console.error('❌ [chatService] Assistant message vectorization failed:', err))
          }

          streamManager.close()

        } catch (error) {
          console.error('❌ [chatService] Stream error:', error)
          streamManager.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-User-Message-Id': userMessage.id,
        'X-Assistant-Message-Id': assistantMessage.id
      }
    })
  }

  private async buildContext(
    userId: string,
    currentConversationId: string,
    query: string,
    referencedConversations: any[],
    referencedFolders: any[],
    projectId?: string,
    onProgress?: (message: string) => void
  ): Promise<{ contextText: string; retrievedChunks: { content: string; source: string; score: number }[] }> {
    let contextText = ''
    
    // --- 1. RECENT CONTEXT (Standard) ---
    // We still inject the recent conversation history directly via `prepareMessagesForAI` (last 1000 msgs).
    // So `buildContext` is primarily for RETRIEVED context (RAG).

    if (!query.trim()) return { contextText: '', retrievedChunks: [] }

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
          minScore: 0.5,
          excludeConversationId: currentConversationId 
        });
        console.log('📊 [buildContext] Project memories found:', projectMemories.length);
        
        // Fetch conversation titles and message roles for better attribution
        if (projectMemories.length > 0) {
          const convIds = Array.from(new Set(projectMemories.map(m => m.conversationId)));
          const conversations = await cloudDb.getConversationsBatch(convIds);
          const convMap = new Map(conversations.map(c => [c.id, c.title]));
          
          // Fetch message roles from DB
          const messageIds = projectMemories.map(m => m.messageId);
          const messages = await cloudDb.getMessagesByIdBatch(messageIds);
          const roleMap = new Map(messages.map(m => [m.id, m.role]));
          
          projectMemories.forEach(m => {
            const title = convMap.get(m.conversationId) || 'Unknown Chat';
            const role = roleMap.get(m.messageId) || 'unknown';
            const roleLabel = role === 'assistant' ? 'AI' : role === 'user' ? 'User' : 'Unknown';
            
            // Format relative time
            const ageMs = Date.now() - (m.timestamp || 0);
            const ageMinutes = Math.floor(ageMs / 60000);
            const ageHours = Math.floor(ageMs / 3600000);
            const ageDays = Math.floor(ageMs / 86400000);
            const timeAgo = ageDays > 0 
              ? `${ageDays} day${ageDays > 1 ? 's' : ''} ago`
              : ageHours > 0 
                ? `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`
                : `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`;
            
            retrievedChunks.push({
              content: `[${roleLabel}]: ${m.content}`,
              source: `In "${title}" (${timeAgo})`,
              score: m.score
            });
          });
        } else {
          // --- D1 FALLBACK: Vectorize hasn't indexed yet, query D1 directly ---
          console.log('⚠️ [buildContext] Vectorize returned 0 results, using D1 fallback...');
          const recentMessages = await cloudDb.getRecentProjectMessages(
            projectId,
            currentConversationId,
            10
          );
          
          if (recentMessages.length > 0) {
            console.log(`✅ [buildContext] D1 fallback found ${recentMessages.length} recent messages`);
            
            recentMessages.forEach(m => {
              const roleLabel = m.role === 'assistant' ? 'AI' : m.role === 'user' ? 'User' : 'Unknown';
              
              // Format relative time
              const ageMs = Date.now() - m.createdAt;
              const ageMinutes = Math.floor(ageMs / 60000);
              const ageHours = Math.floor(ageMs / 3600000);
              const timeAgo = ageHours > 0 
                ? `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`
                : `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`;
              
              retrievedChunks.push({
                content: `[${roleLabel}]: ${m.content.substring(0, 1000)}`, // Limit content length
                source: `In "${m.conversationTitle}" (${timeAgo})`,
                score: 0.8 // Default score for D1 results
              });
            });
          }
        }
      }

      // --- SCOPE 3: REFERENCED CONVERSATIONS (Explicit) ---
      if (referencedConversations.length > 0) {
        console.log('🧠 [buildContext] Searching Referenced Conversations:', referencedConversations.length);
        
        for (const ref of referencedConversations) {
          // A. Search Messages in Referenced Chat via Vectorize
          const refMemories = await vectorDb.searchConversationMemory(ref.id, queryVector, { limit: 5 });
          
          if (refMemories.length > 0) {
            refMemories.forEach(m => {
              retrievedChunks.push({
                content: m.content,
                source: `Referenced Chat: "${ref.title}"`,
                score: m.score
              });
            });
          } else {
            // D1 FALLBACK: If Vectorize returns no results, fetch recent messages directly
            console.log(`⚠️ [buildContext] Vectorize returned 0 for ref ${ref.id}, using D1 fallback...`);
            const { messages: recentMsgs } = await cloudDb.getMessages(ref.id, 10);
            recentMsgs.forEach(m => {
              if (m.role === 'user' || m.role === 'assistant') {
                const roleLabel = m.role === 'assistant' ? 'AI' : 'User';
                retrievedChunks.push({
                  content: `[${roleLabel}]: ${m.content.substring(0, 1000)}`,
                  source: `Referenced Chat: "${ref.title}"`,
                  score: 0.75 // Default score for D1 fallback
                });
              }
            });
          }

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

      // --- SCOPE 4: REFERENCED FOLDERS (Explicit) ---
      if (referencedFolders && referencedFolders.length > 0) {
        console.log('📁 [buildContext] Searching Referenced Folders:', referencedFolders.length);
        
        for (const folderRef of referencedFolders) {
          const folder = await cloudDb.getFolder(folderRef.id);
          if (!folder || !folder.conversationIds.length) {
            console.log(`⚠️ [buildContext] Folder ${folderRef.id} not found or empty`);
            continue;
          }
          
          console.log(`📁 [buildContext] Folder "${folder.name}" has ${folder.conversationIds.length} conversations`);
          
          // Search up to 5 conversations in this folder
          for (const convId of folder.conversationIds.slice(0, 5)) {
            // Try Vectorize first
            const folderMemories = await vectorDb.searchConversationMemory(convId, queryVector, { limit: 3 });
            
            if (folderMemories.length > 0) {
              folderMemories.forEach(m => {
                retrievedChunks.push({
                  content: m.content,
                  source: `Folder "${folder.name}"`,
                  score: m.score
                });
              });
            } else {
              // D1 fallback for folder conversations
              const { messages: recentMsgs } = await cloudDb.getMessages(convId, 5);
              recentMsgs.forEach(m => {
                if (m.role === 'user' || m.role === 'assistant') {
                  const roleLabel = m.role === 'assistant' ? 'AI' : 'User';
                  retrievedChunks.push({
                    content: `[${roleLabel}]: ${m.content.substring(0, 500)}`,
                    source: `Folder "${folder.name}"`,
                    score: 0.7
                  });
                }
              });
            }
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

      return { contextText, retrievedChunks: topChunks };

    } catch (err) {
      console.error('❌ [buildContext] Error in Unified RAG:', err);
      return { contextText: '', retrievedChunks: [] };
    }
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
              // Priority 3: PDF was likely indexed - content available via knowledge base context
              else {
                console.log('📚 [prepareMessagesForAI] PDF indexed to knowledge base, referencing metadata only');
                content.push({
                  type: 'text',
                  text: `📄 **PDF Document**: ${att.name}\n*(${att.size ? formatFileSize(att.size) : 'size unknown'})*\n\n*This PDF has been indexed. Its content is available in the knowledge base context above. Please use that context to answer questions about this document.*`
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
