import { ImageResponse } from 'next/og'
import { cloudDb } from '@/lib/services/cloud-db'

export const alt = 'Shared Conversation Preview'
export const size = {
  width: 1200,
  height: 600,
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
        preview = firstUserMessage.content.slice(0, 100) + (firstUserMessage.content.length > 100 ? '...' : '')
      }
    }
  } catch (error) {
    console.error('Error fetching share for Twitter image:', error)
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
          padding: '50px',
        }}
      >
        {/* Top section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            width: '100%',
          }}
        >
          {/* Logo/Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="24"
                height="24"
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
                fontSize: '20px',
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
              fontSize: '48px',
              fontWeight: 700,
              color: '#fafafa',
              lineHeight: 1.2,
              maxWidth: '900px',
            }}
          >
            {title.length > 60 ? title.slice(0, 60) + '...' : title}
          </div>

          {/* Preview */}
          {preview && (
            <div
              style={{
                fontSize: '20px',
                color: '#71717a',
                lineHeight: 1.4,
                maxWidth: '800px',
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
            gap: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'rgba(99, 102, 241, 0.15)',
              borderRadius: '10px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <span
              style={{
                fontSize: '16px',
                fontWeight: 500,
                color: '#818cf8',
              }}
            >
              {messageCount} messages
            </span>
          </div>

          <div
            style={{
              fontSize: '16px',
              color: '#a1a1aa',
            }}
          >
            View and continue this conversation →
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
