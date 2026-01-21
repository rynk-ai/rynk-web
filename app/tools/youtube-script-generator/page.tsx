import type { Metadata } from 'next';
import YouTubeScriptClient from './client';

export const metadata: Metadata = {
  title: 'YouTube Script Generator - AI Video Scripts | rynk.',
  description: 'Create viral video scripts with ease. Generate hooks, intros, and content outlines for YouTube videos. Free AI script writer.',
  keywords: ["youtube script generator", "video script writer", "ai script writer", "content creator tools"],
  openGraph: {
    title: 'YouTube Script Generator - AI Video Scripts | rynk.',
    description: 'Create viral video scripts with ease. Generate hooks, intros, and content outlines for YouTube videos. Free AI script writer.',
    url: 'https://rynk.io/tools/youtube-script-generator',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Script%20Generator&description=Generate%20engaging%20YouTube%20scripts%20from%20simple%20prompts.',
        width: 1200,
        height: 630,
        alt: 'YouTube Script Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube Script Generator - AI Video Scripts | rynk.',
    description: 'Create viral video scripts with ease.',
    images: ['https://og.rynk.io/api/tools?title=Script%20Generator&description=Generate%20engaging%20YouTube%20scripts%20from%20simple%20prompts.'],
  },
  alternates: {
    canonical: '/tools/youtube-script-generator',
  },
};

export default function YouTubeScriptPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'YouTube Script Generator',
    applicationCategory: 'Marketing',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Create viral video scripts with ease.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <YouTubeScriptClient />
    </>
  );
}
