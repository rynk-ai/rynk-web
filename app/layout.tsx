import type { Metadata } from "next";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Inter } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/components/auth-provider";
import { ChatProvider } from "@/lib/hooks/chat-context";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { FontProviderWrapper } from "@/components/providers/font-provider-wrapper";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rynk.io"),
  title: {
    default: "rynk. - Branch Conversations, Edit History, Chat with Files",
    template: "%s | rynk.",
  },
  description:
    "AI chat that never forgets. Experience intelligent conversations with complete context awareness, instant file understanding (PDFs, docs), and cross-conversation learning. Branch chats, edit history, and access your entire project knowledge base. The AI that truly understands you.",
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
      "AI chat that never forgets. Experience intelligent conversations with complete context awareness, instant file understanding (PDFs, docs), and cross-conversation learning. Branch chats, edit history, and access your entire project knowledge base. The AI that truly understands you.",
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
      "AI chat that never forgets. Experience intelligent conversations with complete context awareness, instant file understanding (PDFs, docs), and cross-conversation learning. Branch chats, edit history, and access your entire project knowledge base. The AI that truly understands you.",
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable} antialiased tracking-tight`}
      >
        <AuthProvider>
          <FontProviderWrapper defaultFont="geist">
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <QueryProvider>
                <ChatProvider>{children}</ChatProvider>
                <Toaster
                  position="top-center"
                  richColors
                  closeButton
                  toastOptions={{
                    duration: 5000,
                  }}
                />
              </QueryProvider>
            </ThemeProvider>
          </FontProviderWrapper>
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
                "AI chat that never forgets. Branch conversations, edit history, and chat with your files for intelligent, context-aware responses.",
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
                "AI chat with perfect memory. Experience intelligent conversations with complete context, instant file understanding, and cross-conversation learning.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "AI with perfect memory - never loses context",
                "Instant file understanding (PDFs, docs, images)",
                "Cross-conversation learning and referencing",
                "Conversation branching for exploring ideas",
                "Message editing and version history",
                "Project-wide knowledge base access",
                "Streamed, intelligent AI responses",
                "Beautiful dark mode interface",
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
                "The AI that never forgets. Chat with context, memory, and intelligence.",
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
