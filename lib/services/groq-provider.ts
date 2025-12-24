import { AIProvider, ChatCompletionParams } from "./ai-provider";

export class GroqProvider implements AIProvider {
  private baseUrl = "https://api.groq.com/openai/v1";

  async *sendMessage(
    params: ChatCompletionParams,
  ): AsyncGenerator<string, void, unknown> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");

    console.log("📤 Sending message to Groq API...");

    // Check for images in messages to switch to vision model
    const hasImages = params.messages.some(msg => 
      Array.isArray(msg.content) && msg.content.some(c => c.type === 'image_url')
    );

    const model = hasImages 
      ? "meta-llama/llama-guard-4-12b" 
      : "moonshotai/kimi-k2-instruct-0905";

    if (hasImages) {
      console.log('🖼️ [GroqProvider] Image detected, switching to Vision model:', model);
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        stream: true,
      }),
    });

    console.log("📥 Received response:", response.status, response.statusText);

    if (!response.ok) {
      const error = (await response
        .json()
        .catch(() => ({ error: { message: "Unknown error" } }))) as any;
      console.error("❌ Groq API error:", error);
      throw new Error(
        error.error?.message || `HTTP error! status: ${response.status}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      console.error("❌ Response body is not readable");
      throw new Error("Response body is not readable");
    }

    console.log("✅ Starting to read stream...");
    const decoder = new TextDecoder();
    let buffer = "";
    let chunkCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log(`✅ Stream complete (${chunkCount} chunks)`);
          break;
        }

        chunkCount++;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);

            if (data === "[DONE]") {
              console.log("✅ Stream marked as [DONE]");
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              if (delta?.content) {
                yield delta.content;
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async sendMessageOnce(params: ChatCompletionParams): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");

    // Check for images in messages to switch to vision model
    const hasImages = params.messages.some(msg => 
      Array.isArray(msg.content) && msg.content.some(c => c.type === 'image_url')
    );

    const model = hasImages 
      ? "meta-llama/llama-guard-4-12b" 
      : "moonshotai/kimi-k2-instruct-0905";

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = (await response
        .json()
        .catch(() => ({ error: { message: "Unknown error" } }))) as any;
      throw new Error(
        error.error?.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content || "";
  }

  async getEmbeddings(
    text: string,
    timeoutMs: number = 15000,
  ): Promise<number[]> {
    // Forward to Cloudflare AI Service
    // This removes the need for OpenRouter API key in Groq provider
    const { getCloudflareAI } = await import('@/lib/services/cloudflare-ai')
    const aiProvider = getCloudflareAI()
    return aiProvider.getEmbeddings(text)
  }
}
