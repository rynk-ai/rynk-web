import { NextRequest } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { 
  checkHumanizerRateLimit, 
  incrementHumanizerUsage,
  HUMANIZER_RATE_LIMIT,
  HUMANIZER_WINDOW_HOURS 
} from '@/lib/humanizer'
import { humanizerService } from '@/lib/services/humanizer-service'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext()
    
    // Check rate limit
    const rateLimitResult = await checkHumanizerRateLimit(env.DB, request)
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `You have exceeded the limit of ${HUMANIZER_RATE_LIMIT} requests per ${HUMANIZER_WINDOW_HOURS} hours. Please try again later.`,
          resetAt: rateLimitResult.resetAt.toISOString(),
          remaining: 0
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(HUMANIZER_RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString()
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
    
    if (text.length > 50000) {
      return new Response(
        JSON.stringify({ error: 'Text is too long. Maximum 50,000 characters allowed.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Increment usage (count this request)
    await incrementHumanizerUsage(env.DB, request)
    
    // Calculate new remaining after increment
    const newRemaining = rateLimitResult.remaining - 1
    
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
                remaining: newRemaining,
                resetAt: rateLimitResult.resetAt.toISOString()
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
        'X-RateLimit-Limit': String(HUMANIZER_RATE_LIMIT),
        'X-RateLimit-Remaining': String(newRemaining),
        'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString()
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
    const rateLimitResult = await checkHumanizerRateLimit(env.DB, request)
    
    return new Response(
      JSON.stringify({
        limit: HUMANIZER_RATE_LIMIT,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt.toISOString(),
        windowHours: HUMANIZER_WINDOW_HOURS
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
