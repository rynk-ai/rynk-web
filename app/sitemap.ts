import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://rynk.io";
  const currentDate = new Date();

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
  ];
}
