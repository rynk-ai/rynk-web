import type { Metadata } from "next";
import InstagramCaptionClient from "./client";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Instagram Caption Generator - Free AI Tool | rynk.",
  description: "Generate engaging, witty, and viral Instagram captions in seconds for free using AI. No sign-up required.",
  openGraph: {
    title: "Instagram Caption Generator - Free AI Tool | rynk.",
    description: "Generate engaging, witty, and viral Instagram captions in seconds for free using AI.",
    url: "https://rynk.io/tools/instagram-caption-generator",
    images: [
      {
        url: "/og-image.png", // Ensure this exists or use a specific one
        width: 1200,
        height: 630,
        alt: "Instagram Caption Generator",
      },
    ],
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
