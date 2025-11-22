type TextContent = {
  type: 'text'
  text: string
}

type ImageContent = {
  type: 'image_url'
  image_url: {
    url: string
    detail?: 'low' | 'high' | 'auto'
  }
}

type MessageContent = TextContent | ImageContent

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string | MessageContent[]
}

interface ChatCompletionParams {
  messages: Message[]
}

class OpenRouterService {
  private baseUrl = ''

  constructor() {
    this.baseUrl = ''
  }

  async *sendMessage(params: ChatCompletionParams): AsyncGenerator<string, void, unknown> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: params.messages,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any
      throw new Error(error.error?.message || `HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6)

            if (data === '[DONE]') {
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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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

  async getEmbeddings(text: string): Promise<number[]> {
    // Call OpenRouter directly instead of going through /api/embeddings
    // This is necessary because server-side code can't use relative paths
    const apiKey = process.env.OPENROUTER_API_KEY
    
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured')
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
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

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any
      throw new Error(error.error?.message || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json() as any
    return data.data[0].embedding
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

export type { Message, ChatCompletionParams }
