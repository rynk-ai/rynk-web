import { Metadata } from 'next'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  // Fetch share data for metadata
  let title = 'Shared Conversation'
  let description = 'View and continue this AI conversation on rynk.io'
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    const res = await fetch(`${baseUrl}/api/share/${id}`, {
      cache: 'no-store',
    })
    
    if (res.ok) {
      const data = await res.json() as {
        share?: { title?: string };
        conversation?: { title?: string };
        messages?: any[];
      }
      title = data.share?.title || data.conversation?.title || 'Shared Conversation'
      description = `${data.messages?.length || 0} messages • View and continue this conversation on rynk.io`
    }
  } catch (error) {
    console.error('Error fetching share metadata:', error)
  }
  
  return {
    title: `${title} | rynk.io`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'rynk.io',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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
