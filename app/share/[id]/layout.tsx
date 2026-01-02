import { Metadata } from 'next'
import { cloudDb } from '@/lib/services/cloud-db'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id: shareId } = await params

  // Default metadata
  let title = 'Shared Conversation'
  let description = 'View and continue this AI conversation on rynk.io'

  try {
    const share = await cloudDb.getShare(shareId)
    if (share && share.isActive) {
      title = share.title || 'Shared Conversation'
      description = `View "${title}" and continue the conversation on rynk.io`
    }
  } catch (error) {
    console.error('[Share Layout] Error fetching share metadata:', error)
  }

  return {
    title: `${title} | rynk.io`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'rynk.io',
      // OG image auto-discovered from opengraph-image.tsx
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      // Twitter image auto-discovered from opengraph-image.tsx
    },
  }
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
