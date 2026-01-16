import { NextRequest } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { auth } from '@/lib/auth'
import { checkAndConsumeToolLimit } from '@/lib/tools/rate-limit'
import { youtubeResearchStream } from '@/lib/services/tools/youtube-research'

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext()
    const { niche } = await request.json() as { niche: string }
    
    if (!niche || typeof niche !== 'string') {
      return new Response(JSON.stringify({ error: 'Niche is required' }), { status: 400 })
    }

    // Rate Limit Check
    const result = await checkAndConsumeToolLimit(env.DB, request, 'youtube-research')
    if (!result.allowed) {
        return new Response(JSON.stringify({ 
            error: 'Rate limit exceeded', 
            message: result.error, 
            resetAt: result.resetAt 
        }), { status: 429 })
    }

    // Stream Response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of youtubeResearchStream(niche)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          }
          controller.close()
        } catch (error: any) {
          console.error('[YouTube API] Stream error:', error)
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
    console.error('[YouTube API] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500 }
    )
  }
}
