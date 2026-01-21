import type { Metadata } from 'next';
import LandingRoasterClient from './client';

export const metadata: Metadata = {
  title: 'Landing Page Roaster - AI Website Audit | rynk.',
  description: 'Brutal, data-driven audits of your landing page. We don\'t sugarcoat your bad conversion rates. Free website roast.',
  keywords: ["landing page audit", "website critique", "conversion optimization", "landing page feedback"],
  openGraph: {
    title: 'Landing Page Roaster - AI Website Audit | rynk.',
    description: 'Brutal, data-driven audits of your landing page. We don\'t sugarcoat your bad conversion rates. Free website roast.',
    url: 'https://rynk.io/tools/landing-page-roaster',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Landing%20Roaster&description=Get%20a%20brutal,%20data-driven%20audit%20of%20your%20landing%20page\'s%20conversion%20killers.',
        width: 1200,
        height: 630,
        alt: 'Landing Page Roaster',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Landing Page Roaster - AI Website Audit | rynk.',
    description: 'Brutal, data-driven audits of your landing page. We don\'t sugarcoat your bad conversion rates.',
    images: ['https://og.rynk.io/api/tools?title=Landing%20Roaster&description=Get%20a%20brutal,%20data-driven%20audit%20of%20your%20landing%20page\'s%20conversion%20killers.'],
  },
  alternates: {
    canonical: '/tools/landing-page-roaster',
  },
};

export default function LandingRoasterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Landing Page Roaster',
    applicationCategory: 'Analysis',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Get a brutal, data-driven audit of your landing page\'s conversion killers.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingRoasterClient />
    </>
  );
}
