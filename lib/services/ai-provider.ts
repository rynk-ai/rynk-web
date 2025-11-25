export type TextContent = {
  type: 'text'
  text: string
}

export type ImageContent = {
  type: 'image_url'
  image_url: {
    url: string
    detail?: 'low' | 'high' | 'auto'
  }
}

export type MessageContent = TextContent | ImageContent

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string | MessageContent[]
}

export interface ChatCompletionParams {
  messages: Message[]
}

export interface AIProvider {
  sendMessage(params: ChatCompletionParams): AsyncGenerator<string, void, unknown>
  sendMessageOnce(params: ChatCompletionParams): Promise<string>
  getEmbeddings(text: string, timeoutMs?: number): Promise<number[]>
}
