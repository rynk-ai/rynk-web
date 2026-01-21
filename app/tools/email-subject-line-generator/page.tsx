import type { Metadata } from 'next';
import EmailSubjectClient from './client';

export const metadata: Metadata = {
  title: 'Email Subject Line Generator - Free AI Tool | rynk.',
  description: "Boost your open rates with AI-crafted subject lines that scream 'Click me'. Free email subject generator.",
  keywords: ["email subject generator", "subject line tester", "newsletter titles", "email marketing"],
  openGraph: {
    title: 'Email Subject Line Generator - Free AI Tool | rynk.',
    description: "Boost your open rates with AI-crafted subject lines that scream 'Click me'. Free email subject generator.",
    url: 'https://rynk.io/tools/email-subject-line-generator',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Email%20Subject%20Line%20Generator&description=Create%20high-converting%20email%20subject%20lines%20instantly.',
        width: 1200,
        height: 630,
        alt: 'Email Subject Line Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Email Subject Line Generator - Free AI Tool | rynk.',
    description: "Boost your open rates with AI-crafted subject lines that scream 'Click me'.",
    images: ['https://og.rynk.io/api/tools?title=Email%20Subject%20Line%20Generator&description=Create%20high-converting%20email%20subject%20lines%20instantly.'],
  },
  alternates: {
    canonical: '/tools/email-subject-line-generator',
  },
};

export default function EmailSubjectPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Email Subject Line Generator',
    applicationCategory: 'Marketing',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: "Boost your open rates with AI-crafted subject lines that scream 'Click me'.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EmailSubjectClient />
    </>
  );
}
