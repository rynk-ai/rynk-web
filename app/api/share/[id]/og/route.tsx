import { ImageResponse } from 'next/og'
import { cloudDb } from '@/lib/services/cloud-db'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shareId } = await params

  // Fetch share data
  let title = 'Shared Conversation'
  let preview = ''

  try {
    const share = await cloudDb.getShare(shareId)
    
    if (share && share.isActive) {
      title = share.title || 'Shared Conversation'
      
      // Get first user message for preview
      const { messages } = await cloudDb.getMessages(share.conversationId, 10)
      const firstUserMessage = messages.find((m: any) => m.role === 'user')
      if (firstUserMessage) {
        preview = firstUserMessage.content.slice(0, 120)
        if (firstUserMessage.content.length > 120) {
          preview += '...'
        }
      }
    }
  } catch (error) {
    console.error('[OG Image] Error fetching share:', error)
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0b',
          padding: '60px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header with logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            rynk.
          </div>
        </div>

        {/* Main content card */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: '#18181b',
            borderRadius: '24px',
            padding: '48px',
            border: '1px solid #27272a',
          }}
        >
          {/* Preview quote */}
          {preview && (
            <div
              style={{
                fontSize: '24px',
                color: '#a1a1aa',
                marginBottom: '24px',
                lineHeight: 1.4,
                display: 'flex',
              }}
            >
              "{preview}"
            </div>
          )}

          {/* Title */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#ffffff',
              lineHeight: 1.2,
              marginBottom: '16px',
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            {title.length > 60 ? title.slice(0, 60) + '...' : title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '20px',
              color: '#71717a',
              display: 'flex',
            }}
          >
            A shared conversation on rynk.io
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '24px',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              color: '#52525b',
              display: 'flex',
            }}
          >
            rynk.io
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
