import { AIProvider } from './ai-provider'
import { getOpenRouter } from './openrouter'
import { GroqProvider } from './groq-provider'

let groqProvider: GroqProvider | null = null

function getGroqProvider(): GroqProvider {
  if (!groqProvider) {
    groqProvider = new GroqProvider()
  }
  return groqProvider
}

/**
 * Get the appropriate AI provider based on context.
 * @param hasFiles - Whether the request contains files (requires multimodal)
 */
export function getAIProvider(hasFiles: boolean = false): AIProvider {
  // Use OpenRouter only for multimodal (files/images)
  if (hasFiles) {
    console.log('🖼️ [AI Provider] Files detected - using Groq (Vision) for multimodal support')
    return getGroqProvider()
  } else {
    console.log('💬 [AI Provider] Using Groq with Kimi K2 Instruct')
    return getGroqProvider()
  }
}

