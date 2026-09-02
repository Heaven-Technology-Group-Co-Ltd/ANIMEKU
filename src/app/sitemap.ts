import type { MetadataRoute } from "next";
import { animes } from "@/lib/data";
import { categories } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:1234";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/search`, lastModified: now },
    ...animes.map((a) => ({ url: `${base}/anime/${a.slug}`, lastModified: now } as const)),
    ...animes.flatMap((a) => a.episodes.slice(0, 5).map((ep) => ({ url: `${base}/watch/${a.slug}/${ep.number}`, lastModified: now } as const))),
    ...categories.map((c) => ({ url: `${base}/category/${encodeURIComponent(c)}`, lastModified: now } as const)),
  ];
}
