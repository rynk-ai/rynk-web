import type { Metadata, Viewport } from "next";

import { Outfit, Inter } from "next/font/google"; // [MODIFIED]
import Script from "next/script";
import { AuthProvider } from "@/components/auth-provider";
import { ChatProvider } from "@/lib/hooks/chat-context";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { FontProviderWrapper } from "@/components/providers/font-provider-wrapper";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import "./globals.css";

const outfit = Outfit({ // [MODIFIED]
  subsets: ["latin"],
  variable: "--font-outfit", // [MODIFIED]
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    default: "rynk. - AI Chat with Memory, Learning Surfaces & Projects | ChatGPT Alternative",
    template: "%s | rynk. - Intelligent AI Assistant",
  },
  description:
    "The best ChatGPT, Claude & Perplexity alternative with perfect memory. AI chat that remembers everything across conversations. Features: Learning Courses, Interactive Quizzes, Flashcards, Timelines, Comparison Tables, Project Workspaces, PDF Chat, Web Search, and Cross-Conversation Context. Free AI assistant that never forgets.",
  keywords: [
    // Primary keywords
    "AI chat",
    "AI assistant",
    "artificial intelligence chat",
    "intelligent chatbot",
    
    // Competitor alternatives (high SEO value)
    "ChatGPT alternative",
    "ChatGPT free alternative",
    "Claude alternative",
    "Claude AI alternative",
    "Perplexity alternative",
    "Perplexity AI alternative",
    "Gemini alternative",
    "Google Gemini alternative",
    "Copilot alternative",
    "Microsoft Copilot alternative",
    "Anthropic Claude alternative",
    "OpenAI alternative",
    "GPT-4 alternative",
    "GPT alternative free",
    "better than ChatGPT",
    "ChatGPT with memory",
    "AI with long-term memory",
    
    // Feature keywords - Surfaces
    "AI learning courses",
    "AI quiz generator",
    "AI flashcard maker",
    "AI timeline creator",
    "AI comparison tool",
    "interactive AI learning",
    "AI study assistant",
    "AI tutor",
    "AI education platform",
    
    // Feature keywords - Core
    "AI chat with files",
    "chat with PDF",
    "PDF AI chat",
    "document AI chat",
    "AI file analysis",
    "conversation branching",
    "message versioning",
    "chat history management",
    "AI project management",
    "AI workspace",
    
    // Feature keywords - Context & Memory
    "AI with memory",
    "AI that remembers",
    "context-aware AI",
    "cross-conversation AI",
    "AI knowledge base",
    "semantic search AI",
    "AI context picker",
    
    // Feature keywords - Search
    "AI web search",
    "real-time AI search",
    "AI research assistant",
    "AI with citations",
    "AI with sources",
    
    // Use case keywords
    "AI for students",
    "AI for researchers",
    "AI for learning",
    "AI for studying",
    "AI for work",
    "AI productivity tool",
    "free AI chat",
    "best free AI",
    "AI without login",
    
    // Technical keywords
    "streaming AI responses",
    "markdown AI chat",
    "code AI assistant",
    "AI coding help",
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
    title: "rynk. - AI Chat with Memory & Learning Surfaces | Free ChatGPT Alternative",
    description:
      "The smartest ChatGPT alternative with perfect memory. AI that remembers across conversations, creates learning courses, quizzes, flashcards, timelines & comparisons. Chat with PDFs, web search with citations, project workspaces. Try free - no signup required.",
    siteName: "rynk.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "rynk. - AI Chat with Memory, Learning Surfaces, Quizzes & Projects",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "rynk. - AI with Memory & Learning Surfaces | ChatGPT Alternative",
    description:
      "Free AI chat that never forgets. Learning courses, quizzes, flashcards, PDF chat, web search, project workspaces. The best ChatGPT & Claude alternative with cross-conversation memory.",
    creator: "@rynk",
    site: "@rynk",
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
        className={`${outfit.variable} ${inter.variable} font-sans antialiased tracking-tight bg-background text-foreground`}
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
                  <SidebarProvider>{children}</SidebarProvider>
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
                "The best ChatGPT and Claude alternative with perfect memory. AI chat that remembers across conversations, creates learning courses, quizzes, flashcards, and more.",
              sameAs: ["https://twitter.com/rynk", "https://github.com/rynk"],
              foundingDate: "2024",
              slogan: "AI that never forgets",
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
              alternateName: ["rynk AI", "rynk Chat", "rynk Assistant"],
              applicationCategory: "EducationalApplication",
              applicationSubCategory: "AI Chat Assistant",
              operatingSystem: "Any",
              browserRequirements: "Requires JavaScript. Requires HTML5.",
              description:
                "The smartest ChatGPT, Claude, and Perplexity alternative. AI chat with perfect memory that remembers across conversations. Features learning courses, interactive quizzes, flashcards, timelines, comparison tables, PDF chat, web search with citations, and project workspaces.",
              offers: [
                {
                  "@type": "Offer",
                  name: "Free Tier",
                  price: "0",
                  priceCurrency: "USD",
                  description: "100 queries per month, basic AI chat",
                },
                {
                  "@type": "Offer",
                  name: "Standard",
                  price: "4.99",
                  priceCurrency: "USD",
                  description: "1,500 queries per month, web search, projects",
                },
              ],
              featureList: [
                "AI with perfect long-term memory - never loses context",
                "Learning Surfaces - AI generates full courses with chapters",
                "Interactive Quizzes with scoring and explanations",
                "Flashcard Generator for studying and memorization",
                "Timeline Creator for historical and chronological topics",
                "Comparison Tables with pros, cons, and recommendations",
                "PDF and document chat - instant file understanding",
                "Web search with real-time citations from Exa and Perplexity",
                "Cross-conversation context - reference any previous chat",
                "Project workspaces with shared AI memory",
                "Conversation branching to explore different ideas",
                "Message editing with version history",
                "Sub-chats for focused follow-up discussions",
                "Folders to organize conversations",
                "Voice-to-text input support",
                "Dark mode and customizable interface",
                "Free tier with no signup required",
              ],
              screenshot: "https://rynk.io/og-image.png",
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                ratingCount: "500",
                bestRating: "5",
                worstRating: "1",
              },
              keywords: "ChatGPT alternative, Claude alternative, Perplexity alternative, AI chat with memory, AI learning platform, AI quiz generator, AI flashcard maker",
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
                "The AI that never forgets. The best ChatGPT, Claude, and Perplexity alternative with learning surfaces, quizzes, and cross-conversation memory.",
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

        <Script
          id="faq-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Is rynk. a good ChatGPT alternative?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes! rynk. offers features that ChatGPT doesn't have, including perfect memory across conversations, learning surfaces that generate full courses, interactive quizzes, flashcards, and the ability to reference previous chats as context. It's designed for learning and productivity.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How is rynk. different from Claude or Perplexity?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Unlike Claude, rynk. remembers your conversations forever and can reference any past chat. Unlike Perplexity, rynk. offers learning surfaces like courses, quizzes, and flashcards. rynk. combines the best of both: AI chat with memory plus research capabilities with citations.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Can I use rynk. for free?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Absolutely! rynk. offers a free tier with 100 queries per month. You can start chatting immediately without signing up. The free tier includes all core features including learning surfaces, file uploads, and conversation branching.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What are Learning Surfaces?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Learning Surfaces transform AI responses into interactive learning formats. Instead of just text, you can generate: Learning Courses with chapters, Interactive Quizzes with scoring, Flashcards for memorization, Timelines for historical topics, and Comparison Tables for decision-making.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Can rynk. chat with my PDFs and documents?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes! Upload PDFs, documents, images, and code files. rynk. instantly understands and indexes your files, allowing you to ask questions about them. Files are chunked and embedded for semantic search, so the AI truly understands your content.",
                  },
                },
              ],
            }),
          }}
        />

        <Script
          id="product-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: "rynk. - AI Chat with Memory",
              description: "The smartest AI chat alternative to ChatGPT, Claude, and Perplexity with perfect memory, learning surfaces, quizzes, flashcards, and project workspaces.",
              brand: {
                "@type": "Brand",
                name: "rynk.",
              },
              category: "AI Software",
              image: "https://rynk.io/og-image.png",
              offers: {
                "@type": "AggregateOffer",
                lowPrice: "0",
                highPrice: "9.99",
                priceCurrency: "USD",
                offerCount: "3",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "500",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
