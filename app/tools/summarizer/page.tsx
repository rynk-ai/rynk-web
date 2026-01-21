import type { Metadata } from 'next';
import SummarizerClient from './client';

export const metadata: Metadata = {
  title: 'Text Summarizer - Free AI Summary Tool | rynk.',
  description: 'Condense long articles and documents into clear, concise summaries. Free AI summarizer.',
  keywords: ["text summarizer", "article summarizer", "summary generator", "tl;dr generator"],
  openGraph: {
    title: 'Text Summarizer - Free AI Summary Tool | rynk.',
    description: 'Condense long articles and documents into clear, concise summaries. Free AI summarizer.',
    url: 'https://rynk.io/tools/summarizer',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Text%20Summarizer&description=Condense%20long%20articles%20into%20clear,%20concise%20summaries.',
        width: 1200,
        height: 630,
        alt: 'Text Summarizer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Text Summarizer - Free AI Summary Tool | rynk.',
    description: 'Condense long articles and documents into clear, concise summaries.',
    images: ['https://og.rynk.io/api/tools?title=Text%20Summarizer&description=Condense%20long%20articles%20into%20clear,%20concise%20summaries.'],
  },
  alternates: {
    canonical: '/tools/summarizer',
  },
};

export default function SummarizerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Text Summarizer',
    applicationCategory: 'Writing',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Condense long articles into clear, concise summaries.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SummarizerClient />
    </>
  );
}
