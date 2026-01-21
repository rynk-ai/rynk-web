import type { Metadata } from 'next';
import DevilsAdvocateClient from './client';

export const metadata: Metadata = {
  title: "The Devil's Advocate - AI Logic Checker | rynk.",
  description: "A ruthless logical critique of your arguments and ideas. Not for the faint of heart. Stress-test your logic with AI.",
  keywords: ["argument critique", "logical fallacy checker", "debate partner", "critical thinking"],
  openGraph: {
    title: "The Devil's Advocate - AI Logic Checker | rynk.",
    description: "A ruthless logical critique of your arguments and ideas. Not for the faint of heart. Stress-test your logic with AI.",
    url: 'https://rynk.io/tools/devils-advocate',
    images: [
      {
        url: "https://og.rynk.io/api/tools?title=The%20Devil's%20Advocate&description=A%20ruthless%20logical%20critique%20of%20your%20arguments%20and%20ideas.%20Not%20for%20the%20faint%20of%20heart.",
        width: 1200,
        height: 630,
        alt: "The Devil's Advocate",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "The Devil's Advocate - AI Logic Checker | rynk.",
    description: "A ruthless logical critique of your arguments and ideas.",
    images: ["https://og.rynk.io/api/tools?title=The%20Devil's%20Advocate&description=A%20ruthless%20logical%20critique%20of%20your%20arguments%20and%20ideas.%20Not%20for%20the%20faint%20of%20heart."],
  },
  alternates: {
    canonical: '/tools/devils-advocate',
  },
};

export default function DevilsAdvocatePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: "The Devil's Advocate",
    applicationCategory: 'Analysis',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'A ruthless logical critique of your arguments and ideas.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DevilsAdvocateClient />
    </>
  );
}
