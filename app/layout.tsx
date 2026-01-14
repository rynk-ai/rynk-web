import type { Metadata, Viewport } from "next";

import { Manrope } from "next/font/google"; // [MODIFIED]
import Script from "next/script";
import { AuthProvider } from "@/components/auth-provider";
import { ChatProvider } from "@/lib/hooks/chat-context";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { FontProviderWrapper } from "@/components/providers/font-provider-wrapper";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatBackgroundProvider } from "@/lib/hooks/use-chat-background";
import { Toaster } from "sonner";
import "./globals.css";

const manrope = Manrope({ // [MODIFIED]
  subsets: ["latin"],
  variable: "--font-manrope", // [MODIFIED]
  display: "swap",
});

// Viewport configuration (Next.js 15+ requires separate export)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL("https://rynk.io"),
  title: {
    default: "rynk. - Ask. Read. Done.",
    template: "%s | rynk.",
  },
  description:
    "AI without the noise. Deep research and projects without the fluff. An AI that stays out of your way.",
  keywords: [
    "AI chat",
    "AI assistant",
    "Deep Research",
    "Project management",
    "research assistant",
    "AI workspace",
    "clean AI",
    "minimal AI",
    "distraction free AI",
  ],
  authors: [{ name: "rynk. Team" }],
  creator: "rynk.",
  publisher: "rynk.",
  category: "Artificial Intelligence",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rynk.io",
    title: "rynk. - Ask. Read. Done.",
    description:
      "AI without the noise. Deep research and projects without the fluff. An AI that stays out of your way.",
    siteName: "rynk.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "rynk. - AI without the noise",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "rynk. - Ask. Read. Done.",
    description:
      "AI without the noise. Deep research and projects without the fluff.",
    creator: "@rynkdotio",
    site: "@rynkdotio",
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
    languages: {
      "en-US": "https://rynk.io",
    },
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "rynk.",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#000000",
    "theme-color": "#000000",
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
        className={`${manrope.variable} font-sans antialiased tracking-normal bg-background text-foreground`}
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
                <ChatProvider>
                  <ChatBackgroundProvider>
                    <SidebarProvider>{children}</SidebarProvider>
                  </ChatBackgroundProvider>
                </ChatProvider>
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
                "AI without the noise. Deep research and projects without the fluff.",
              sameAs: ["https://twitter.com/rynkdotio", "https://github.com/rynk"],
              foundingDate: "2024",
              slogan: "Ask. Read. Done.",
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
              alternateName: ["rynk AI", "rynk Chat"],
              applicationCategory: "ProductivityApplication",
              applicationSubCategory: "AI Chat Assistant",
              operatingSystem: "Any",
              browserRequirements: "Requires JavaScript. Requires HTML5.",
              description:
                "AI without the noise. Deep research, context-aware projects, and minimal design. No fluff.",
              offers: [
                {
                  "@type": "Offer",
                  name: "Free Tier",
                  price: "0",
                  priceCurrency: "USD",
                  description: "100 queries per month",
                },
                {
                  "@type": "Offer",
                  name: "Pro",
                  price: "5.99",
                  priceCurrency: "USD",
                  description: "2,500 queries per month",
                },
              ],
              featureList: [
                "Deep Research - Pulls from multiple sources and synthesizes",
                "Project workspaces with shared AI memory",
                "Cross-conversation context",
                "Minimal, distraction-free interface",
                "PDF and document analysis",
                "Web search with citations",
                "Free to start, no signup required",
              ],
              screenshot: "https://rynk.io/og-image.png",
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                ratingCount: "500",
                bestRating: "5",
                worstRating: "1",
              },
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
              alternateName: "rynk AI Chat",
              url: "https://rynk.io",
              description:
                "AI without the noise. Deep research and projects without the fluff.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://rynk.io/chat?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
              inLanguage: "en-US",
            }),
          }}
        />
      </body>
    </html>
  );
}

