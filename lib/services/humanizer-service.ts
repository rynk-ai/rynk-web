/**
 * Humanizer Service
 * 
 * Core service for humanizing AI-generated text using Kimi K2 model via Groq API.
 * Processes text in chunks and streams results back to the client.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'moonshotai/kimi-k2-instruct-0905'

// Max chunk size in characters (roughly ~500 words)
const MAX_CHUNK_SIZE = 2500

const HUMANIZER_SYSTEM_PROMPT = `You are an expert content rewriter. Your task is to rewrite AI-generated text to sound natural and human-written while preserving all meaning and facts.

# WRITING STYLE TO FOLLOW:

• Use clear, simple language.
• Be spartan and informative.
• Use short, impactful sentences.
• Use active voice. Avoid passive voice.
• Focus on practical, actionable insights.
• Use data and examples to support claims when possible.
• Use "you" and "your" to directly address the reader.

# AVOID THESE:

• Em dashes (—). Use commas, periods, or semicolons instead.
• Constructions like "not just this, but also this".
• Metaphors and clichés.
• Generalizations.
• Setup language like "in conclusion", "in closing", etc.
• Unnecessary adjectives and adverbs.
• Markdown formatting or asterisks.
• These words: can, may, just, that, very, really, literally, actually, certainly, probably, basically, could, maybe, delve, embark, enlightening, esteemed, shed light, craft, crafting, imagine, realm, game-changer, unlock, discover, skyrocket, abyss, revolutionize, disruptive, utilize, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, however, harness, exciting, groundbreaking, cutting-edge, remarkable, glimpse into, navigating, landscape, stark, testament, moreover, boost, skyrocketing, powerful, ever-evolving

# INSTRUCTIONS:

1. Rewrite the text to sound human-written.
2. Preserve all original meaning and facts.
3. Keep the original structure (paragraphs, lists).
4. Output ONLY the rewritten text. No explanations or meta-commentary.

Rewrite this text:`

/**
 * Split text into processable chunks
 */
export function chunkText(text: string, maxSize: number = MAX_CHUNK_SIZE): string[] {
  const chunks: string[] = []
  
  // Try to split on paragraph boundaries first
  const paragraphs = text.split(/\n\n+/)
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    // If single paragraph is too long, split by sentences
    if (paragraph.length > maxSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
      
      // Split long paragraph by sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+\s*/g) || [paragraph]
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxSize) {
          if (currentChunk) {
            chunks.push(currentChunk.trim())
          }
          currentChunk = sentence
        } else {
          currentChunk += sentence
        }
      }
    } else if (currentChunk.length + paragraph.length + 2 > maxSize) {
      // Current chunk + paragraph would exceed max
      chunks.push(currentChunk.trim())
      currentChunk = paragraph
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

/**
 * Humanize a single chunk of text (non-streaming)
 */
export async function humanizeChunk(text: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')
  
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: HUMANIZER_SYSTEM_PROMPT },
        { role: 'user', content: text }
      ],
      stream: false,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any
    throw new Error(error.error?.message || `HTTP error: ${response.status}`)
  }
  
  const data = await response.json() as any
  return data.choices?.[0]?.message?.content || ''
}

/**
 * Humanize text with streaming response
 */
export async function* humanizeTextStream(text: string): AsyncGenerator<{ type: 'chunk' | 'progress' | 'done'; data: string; chunkIndex?: number; totalChunks?: number }, void, unknown> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')
  
  const chunks = chunkText(text)
  const totalChunks = chunks.length
  
  console.log(`📝 [Humanizer] Processing ${totalChunks} chunks`)
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    
    yield { 
      type: 'progress', 
      data: `Processing chunk ${i + 1} of ${totalChunks}`,
      chunkIndex: i,
      totalChunks 
    }
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: HUMANIZER_SYSTEM_PROMPT },
          { role: 'user', content: chunk }
        ],
        stream: true,
      }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any
      throw new Error(error.error?.message || `HTTP error: ${response.status}`)
    }
    
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')
    
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
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue
          
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) {
              yield { type: 'chunk', data: delta, chunkIndex: i, totalChunks }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
    
    // Add paragraph break between chunks (except for last)
    if (i < chunks.length - 1) {
      yield { type: 'chunk', data: '\n\n', chunkIndex: i, totalChunks }
    }
  }
  
  yield { type: 'done', data: 'Humanization complete' }
}

export const humanizerService = {
  chunkText,
  humanizeChunk,
  humanizeTextStream,
}
