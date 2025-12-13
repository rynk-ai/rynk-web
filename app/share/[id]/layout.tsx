import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shared Conversation | rynk.io',
  description: 'View and continue this AI conversation on rynk.io',
  openGraph: {
    title: 'Shared Conversation',
    description: 'View and continue this AI conversation on rynk.io',
    type: 'article',
    siteName: 'rynk.io',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shared Conversation',
    description: 'View and continue this AI conversation on rynk.io',
    images: ['/og-image.png'],
  },
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
