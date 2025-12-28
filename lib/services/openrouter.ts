import { AIProvider, ChatCompletionParams } from './ai-provider'

export class OpenRouterService implements AIProvider {
  private baseUrl = ''

  constructor() {
    this.baseUrl = ''
  }

  async *sendMessage(
    params: ChatCompletionParams & { model?: string }
  ): AsyncGenerator<string, void, unknown> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

    // Use provided model or default to Grok
    const model = params.model || 'google/gemini-2.5-flash-lite'
    
    console.log('📤 Sending message to OpenRouter API (Direct)...', { model })
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://rynk.io', // Replace with actual site URL
        'X-Title': 'rynk',
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        stream: true,
        max_tokens: 8192, // Prevent credit exhaustion with large contexts
      }),
    })

    console.log('📥 Received response:', response.status, response.statusText)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any
      console.error('❌ OpenRouter API error:', error)
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
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://rynk.io',
        'X-Title': 'rynk',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
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
    // Forward to Cloudflare AI Service
    // This keeps embedding logic unified across all providers
    const { getCloudflareAI } = await import('@/lib/services/cloudflare-ai')
    const aiProvider = getCloudflareAI()
    return aiProvider.getEmbeddings(text)
  }
}

// Create a singleton instance
let openRouterService: OpenRouterService | null = null

export function getOpenRouter(): OpenRouterService {
  if (!openRouterService) {
    openRouterService = new OpenRouterService()
  }
  return openRouterService
}
