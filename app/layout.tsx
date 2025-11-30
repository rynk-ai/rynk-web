import type { Metadata } from "next";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import { AuthProvider } from "@/components/auth-provider";
import { ChatProvider } from "@/lib/hooks/chat-context";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rynk.io"),
  title: {
    default: "rynk. - Branch Conversations, Edit History, Chat with Files",
    template: "%s | rynk.",
  },
  description:
    "Chat with AI that remembers and adapts. Branch conversations to explore different paths, edit any message to refine AI responses, and upload files for context-aware answers. Your complete conversation history, searchable and reusable.",
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
    "context picker",
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
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rynk.io",
    title: "rynk. - Branch Conversations, Edit History, Chat with Files",
    description:
      "Chat with AI that remembers and adapts. Branch conversations to explore different paths, edit any message to refine AI responses, and upload files for context-aware answers. Your complete conversation history, searchable and reusable.",
    siteName: "rynk.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "rynk. - AI Chat Application Interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "rynk. - Branch Conversations, Edit History, Chat with Files",
    description:
      "Chat with AI that remembers and adapts. Branch conversations to explore different paths, edit any message to refine AI responses, and upload files for context-aware answers. Your complete conversation history, searchable and reusable.",
    creator: "@rynk",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  verification: {
    google: "verification-token",
  },
  alternates: {
    canonical: "https://rynk.io",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased tracking-tight`}
      >



        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <ChatProvider>{children}</ChatProvider>
            </QueryProvider>
          </ThemeProvider>
        </AuthProvider>

        {/* Structured Data (JSON-LD) for SEO */}
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "rynk.",
              url: "https://rynk.io",
              logo: "https://rynk.io/favicon.ico",
              description:
                "AI chat that lets you branch conversations, edit message history, and get intelligent responses from your uploaded files.",
              sameAs: ["https://twitter.com/rynk", "https://github.com/rynk"],
            }),
          }}
        />

        <Script
          id="software-application-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "rynk.",
              applicationCategory: "AI Application",
              operatingSystem: "Any",
              description:
                "Explore multiple conversation paths, refine AI responses by editing messages, and chat with your PDFs and documents.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "AI-powered chat with file uploads",
                "Message versioning and editing",
                "Conversation branching",
                "Context picker for referencing past conversations",
                "PDF and markdown support",
                "Streamed AI responses",
                "Dark mode interface",
                "Google authentication",
              ],
              screenshot: "https://rynk.io/og-image.png",
            }),
          }}
        />

        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "rynk.",
              url: "https://rynk.io",
              description:
                "AI chat with conversation branching, message editing, and file-aware responses.",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://rynk.io/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
