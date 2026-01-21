import type { Metadata } from 'next';
import YouTubeGeneratorClient from './client';

export const metadata: Metadata = {
  title: 'YouTube Title Generator - Viral Title Maker | rynk.',
  description: 'Generate click-worthy, viral YouTube titles using AI research. Detailed analysis and scoring for video titles.',
  keywords: ["youtube title generator", "viral titles", "video catchy titles", "youtube seo"],
  openGraph: {
    title: 'YouTube Title Generator - Viral Title Maker | rynk.',
    description: 'Generate click-worthy, viral YouTube titles using AI research. Detailed analysis and scoring for video titles.',
    url: 'https://rynk.io/tools/youtube-title-generator',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Viral%20Title%20Gen&description=Generate%20YouTube%20titles%20backed%20by%20deep%20research.',
        width: 1200,
        height: 630,
        alt: 'YouTube Title Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube Title Generator - Viral Title Maker | rynk.',
    description: 'Generate click-worthy, viral YouTube titles using AI research.',
    images: ['https://og.rynk.io/api/tools?title=Viral%20Title%20Gen&description=Generate%20YouTube%20titles%20backed%20by%20deep%20research.'],
  },
  alternates: {
    canonical: '/tools/youtube-title-generator',
  },
};

export default function YouTubeGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'YouTube Title Generator',
    applicationCategory: 'Marketing',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Generate click-worthy, viral YouTube titles using AI research.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <YouTubeGeneratorClient />
    </>
  );
}
