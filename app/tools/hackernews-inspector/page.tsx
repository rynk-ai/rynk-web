import type { Metadata } from 'next';
import HNInspectorClient from './client';

export const metadata: Metadata = {
  title: 'HackerNews Inspector - Hivemind Sentiment Analysis | rynk.',
  description: 'Query the hivemind. Summarize sentiment and arguments from top HackerNews threads. AI analysis of HN discussions.',
  keywords: ["hacker news analysis", "hn sentiment", "hacker news trends", "tech sentiment"],
  openGraph: {
    title: 'HackerNews Inspector - Hivemind Sentiment Analysis | rynk.',
    description: 'Query the hivemind. Summarize sentiment and arguments from top HackerNews threads. AI analysis of HN discussions.',
    url: 'https://rynk.io/tools/hackernews-inspector',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=HN%20Inspector&description=Analyze%20the%20sentiment%20of%20the%20intellectual%20crowd%20on%20HackerNews.',
        width: 1200,
        height: 630,
        alt: 'HackerNews Inspector',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HackerNews Inspector - Hivemind Sentiment Analysis | rynk.',
    description: 'Query the hivemind. Summarize sentiment and arguments from top HackerNews threads.',
    images: ['https://og.rynk.io/api/tools?title=HN%20Inspector&description=Analyze%20the%20sentiment%20of%20the%20intellectual%20crowd%20on%20HackerNews.'],
  },
  alternates: {
    canonical: '/tools/hackernews-inspector',
  },
};

export default function HNInspectorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'HackerNews Inspector',
    applicationCategory: 'Analysis',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Analyze the sentiment of the intellectual crowd on HackerNews.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HNInspectorClient />
    </>
  );
}
