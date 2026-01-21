import type { Metadata } from 'next';
import CaseConverterClient from './client';

export const metadata: Metadata = {
  title: 'Case Converter - Online Text Tool | rynk.',
  description: 'Convert text between different cases instantly. Supports lowercase, UPPERCASE, Title Case, camelCase, and more.',
  keywords: ["case converter", "uppercase to lowercase", "title case", "camel case"],
  openGraph: {
    title: 'Case Converter - Online Text Tool | rynk.',
    description: 'Convert text between different cases instantly. Supports lowercase, UPPERCASE, Title Case, camelCase, and more.',
    url: 'https://rynk.io/tools/case-converter',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Case%20Converter&description=Convert%20text%20between%20different%20cases%20instantly.',
        width: 1200,
        height: 630,
        alt: 'Case Converter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Case Converter - Online Text Tool | rynk.',
    description: 'Convert text between different cases instantly.',
    images: ['https://og.rynk.io/api/tools?title=Case%20Converter&description=Convert%20text%20between%20different%20cases%20instantly.'],
  },
  alternates: {
    canonical: '/tools/case-converter',
  },
};

export default function CaseConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Case Converter',
    applicationCategory: 'Utility',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Convert text between different cases instantly.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CaseConverterClient />
    </>
  );
}
