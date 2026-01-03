import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free AI Humanizer - Transform AI Text to Human Writing | Rynk',
  description: 'Free AI humanizer tool. Transform ChatGPT, Claude, and AI-generated text into natural, human-written content. No sign-up required. Bypass AI detection instantly.',
  keywords: [
    'AI humanizer',
    'humanize AI text',
    'AI to human text converter',
    'bypass AI detection',
    'ChatGPT humanizer',
    'Claude humanizer',
    'AI text rewriter',
    'make AI text sound human',
    'undetectable AI',
    'AI paraphraser',
    'free AI humanizer',
    'humanize GPT text'
  ],
  openGraph: {
    title: 'Free AI Humanizer - Make AI Text Sound Human',
    description: 'Transform AI-generated text into natural, human-written content. Free tool, no sign-up required.',
    url: 'https://rynk.io/humanizer',
    siteName: 'Rynk',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Rynk AI Humanizer - Transform AI text to human writing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free AI Humanizer - Transform AI Text to Human Writing',
    description: 'Transform ChatGPT, Claude, and AI text into natural human writing. Free, no sign-up required.',
    images: ['/og-humanizer.png'],
  },
  alternates: {
    canonical: 'https://rynk.io/humanizer',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      'name': 'Rynk AI Humanizer',
      'description': 'Free online tool to transform AI-generated text into natural, human-written content',
      'url': 'https://rynk.io/humanizer',
      'applicationCategory': 'UtilityApplication',
      'operatingSystem': 'Web',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      },
      'featureList': [
        'Transform AI text to human writing',
        'Real-time streaming output',
        'No sign-up required',
        'Support for long documents',
        'Preserves original meaning'
      ]
    },
    {
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'What is an AI humanizer?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'An AI humanizer is a tool that rewrites AI-generated text to sound more natural and human-written, helping content pass AI detection tools while preserving the original meaning.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Is Rynk AI Humanizer free?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes, Rynk AI Humanizer is free to use. You get 30 free requests every 2 hours. Sign in for unlimited access.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Does it work with ChatGPT and Claude text?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes, the humanizer works with text from any AI including ChatGPT, Claude, Gemini, and other AI writing tools.'
          }
        }
      ]
    }
  ]
}

export default function HumanizerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
