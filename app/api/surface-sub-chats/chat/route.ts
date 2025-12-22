import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { cloudDb } from "@/lib/services/cloud-db";
import { getAIProvider } from "@/lib/services/ai-factory";
import type { Message as ApiMessage } from "@/lib/services/ai-provider";

// POST /api/surface-sub-chats/chat - Stream AI response for surface sub-chat
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await request.json() as {
      subChatId?: string;
      quotedText?: string;
      sourceContent?: string;
    };

    if (!body.subChatId) {
      return new Response(
        JSON.stringify({ error: "subChatId is required" }),
        { status: 400 }
      );
    }

    const { subChatId, quotedText, sourceContent } = body;

    // Get the sub-chat with all messages
    const subChat = await cloudDb.getSurfaceSubChat(subChatId);
    if (!subChat) {
      return new Response(
        JSON.stringify({ error: "Sub-chat not found" }),
        { status: 404 }
      );
    }

    // Verify ownership
    if (subChat.userId !== session.user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403 }
      );
    }

    // Check credits
    const credits = await cloudDb.getUserCredits(session.user.id);
    if (credits <= 0) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits" }),
        { status: 402 }
      );
    }

    // Get the latest user message for reasoning detection
    const latestMessage = subChat.messages[subChat.messages.length - 1];
    const userMessageContent = latestMessage?.role === 'user' ? latestMessage.content : '';

    let searchResults: any = null;

    // --- PHASE 1: Reasoning Detection ---
    if (userMessageContent) {
      const { detectReasoning, resolveReasoningMode } = await import('@/lib/services/reasoning-detector');

      const detectionResult = await detectReasoning(userMessageContent);
      const resolved = resolveReasoningMode('auto', detectionResult);

      // --- PHASE 2: Web Search (if needed) ---
      if (resolved.useWebSearch && userMessageContent) {
        const { analyzeIntent } = await import('@/lib/services/agentic/intent-analyzer');
        const { SourceOrchestrator } = await import('@/lib/services/agentic/source-orchestrator');

        const { quickAnalysis, sourcePlan } = await analyzeIntent(userMessageContent);
        const orchestrator = new SourceOrchestrator();
        const sourceResults = await orchestrator.executeSourcePlan(sourcePlan);

        // Map to legacy format for frontend compatibility
        const allSources: any[] = [];

        sourceResults.forEach(res => {
          if (res.citations) {
            res.citations.forEach(cit => {
              allSources.push({
                type: res.source,
                url: cit.url,
                title: cit.title,
                snippet: cit.snippet || ''
              });
            });
          }
        });

        // Deduplicate sources
        const uniqueSources = Array.from(
          new Map(allSources.map(s => [s.url, s])).values()
        );

        searchResults = {
          query: userMessageContent,
          sources: uniqueSources,
          strategy: sourcePlan.sources,
          totalResults: uniqueSources.length
        };
      }
    }

    // Build system prompt for surface sub-chat
    // Different from conversation sub-chats since content comes from surfaces/learning
    const surfaceTypeLabel = subChat.sourceType === 'learning' ? 'learning content' : 'article';
    
    let systemContent = `You are a helpful learning assistant having a focused discussion. Here's the context:

FULL ${surfaceTypeLabel.toUpperCase()} SECTION:
${sourceContent || subChat.sourceContent || '(No full content available)'}

The user highlighted this specific portion and is asking about it:
"${quotedText || subChat.quotedText}"

Your role:
- Explain the highlighted concept in simpler terms if asked
- Provide additional context, examples, or analogies
- Answer follow-up questions about this specific topic
- Help deepen understanding of this material

Be concise, educational, and helpful.`;

    // Add search results to system message if available
    if (searchResults && searchResults.sources.length > 0) {
      systemContent += `

You have access to up-to-date web search results. Use this information to provide accurate and current answers:

${searchResults.sources.map((s: any, i: number) => `[${i + 1}] ${s.title}: ${s.snippet}`).join('\n')}

When citing information from web results, use inline citations like [1], [2], etc.`;
    }

    const systemMessage: ApiMessage = {
      role: "system",
      content: systemContent
    };

    const chatMessages: ApiMessage[] = subChat.messages.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }));

    const allMessages = [systemMessage, ...chatMessages];

    // Get AI provider
    const provider = getAIProvider();

    // Deduct 1 credit for sub-chat message
    await cloudDb.updateCredits(session.user.id, -1);

    // Use sendMessage which returns an AsyncGenerator
    const aiStream = provider.sendMessage({ messages: allMessages });

    // Create a ReadableStream from the AsyncGenerator
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // First, send search results if available
          if (searchResults) {
            controller.enqueue(encoder.encode(`[SEARCH_RESULTS]${JSON.stringify(searchResults)}\n`));
          }

          // Then stream AI response
          for await (const chunk of aiStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Return the stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Error in surface sub-chat AI:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
