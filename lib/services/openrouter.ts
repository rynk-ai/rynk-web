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
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

    console.log('📤 Sending message to OpenRouter API (Direct)...')
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://simplychat.ai', // Replace with actual site URL
        'X-Title': 'SimplyChat',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-5-haiku',
        messages: params.messages,
        stream: true,
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
        'HTTP-Referer': 'https://simplychat.ai',
        'X-Title': 'SimplyChat',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-5-haiku',
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
    // Call OpenRouter directly instead of going through /api/embeddings
    // This is necessary because server-side code can't use relative paths
    const apiKey = process.env.OPENROUTER_API_KEY
    
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured')
    }
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Embedding generation timeout after ${timeoutMs}ms`)), timeoutMs)
    })
    
    // Race the fetch against the timeout
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

// Create a singleton instance
let openRouterService: OpenRouterService | null = null

export function getOpenRouter(): OpenRouterService {
  if (!openRouterService) {
    openRouterService = new OpenRouterService()
  }
  return openRouterService
}

export type { Message, ChatCompletionParams }
