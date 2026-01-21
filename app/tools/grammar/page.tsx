import type { Metadata } from 'next';
import GrammarClient from './client';

export const metadata: Metadata = {
  title: 'Grammar Polisher - AI Grammar Checker | rynk.',
  description: 'Free AI grammar checker. Fix grammar, spelling, and style issues instantly with detailed explanations.',
  keywords: ["grammar checker", "spell checker", "punctuation corrector", "proofreading tool"],
  openGraph: {
    title: 'Grammar Polisher - AI Grammar Checker | rynk.',
    description: 'Free AI grammar checker. Fix grammar, spelling, and style issues instantly with detailed explanations.',
    url: 'https://rynk.io/tools/grammar',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Grammar%20Polisher&description=Fix%20grammar,%20spelling,%20and%20punctuation%20with%20explanations.',
        width: 1200,
        height: 630,
        alt: 'Grammar Polisher',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grammar Polisher - AI Grammar Checker | rynk.',
    description: 'Free AI grammar checker. Fix grammar, spelling, and style issues instantly.',
    images: ['https://og.rynk.io/api/tools?title=Grammar%20Polisher&description=Fix%20grammar,%20spelling,%20and%20punctuation%20with%20explanations.'],
  },
  alternates: {
    canonical: '/tools/grammar',
  },
};

export default function GrammarPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Grammar Polisher',
    applicationCategory: 'Utility',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Fix grammar, spelling, and punctuation with explanations.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GrammarClient />
    </>
  );
}
