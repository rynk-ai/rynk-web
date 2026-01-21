import type { Metadata } from 'next';
import ParaphraserClient from './client';

export const metadata: Metadata = {
  title: 'Paraphrasing Tool - Free AI Paraphraser | rynk.',
  description: 'Rewrite text in different styles while preserving the original meaning. Free AI paraphraser tool.',
  keywords: ["paraphraser", "text rewriter", "rephrase tool", "article spinner"],
  openGraph: {
    title: 'Paraphrasing Tool - Free AI Paraphraser | rynk.',
    description: 'Rewrite text in different styles while preserving the original meaning. Free AI paraphraser tool.',
    url: 'https://rynk.io/tools/paraphraser',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Paraphrasing%20Tool&description=Rewrite%20text%20in%20different%20styles%20while%20preserving%20meaning.',
        width: 1200,
        height: 630,
        alt: 'Paraphrasing Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Paraphrasing Tool - Free AI Paraphraser | rynk.',
    description: 'Rewrite text in different styles while preserving the original meaning.',
    images: ['https://og.rynk.io/api/tools?title=Paraphrasing%20Tool&description=Rewrite%20text%20in%20different%20styles%20while%20preserving%20meaning.'],
  },
  alternates: {
    canonical: '/tools/paraphraser',
  },
};

export default function ParaphraserPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Paraphrasing Tool',
    applicationCategory: 'Broad',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Rewrite text in different styles while preserving the original meaning.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ParaphraserClient />
    </>
  );
}
