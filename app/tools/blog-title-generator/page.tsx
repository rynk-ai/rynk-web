import type { Metadata } from 'next';
import BlogTitleClient from './client';

export const metadata: Metadata = {
  title: 'Blog Title Generator - Free | rynk.',
  description: 'Generate click-worthy blog titles that drive traffic. Free SEO title generator.',
  keywords: ["blog title generator", "headline generator", "catchy titles", "content ideas"],
  openGraph: {
    title: 'Blog Title Generator - Free | rynk.',
    description: 'Generate click-worthy blog titles that drive traffic. Free SEO title generator.',
    url: 'https://rynk.io/tools/blog-title-generator',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Blog%20Title%20Generator&description=Generate%20click-worthy%20blog%20titles%20that%20drive%20traffic.',
        width: 1200,
        height: 630,
        alt: 'Blog Title Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog Title Generator - Free | rynk.',
    description: 'Generate click-worthy blog titles that drive traffic.',
    images: ['https://og.rynk.io/api/tools?title=Blog%20Title%20Generator&description=Generate%20click-worthy%20blog%20titles%20that%20drive%20traffic.'],
  },
  alternates: {
    canonical: '/tools/blog-title-generator',
  },
};

export default function BlogTitlePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Blog Title Generator',
    applicationCategory: 'Marketing',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Generate click-worthy blog titles that drive traffic.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogTitleClient />
    </>
  );
}
