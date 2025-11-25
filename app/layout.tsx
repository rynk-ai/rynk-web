import type { Metadata } from "next";

export const runtime = 'edge';

import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rynk.io"),
  title: {
    default: "rynk. - AI Chat with File Uploads & Message Versioning",
    template: "%s | rynk."
  },
  description:
    "rynk. is a powerful AI chat application featuring file uploads, message versioning, conversation branching, and context-aware responses. Edit messages, reference past conversations, and collaborate with AI.",
  keywords: [
    "AI chat",
    "artificial intelligence",
    "chatbot",
    "conversational AI",
    "message versioning",
    "file upload",
    "PDF chat",
    "markdown chat",
    "conversation branching",
    "AI assistant",
    "chat history",
    "context picker"
  ],
  authors: [{ name: "rynk. Team" }],
  creator: "rynk.",
  publisher: "rynk.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rynk.io",
    title: "rynk. - AI Chat with File Uploads & Message Versioning",
    description:
      "rynk. is a powerful AI chat application featuring file uploads, message versioning, conversation branching, and context-aware responses. Edit messages, reference past conversations, and collaborate with AI.",
    siteName: "rynk.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "rynk. - AI Chat Application Interface"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "rynk. - AI Chat with File Uploads & Message Versioning",
    description:
      "rynk. is a powerful AI chat application featuring file uploads, message versioning, conversation branching, and context-aware responses. Edit messages, reference past conversations, and collaborate with AI.",
    creator: "@rynk",
    images: ["/og-image.png"]
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png"
  },
  manifest: "/manifest.json",
  verification: {
    google: "verification-token",
  },
  alternates: {
    canonical: "https://rynk.io"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>

        {/* Structured Data (JSON-LD) for SEO */}
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "rynk.",
              "url": "https://rynk.io",
              "logo": "https://rynk.io/favicon.ico",
              "description": "AI chat application with advanced features like file uploads, message versioning, and conversation branching.",
              "sameAs": [
                "https://twitter.com/rynk",
                "https://github.com/rynk"
              ]
            })
          }}
        />

        <Script
          id="software-application-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "rynk.",
              "applicationCategory": "AI Application",
              "operatingSystem": "Any",
              "description": "AI chat application featuring file uploads, message versioning, conversation branching, and context-aware responses.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "AI-powered chat with file uploads",
                "Message versioning and editing",
                "Conversation branching",
                "Context picker for referencing past conversations",
                "PDF and markdown support",
                "Streamed AI responses",
                "Dark mode interface",
                "Google authentication"
              ],
              "screenshot": "https://rynk.io/og-image.png"
            })
          }}
        />

        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "rynk.",
              "url": "https://rynk.io",
              "description": "AI chat application with file uploads, message versioning, and conversation branching.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://rynk.io/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </body>
    </html>
  );
}
