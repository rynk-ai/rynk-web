import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { cloudDb } from "@/lib/services/cloud-db";
import { getAIProvider } from "@/lib/services/ai-factory";
import type { Message as ApiMessage } from "@/lib/services/ai-provider";

interface SubChatChatRequest {
  subChatId: string;
  quotedText: string;
}

// POST /api/sub-chats/chat - Stream AI response for sub-chat
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { subChatId, quotedText } = await request.json() as SubChatChatRequest;

    if (!subChatId) {
      return new Response(
        JSON.stringify({ error: "subChatId is required" }),
        { status: 400 }
      );
    }

    // Get the sub-chat with all messages
    const subChat = await cloudDb.getSubChat(subChatId);
    if (!subChat) {
      return new Response(
        JSON.stringify({ error: "Sub-chat not found" }),
        { status: 404 }
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
    const latestUserMessage = subChat.messages
      .filter(m => m.role === "user")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .pop();

    const userQuery = latestUserMessage?.content || "";

    // Detect if we need web search
    const { detectReasoning, resolveReasoningMode, getReasoningModel } = await import('@/lib/services/reasoning-detector');
    const detectionResult = await detectReasoning(userQuery);
    const resolved = resolveReasoningMode('auto', detectionResult);
    const shouldUseWebSearch = resolved.useWebSearch;

    // Execute web search if needed
    let searchContext = "";
    if (shouldUseWebSearch) {
      try {
        const { analyzeIntent } = await import('@/lib/services/agentic/intent-analyzer');
        const { SourceOrchestrator } = await import('@/lib/services/agentic/source-orchestrator');

        const { sourcePlan } = await analyzeIntent(userQuery);
        const orchestrator = new SourceOrchestrator();
        const sourceResults = await orchestrator.executeSourcePlan(sourcePlan);

        // Build search context for the AI
        const searchSources: string[] = [];
        sourceResults.forEach(result => {
          if (result.citations && result.citations.length > 0) {
            searchSources.push(
              `\n### ${result.source.toUpperCase()} Results:\n` +
              result.citations.slice(0, 3).map((cit, i) =>
                `${i + 1}. ${cit.title}: ${cit.snippet || ''}\nURL: ${cit.url}`
              ).join('\n\n')
            );
          }
        });

        if (searchSources.length > 0) {
          searchContext = `\n\n## Web Search Results:\n${searchSources.join('\n')}\n\nUse these sources to provide accurate, up-to-date information. Cite relevant sources in your response.`;
        }
      } catch (error) {
        console.error('Web search error in sub-chat:', error);
        // Continue without search results if search fails
      }
    }

    // Prepare system message with full context
    const sourceMessageContent = subChat.sourceMessageContent || "";
    const systemMessage: ApiMessage = {
      role: "system",
      content: `You are a helpful assistant having a focused discussion about a specific text excerpt from a larger conversation.

## Full Message Context:
${sourceMessageContent}

## Highlighted/Selected Text:
"${quotedText}"${searchContext}

## Your Task:
Keep your responses concise and directly relevant to the selected text. Use the full message context to better understand the user's question and provide more informed answers.

When relevant, provide citations from web sources to support your answer.`
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
    console.error("Error in sub-chat AI:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
