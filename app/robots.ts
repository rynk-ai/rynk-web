import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    host: "https://rynk.io",
    sitemap: "https://rynk.io/sitemap.xml",
  };
}
