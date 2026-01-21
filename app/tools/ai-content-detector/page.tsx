import type { Metadata } from 'next';
import AIDetectorClient from './client';

export const metadata: Metadata = {
  title: 'AI Content Detector - Free | rynk.',
  description: 'Analyze text to determine if it was written by AI or a human. Free tool, no sign-up required.',
  keywords: ["ai detector", "chatgpt detector", "ai content checker", "ai writing detector", "ai content detector"],
  openGraph: {
    title: 'AI Content Detector - Free | rynk.',
    description: 'Analyze text to determine if it was written by AI or a human. Free tool, no sign-up required.',
    url: 'https://rynk.io/tools/ai-content-detector',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=AI%20Content%20Detector&description=Analyze%20text%20to%20determine%20if%20it%20was%20written%20by%20AI%20or%20a%20human.',
        width: 1200,
        height: 630,
        alt: 'AI Content Detector',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Content Detector - Free | rynk.',
    description: 'Analyze text to determine if it was written by AI or a human.',
    images: ['https://og.rynk.io/api/tools?title=AI%20Content%20Detector&description=Analyze%20text%20to%20determine%20if%20it%20was%20written%20by%20AI%20or%20a%20human.'],
  },
  alternates: {
    canonical: '/tools/ai-content-detector',
  },
};

export default function AIDetectorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AI Content Detector',
    applicationCategory: 'Analysis',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Analyze text to determine if it was written by AI or a human.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AIDetectorClient />
    </>
  );
}
