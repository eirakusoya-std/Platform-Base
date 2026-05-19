import type { MetadataRoute } from "next";

const SITE_URL = "https://aiment.jp";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/schedule`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/channels`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/lp`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
