import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://rynk.io";
  const currentDate = new Date();

  const tools = [
    "humanizer", // Root level tool
    "tools", // The directory page
    "tools/ai-content-detector",
    "tools/blog-title-generator",
    "tools/case-converter",
    "tools/devils-advocate",
    "tools/email-subject-line-generator",
    "tools/github-repo-visualizer",
    "tools/grammar",
    "tools/hackernews-inspector",
    "tools/instagram-caption-generator",
    "tools/landing-page-roaster",
    "tools/paraphraser",
    "tools/resume-roaster",
    "tools/summarizer",
    "tools/word-counter",
    "tools/youtube-title-generator",
    // "tools/youtube-script-generator", // Check if this is active/linked in the tools page? It wasn't in the list I saw in tools/page.tsx but was in directory. I'll include it if it's there.
  ];

  // Map tools to sitemap entries
  const toolEntries = tools.map((route) => ({
    url: `${baseUrl}/${route}`,
    lastModified: currentDate,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    // Homepage - highest priority
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    // Main chat application
    {
      url: `${baseUrl}/chat`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Guest chat - free access entry point
    {
      url: `${baseUrl}/guest-chat`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Subscription/pricing page
    {
      url: `${baseUrl}/subscription`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // Login
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...toolEntries,
  ];
}
