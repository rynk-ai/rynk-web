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

export function getAIProvider(hasFiles: boolean = false): AIProvider {
  // Auto-select based on file presence
  // Use Groq for text-only queries (faster, cheaper)
  // Use OpenRouter for queries with files (supports multimodal)
  
  if (hasFiles) {
    console.log('🖼️ [AI Provider] Files detected - using OpenRouter for multimodal support')
    return getOpenRouter()
  } else {
    console.log('💬 [AI Provider] Text-only query - using Groq for speed')
    return getGroqProvider()
  }
}
