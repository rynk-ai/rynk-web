import { NextRequest } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { auth } from '@/lib/auth'
import { 
  checkHumanizerRateLimit, 
  incrementHumanizerUsage,
  HUMANIZER_RATE_LIMIT,
  HUMANIZER_WINDOW_HOURS 
} from '@/lib/humanizer'
import { humanizerService } from '@/lib/services/humanizer-service'


export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext()
    
    // Check if user is authenticated
    const session = await auth()
    const isAuthenticated = !!session?.user?.id
    
    let rateLimitResult = null
    let newRemaining = -1 // -1 indicates unlimited for authenticated users
    
    // Only check rate limit for unauthenticated users
    if (!isAuthenticated) {
      rateLimitResult = await checkHumanizerRateLimit(env.DB, request)
      
      if (!rateLimitResult.allowed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `You have exceeded the limit of ${HUMANIZER_RATE_LIMIT} requests per ${HUMANIZER_WINDOW_HOURS} hours. Sign in for unlimited access.`,
            resetAt: rateLimitResult.resetAt.toISOString(),
            remaining: 0,
            requiresAuth: true
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
    
    // Only increment usage for unauthenticated users
    if (!isAuthenticated && rateLimitResult) {
      await incrementHumanizerUsage(env.DB, request)
      newRemaining = rateLimitResult.remaining - 1
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
                remaining: newRemaining,
                unlimited: isAuthenticated,
                resetAt: rateLimitResult?.resetAt?.toISOString() || null
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
    
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
    
    // Only add rate limit headers for unauthenticated users
    if (!isAuthenticated && rateLimitResult) {
      headers['X-RateLimit-Limit'] = String(HUMANIZER_RATE_LIMIT)
      headers['X-RateLimit-Remaining'] = String(newRemaining)
      headers['X-RateLimit-Reset'] = rateLimitResult.resetAt.toISOString()
    }
    
    return new Response(stream, { headers })
    
  } catch (error: any) {
    console.error('❌ [Humanizer API] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// GET endpoint to check rate limit status and auth status
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext()
    
    // Check if user is authenticated
    const session = await auth()
    const isAuthenticated = !!session?.user?.id
    
    // Authenticated users have unlimited access
    if (isAuthenticated) {
      return new Response(
        JSON.stringify({
          unlimited: true,
          isAuthenticated: true,
          user: {
            name: session?.user?.name,
            email: session?.user?.email
          }
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Unauthenticated users get rate limit info
    const rateLimitResult = await checkHumanizerRateLimit(env.DB, request)
    
    return new Response(
      JSON.stringify({
        unlimited: false,
        isAuthenticated: false,
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
