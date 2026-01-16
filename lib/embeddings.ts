/**
 * Embeddings generation using OpenAI's text-embedding-3-small model
 * via OpenRouter API
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured')
  }

  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:8788',
      'X-Title': 'SimpleChat',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: { message: 'Unknown error' } 
    })) as { error?: { message?: string } }
    throw new Error(
      error.error?.message || `Embedding API error: ${response.status}`
    )
  }

  const data = await response.json() as { data?: Array<{ embedding?: number[] }> }
  const embedding = data.data?.[0]?.embedding

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Invalid embedding response from API')
  }

  return embedding
}
