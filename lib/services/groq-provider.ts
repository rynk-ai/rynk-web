import { AIProvider, ChatCompletionParams } from './ai-provider'

export class GroqProvider implements AIProvider {
  private baseUrl = 'https://api.groq.com/openai/v1'

  async *sendMessage(params: ChatCompletionParams): AsyncGenerator<string, void, unknown> {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY not configured')

    console.log('📤 Sending message to Groq API...')
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-instruct-0905',
        messages: params.messages,
        stream: true,
      }),
    })

    console.log('📥 Received response:', response.status, response.statusText)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any
      console.error('❌ Groq API error:', error)
      throw new Error(error.error?.message || `HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      console.error('❌ Response body is not readable')
      throw new Error('Response body is not readable')
    }

    console.log('✅ Starting to read stream...')
    const decoder = new TextDecoder()
    let buffer = ''
    let chunkCount = 0

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          console.log(`✅ Stream complete (${chunkCount} chunks)`)
          break
        }

        chunkCount++
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6)

            if (data === '[DONE]') {
              console.log('✅ Stream marked as [DONE]')
              return
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta

              if (delta?.content) {
                yield delta.content
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', data)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async sendMessageOnce(params: ChatCompletionParams): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY not configured')

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-instruct-0905',
        messages: params.messages,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any
      throw new Error(error.error?.message || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json() as any
    return data.choices?.[0]?.message?.content || ''
  }

  async getEmbeddings(text: string, timeoutMs: number = 15000): Promise<number[]> {
    // Groq doesn't support embeddings yet (or at least not the same model), 
    // so we might want to fallback to OpenRouter or another provider for embeddings.
    // For now, let's throw an error or maybe just use OpenRouter for embeddings even if Groq is selected for chat?
    // The user request didn't specify embeddings, but the interface requires it.
    // Let's assume we use OpenRouter for embeddings for now as a fallback or just implement it if Groq supports it.
    // Checking Groq docs... they do have embeddings now but maybe not the same model.
    // To be safe and simple, I will use OpenRouter for embeddings for now as the user only asked to switch chat provider.
    // But wait, if I use OpenRouter here I need to import it. 
    // Let's just implement a placeholder or try to use Groq's embedding if available?
    // Actually, the safest bet is to use OpenRouter for embeddings regardless of the chat provider, 
    // OR just throw not implemented if the user strictly wants Groq. 
    // However, the app likely needs embeddings for RAG.
    // Let's look at `openrouter.ts` again. It uses `text-embedding-3-small`.
    // I'll stick to OpenRouter for embeddings for now to avoid breaking RAG.
    
    // Actually, to avoid circular dependency if I import OpenRouter here, 
    // I should probably inject the embedding provider or just duplicate the logic but use OpenRouter key/url.
    // But `getEmbeddings` is part of the interface.
    
    // Let's just copy the OpenRouter embedding logic here for now, but using OPENROUTER_API_KEY.
    // This effectively means "Groq for Chat, OpenRouter for Embeddings" which is a valid combo.
    
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured (required for embeddings)')
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Embedding generation timeout after ${timeoutMs}ms`)), timeoutMs)
    })
    
    const fetchPromise = fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    })
    
    const response = await Promise.race([fetchPromise, timeoutPromise])

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any
      throw new Error(error.error?.message || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json() as any
    return data.data[0].embedding
  }
}
