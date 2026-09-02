import type { MetadataRoute } from "next";
import { animes, categories } from "@/lib/data";
import { getSiteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/search`, lastModified: now },
    ...animes.map((a) => ({ url: `${base}/anime/${a.slug}`, lastModified: now } as const)),
    // Only episode 1 (trailer) is a real route — do not generate /2..5
    ...animes.map((a) => ({ url: `${base}/watch/${a.slug}/1`, lastModified: now } as const)),
    ...categories.map((c) => ({ url: `${base}/category/${encodeURIComponent(c)}`, lastModified: now } as const)),
  ];
}
