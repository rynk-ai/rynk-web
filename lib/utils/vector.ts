/**
 * Vector operations for semantic search
 */

export interface SemanticSearchResult {
  messageId: string
  conversationId: string
  content: string
  score: number
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  if (normA === 0 || normB === 0) return 0
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Search embeddings by semantic similarity
 */
export function searchEmbeddings(
  queryVector: number[],
  embeddings: Array<{ 
    messageId: string
    conversationId: string
    content: string
    vector: number[] 
  }>,
  options: {
    limit?: number
    minScore?: number
  } = {}
): SemanticSearchResult[] {
  const { limit = 10, minScore = 0.3 } = options
  
  const results = embeddings.map(emb => ({
    messageId: emb.messageId,
    conversationId: emb.conversationId,
    content: emb.content,
    score: cosineSimilarity(queryVector, emb.vector)
  }))
  
  return results
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
