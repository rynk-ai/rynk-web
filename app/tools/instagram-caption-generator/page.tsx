import type { Metadata } from "next";
import InstagramCaptionClient from "./client";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Instagram Caption Generator - Free AI Tool | rynk.",
  description: "Generate engaging, witty, and viral Instagram captions in seconds for free using AI. No sign-up required.",
  keywords: ["instagram caption generator", "ig captions", "social media captions", "hashtag generator"],
  openGraph: {
    title: "Instagram Caption Generator - Free AI Tool | rynk.",
    description: "Generate engaging, witty, and viral Instagram captions in seconds for free using AI.",
    url: "https://rynk.io/tools/instagram-caption-generator",
    images: [
      {
        url: "https://og.rynk.io/api/tools?title=Instagram%20Caption%20Generator&description=Generate%20engaging,%20witty,%20and%20viral%20Instagram%20captions%20in%20seconds.",
        width: 1200,
        height: 630,
        alt: "Instagram Caption Generator",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Instagram Caption Generator - Free AI Tool | rynk.",
    description: "Generate engaging, witty, and viral Instagram captions in seconds.",
    images: ["https://og.rynk.io/api/tools?title=Instagram%20Caption%20Generator&description=Generate%20engaging,%20witty,%20and%20viral%20Instagram%20captions%20in%20seconds."],
  },
  alternates: {
    canonical: '/tools/instagram-caption-generator',
  },
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Instagram Caption Generator",
    "applicationCategory": "SocialNetworkingApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Generate engaging, witty, and viral Instagram captions in seconds for free using AI.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "120"
    }
  };

  return (
    <>
      <Script
        id="instagram-caption-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <InstagramCaptionClient />
    </>
  );
}
