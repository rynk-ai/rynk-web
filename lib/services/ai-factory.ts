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

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase()

  if (provider === 'groq') {
    return getGroqProvider()
  }

  // Default to OpenRouter
  return getOpenRouter()
}
