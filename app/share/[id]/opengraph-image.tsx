import { ImageResponse } from 'next/og'
import { cloudDb } from '@/lib/services/cloud-db'

export const alt = 'Shared Conversation Preview'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image({ params }: { params: { id: string } }) {
  const shareId = params.id

  // Fetch share data
  let title = 'Shared Conversation'
  let messageCount = 0
  let preview = ''

  try {
    const share = await cloudDb.getShare(shareId)
    if (share) {
      title = share.title || 'Shared Conversation'
      
      // Get messages for preview
      const { messages } = await cloudDb.getMessages(share.conversationId, 10)
      messageCount = messages.length
      
      // Get first user message as preview
      const firstUserMessage = messages.find(m => m.role === 'user')
      if (firstUserMessage) {
        preview = firstUserMessage.content.slice(0, 120) + (firstUserMessage.content.length > 120 ? '...' : '')
      }
    }
  } catch (error) {
    console.error('Error fetching share for OG image:', error)
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#0a0a0a',
          padding: '60px',
        }}
      >
        {/* Top section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            width: '100%',
          }}
        >
          {/* Logo/Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: '#a1a1aa',
              }}
            >
              rynk.io
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 700,
              color: '#fafafa',
              lineHeight: 1.2,
              maxWidth: '900px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {title}
          </div>

          {/* Preview */}
          {preview && (
            <div
              style={{
                fontSize: '24px',
                color: '#71717a',
                lineHeight: 1.5,
                maxWidth: '900px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              "{preview}"
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
          }}
        >
          {/* Message count badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'rgba(99, 102, 241, 0.15)',
              borderRadius: '12px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#818cf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 500,
                color: '#818cf8',
              }}
            >
              {messageCount} messages
            </span>
          </div>

          {/* CTA */}
          <div
            style={{
              fontSize: '18px',
              color: '#a1a1aa',
            }}
          >
            Click to view and continue this conversation
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
