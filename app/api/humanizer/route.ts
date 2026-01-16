import { NextRequest } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { auth } from '@/lib/auth'
import { checkAndConsumeToolLimit, getToolLimitInfo } from '@/lib/tools/rate-limit'
import { humanizerService } from '@/lib/services/humanizer-service'

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext()
    
    // Check Rate Limit (Unified)
    const result = await checkAndConsumeToolLimit(env.DB, request, 'humanizer')
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: result.error || 'Rate limit exceeded',
          resetAt: result.resetAt?.toISOString(),
          remaining: 0
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetAt?.toISOString() || ''
          } 
        }
      )
    }
    
    const { text } = await request.json() as { text: string }
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Create streaming response
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ 
                type: 'meta', 
                unlimited: !result.isGuest,
                remaining: result.remaining
              })}\n\n`
            )
          )
          
          // Stream humanized chunks
          for await (const event of humanizerService.humanizeTextStream(text)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            )
          }
          
          controller.close()
        } catch (error: any) {
          console.error('❌ [Humanizer API] Stream error:', error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`
            )
          )
          controller.close()
        }
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
    
  } catch (error: any) {
    console.error('❌ [Humanizer API] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// GET endpoint to check rate limit status
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext()
    const result = await getToolLimitInfo(env.DB, request, 'humanizer')
    
    return new Response(
      JSON.stringify({
        unlimited: !result.isGuest,
        remaining: result.remaining,
        resetAt: result.resetAt?.toISOString(),
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error: any) {
    console.error('❌ [Humanizer API] GET Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
