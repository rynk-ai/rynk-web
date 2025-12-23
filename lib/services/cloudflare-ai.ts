
import { getCloudflareContext } from '@opennextjs/cloudflare'

export interface AIService {
  getEmbeddings(text: string): Promise<number[]>
}

export class CloudflareAIService implements AIService {
  private ai: any

  constructor() {
    try {
      this.ai = getCloudflareContext().env.AI
    } catch (error) {
      console.warn('⚠️ [CloudflareAIService] AI binding not found in context (ok during build)')
    }
  }

  async getEmbeddings(text: string): Promise<number[]> {
    if (!this.ai) {
      try {
        this.ai = getCloudflareContext().env.AI
      } catch (e) {
        throw new Error('Cloudflare AI binding not available')
      }
    }

    // Use BGE-Base-EN-v1.5 (768 dimensions) - Best value/performance on CF
    const response = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
      text: [text]
    })
    
    // Response format: { shape: [1, 768], data: [[...]] }
    if (response && response.data && response.data[0]) {
      return response.data[0]
    }
    
    throw new Error('Failed to generate embeddings: Invalid response format')
  }
}

// Singleton instance
let instance: CloudflareAIService | null = null

export function getCloudflareAI(): CloudflareAIService {
  if (!instance) {
    instance = new CloudflareAIService()
  }
  return instance
}
