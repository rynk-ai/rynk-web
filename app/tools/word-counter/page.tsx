import type { Metadata } from 'next';
import WordCounterClient from './client';

export const metadata: Metadata = {
  title: 'Word Counter - Free Character & Word Count Tool | rynk.',
  description: 'Count words, characters, sentences, and paragraphs instantly. Free online word counter with reading time estimation.',
  keywords: ["word counter", "character count", "sentence counter", "reading time calculator"],
  openGraph: {
    title: 'Word Counter - Free Character & Word Count Tool | rynk.',
    description: 'Count words, characters, sentences, and paragraphs instantly. Free online word counter with reading time estimation.',
    url: 'https://rynk.io/tools/word-counter',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Word%20Counter&description=Count%20words,%20characters,%20sentences,%20and%20reading%20time.',
        width: 1200,
        height: 630,
        alt: 'Word Counter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word Counter - Free Character & Word Count Tool | rynk.',
    description: 'Count words, characters, sentences, and paragraphs instantly.',
    images: ['https://og.rynk.io/api/tools?title=Word%20Counter&description=Count%20words,%20characters,%20sentences,%20and%20reading%20time.'],
  },
  alternates: {
    canonical: '/tools/word-counter',
  },
};

export default function WordCounterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Word Counter',
    applicationCategory: 'Utility',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Count words, characters, sentences, and paragraphs instantly.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WordCounterClient />
    </>
  );
}
