import { D1Database } from '@cloudflare/workers-types'
import { randomUUID } from 'crypto'
import {
  getOrCreateGuestSession,
  getGuestIdFromRequest,
  decrementGuestCredits,
  checkGuestCredits,
  GUEST_CREDITS_LIMIT,
  type GuestSession
} from '@/lib/guest'
import { getAIProvider } from './ai-factory'
import { StreamManager } from './stream-manager'
import { ResponseFormatter } from './response-formatter'
import { formatSearchResultsSafely } from '@/lib/security/prompt-sanitizer'
import { validateOutput } from '@/lib/security/output-guard'

export class GuestChatService {
  async handleChatRequest(
    db: D1Database,
    request: Request,
    guestId: string,
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
    console.log('🚀 [GuestChatService.handleChatRequest] Starting:', {
      guestId: guestId.substring(0, 20) + '...',
      conversationId,
      isEditFlow: !!userMessageId,
      hasNewContent: !!userMessageContent,
      attachmentsCount: attachments.length,
      referencedConversationsCount: referencedConversations.length,
      referencedFoldersCount: referencedFolders.length
    })

    // Check guest credits
    const { hasCredits, remaining } = await checkGuestCredits(db, guestId)
    if (!hasCredits) {
      return new Response(
        JSON.stringify({
          error: "GUEST_CREDITS_EXCEEDED",
          message: "Guest credits exhausted",
          remaining: 0,
          limit: GUEST_CREDITS_LIMIT
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    }

    let userMessage: any
    let messageContent: string
    let messageRefs: any = { referencedConversations, referencedFolders }

    // Get or Create User Message
    if (userMessageId) {
      // Edit flow: Use existing message
      userMessage = await this.getGuestMessage(db, userMessageId, guestId)
      if (!userMessage) {
        throw new Error(`User message ${userMessageId} not found`)
      }
      messageContent = userMessage.content
      messageRefs = {
        referencedConversations: userMessage.referenced_conversations ? JSON.parse(userMessage.referenced_conversations) : [],
        referencedFolders: userMessage.referenced_folders ? JSON.parse(userMessage.referenced_folders) : []
      }
    } else {
      // Normal flow: Create new user message
      if (!userMessageContent) {
        throw new Error("Either userMessageContent or userMessageId must be provided")
      }

      const newMessageId = providedUserMessageId || randomUUID()

      userMessage = {
        id: newMessageId,
        conversation_id: conversationId,
        guest_id: guestId,
        role: 'user',
        content: userMessageContent,
        attachments: JSON.stringify(attachments),
        referenced_conversations: JSON.stringify(referencedConversations),
        referenced_folders: JSON.stringify(referencedFolders),
        created_at: new Date().toISOString()
      }

      await db
        .prepare(
          `INSERT INTO guest_messages (
            id, conversation_id, guest_id, role, content, attachments,
            referenced_conversations, referenced_folders, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          userMessage.id,
          userMessage.conversation_id,
          userMessage.guest_id,
          userMessage.role,
          userMessage.content,
          userMessage.attachments,
          userMessage.referenced_conversations,
          userMessage.referenced_folders,
          userMessage.created_at
        )
        .run()

      messageContent = userMessageContent
    }

    // Decrement guest credits
    const decremented = await decrementGuestCredits(db, guestId)
    if (!decremented) {
      throw new Error("Insufficient guest credits")
    }

    // Check if guest conversation exists, if not create it
    let guestConversation = await this.getGuestConversation(db, conversationId, guestId)

    if (!guestConversation) {
      await db
        .prepare(
          `INSERT INTO guest_conversations (
            id, guest_id, title, path, tags, is_pinned,
            active_branch_id, branches, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          conversationId,
          guestId,
          messageContent.substring(0, 100),
          JSON.stringify([]),
          JSON.stringify([]),
          0,
          null,
          JSON.stringify([]),
          new Date().toISOString(),
          new Date().toISOString()
        )
        .run()

      guestConversation = { id: conversationId, guest_id: guestId }
    }

    // Create assistant message placeholder
    const assistantMessageId = providedAssistantMessageId || randomUUID()

    await db
      .prepare(
        `INSERT INTO guest_messages (
          id, conversation_id, guest_id, role, content, attachments,
          referenced_conversations, referenced_folders, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        assistantMessageId,
        conversationId,
        guestId,
        'assistant',
        '',
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([]),
        new Date(Date.now() + 1).toISOString() // +1ms to ensure assistant comes after user
      )
      .run()

    // Start Streaming Response
    const stream = new ReadableStream({
      start: async (controller) => {
        const streamManager = new StreamManager(controller)
        let fullResponse = ''
        let reasoningMetadata: any = undefined
        let selectedModel = ''

        try {
          // --- PHASE 1: ANALYSIS ---
          streamManager.sendStatus('analyzing', 'Analyzing request...')

          // Handle file attachments for guests (including large PDFs)
          if (attachments && attachments.length > 0) {
            // Process attachments - similar to regular chat
            // For large PDFs, we would index them
            // For guests, we store metadata but skip long-term indexing
            console.log('📎 [GuestChatService] Processing attachments:', attachments.length)
          }

          // Retrieve context from guest conversation history
          const guestMessages = await this.getGuestMessages(db, conversationId, 1000)

          // Build context from guest conversation history and references
          const contextText = await this.buildGuestContext(
            db,
            guestId,
            conversationId,
            messageContent,
            messageRefs.referencedConversations,
            messageRefs.referencedFolders,
            guestMessages
          )

          // Prepare messages for AI
          const messages = await this.prepareGuestMessagesForAI(guestMessages, contextText)

          // Inject system identity
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

          // Reasoning Detection (enhanced domain-aware detection)
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
            
            console.log('🎯 [GuestChatService] Enhanced detection result:', {
              domain: detectionResult.domain,
              subDomain: detectionResult.subDomain,
              informationType: detectionResult.informationType,
              needsDisclaimer: detectionResult.responseRequirements?.needsDisclaimer
            })
          }

          // --- PHASE 2: SEARCH (If needed) ---
          if (shouldUseWebSearch) {
            streamManager.sendStatus('searching', 'Analyzing search intent...')
            
            try {
              // 1. Analyze Intent & Plan
              const { analyzeIntent } = await import('./agentic/intent-analyzer')
              const { quickAnalysis, sourcePlan } = await analyzeIntent(messageContent)
              
              streamManager.sendStatus('searching', `Searching ${sourcePlan.sources.join(', ')}...`)
              
              // 2. Execute Plan
              const { SourceOrchestrator } = await import('./agentic/source-orchestrator')
              const orchestrator = new SourceOrchestrator()
              const sourceResults = await orchestrator.executeSourcePlan(sourcePlan)
              
              // 3. Map to Frontend Format
              const allSources: any[] = []
              
              sourceResults.forEach(res => {
                if (res.citations) {
                  res.citations.forEach(cit => {
                    allSources.push({
                      type: res.source,
                      url: cit.url,
                      title: cit.title,
                      snippet: cit.snippet || '',
                      image: cit.image,           // Primary image URL
                      images: cit.images || []    // Additional images
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

                // Update status with domains
                const { getDomainName } = await import('@/lib/types/citation')
                const domains = searchResults.sources.slice(0, 3).map((s: any) => getDomainName(s.url))
                const uniqueDomains = [...new Set(domains)]
                const searchMessage = `Reading ${uniqueDomains.join(', ')}${searchResults.sources.length > 3 ? ' and more...' : '...'}`
                streamManager.sendStatus('searching', searchMessage)
              }
            } catch (searchError) {
              console.error('⚠️ [GuestChatService] Search failed, continuing without:', searchError)
            }
          }

          // --- PHASE 3: SYNTHESIS ---
          streamManager.sendStatus('synthesizing', 'Synthesizing response...')

          // Augment messages with search context (inject into SYSTEM message)
          let finalMessages = [...messages]
          
          if (searchResults && searchResults.sources.length > 0) {
            // Use sanitized search results to prevent indirect prompt injection
            const searchContext = formatSearchResultsSafely(
              searchResults.sources.map((s: any) => ({
                title: s.title,
                snippet: s.snippet,
                url: s.url
              })),
              searchResults.query
            )
            
            // Inject into system message
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

          // Determine AI provider
          // For guests, always use Groq (no files for now, or simplified file handling)
          const hasFiles = attachments && attachments.length > 0
          const aiProvider = getAIProvider(hasFiles)

          // Stream the AI response
          const aiStream = aiProvider.sendMessage({ messages: finalMessages })

          for await (const chunk of aiStream) {
            fullResponse += chunk
            streamManager.sendText(chunk)
          }

          // --- PHASE 4: COMPLETION ---
          // Prepare metadata
          const statusPills = []
          if (shouldUseReasoning || shouldUseWebSearch) {
            statusPills.push({ status: 'analyzing', message: 'Analyzing request...', timestamp: Date.now() })
            if (shouldUseWebSearch) {
              statusPills.push({ status: 'searching', message: 'Searching...', timestamp: Date.now() })
            }
            statusPills.push({ status: 'synthesizing', message: 'Synthesizing response...', timestamp: Date.now() })
            statusPills.push({ status: 'complete', message: 'Reasoning complete', timestamp: Date.now() })
          }

          reasoningMetadata = (shouldUseReasoning || shouldUseWebSearch) ? {
            statusPills,
            searchResults: searchResults || undefined
          } : undefined

          // Validate output for security (detect leakage, redact sensitive data)
          const outputValidation = validateOutput(fullResponse)
          if (!outputValidation.isClean) {
            console.warn('⚠️ [GuestChatService] Output validation warnings:', outputValidation.warnings)
          }
          const safeResponse = outputValidation.redactedOutput

          // Save to DB
          console.log('💾 [GuestChatService] Saving assistant message:', assistantMessageId)
          await db
            .prepare(
              'UPDATE guest_messages SET content = ?, attachments = ?, referenced_conversations = ?, referenced_folders = ? WHERE id = ? AND guest_id = ?'
            )
            .bind(
              safeResponse,
              JSON.stringify([]),
              JSON.stringify([]),
              JSON.stringify([]),
              assistantMessageId,
              guestId
            )
            .run()

          streamManager.close()

        } catch (error) {
          console.error('❌ [GuestChatService] Stream error:', error)
          streamManager.error(error)
        }
      }
    })

    const finalCredits = await checkGuestCredits(db, guestId)

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-User-Message-Id': userMessage.id,
        'X-Assistant-Message-Id': assistantMessageId,
        'X-Guest-Credits-Remaining': finalCredits.remaining.toString()
      }
    })
  }

  private async getGuestConversation(db: D1Database, conversationId: string, guestId: string) {
    return await db
      .prepare('SELECT * FROM guest_conversations WHERE id = ? AND guest_id = ? LIMIT 1')
      .bind(conversationId, guestId)
      .first()
  }

  private async getGuestMessage(db: D1Database, messageId: string, guestId: string) {
    return await db
      .prepare('SELECT * FROM guest_messages WHERE id = ? AND guest_id = ? LIMIT 1')
      .bind(messageId, guestId)
      .first()
  }

  private async getGuestMessages(db: D1Database, conversationId: string, limit: number = 100) {
    const result = await db
      .prepare('SELECT * FROM guest_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?')
      .bind(conversationId, limit)
      .all()

    return result.results || []
  }

  private async buildGuestContext(
    db: D1Database,
    guestId: string,
    currentConversationId: string,
    query: string,
    referencedConversations: any[],
    referencedFolders: any[],
    guestMessages: any[]
  ): Promise<string> {
    let contextText = ''

    // Add current conversation history
    if (guestMessages.length > 0) {
      contextText += '\n=== CURRENT CONVERSATION HISTORY ===\n'
      contextText += guestMessages
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .map((m: any) => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.content}`)
        .join('\n\n')
      contextText += '\n=== END OF CONVERSATION HISTORY ===\n'
    }

    // Add referenced conversations (if any)
    if (referencedConversations && referencedConversations.length > 0) {
      contextText += '\n=== REFERENCED CONVERSATIONS ===\n'
      for (const ref of referencedConversations) {
        const messages = await this.getGuestMessages(db, ref.id, 50)
        if (messages.length > 0) {
          contextText += `\n--- From: "${ref.title}" ---\n`
          contextText += messages
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .map((m: any) => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.content}`)
            .join('\n\n')
        }
      }
      contextText += '\n=== END OF REFERENCED CONVERSATIONS ===\n'
    }

    return contextText
  }

  private async prepareGuestMessagesForAI(guestMessages: any[], contextText: string): Promise<any[]> {
    const apiMessages: any[] = []

    // Add context if available
    if (contextText) {
      apiMessages.push({
        role: 'system',
        content: `Use the following context to answer the user's request:\n\n${contextText}`
      })
    }

    // Convert guest messages to API format
    for (const m of guestMessages) {
      if (m.role === 'user' || m.role === 'assistant') {
        // Parse attachments if they exist
        let content = m.content
        if (m.attachments) {
          try {
            const attachments = JSON.parse(m.attachments)
            if (attachments && attachments.length > 0) {
              // For guests, we don't process files the same way
              // Just add a note about attachments
              content = `${content}\n\n[Attachments: ${attachments.map((a: any) => a.name).join(', ')}]`
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }

        apiMessages.push({
          role: m.role,
          content: content
        })
      }
    }

    return apiMessages
  }
}

export const guestChatService = new GuestChatService()
