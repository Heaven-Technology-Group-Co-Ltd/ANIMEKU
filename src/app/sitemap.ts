import type { MetadataRoute } from "next";
import { animes, categories } from "@/lib/data";
import { getSiteUrl } from "@/lib/env";

/**
 * P2.5 sitemap honesty fix.
 * - `lastModified: now` (build-time `new Date()`) was BOTH non-deterministic
 *   (every build produced different bytes) AND untrustworthy (claiming every
 *   URL changed at build time). The catalog carries no per-row update dates,
 *   so `lastModified` is omitted entirely — valid per the sitemaps spec.
 * - Scope unchanged and audited: `/`, `/search`, one `/anime/[slug]` + one
 *   `/watch/[slug]/1` per LOCAL catalog row (only episode 1 exists — no
 *   /2..5), one `/category/[label]` per canonical genre. No API/internal/
 *   admin routes, no query strings, no invented slugs (no catalog expansion).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return [
    { url: `${base}/` },
    { url: `${base}/search` },
    ...animes.map((a) => ({ url: `${base}/anime/${a.slug}` }) as const),
    // Only episode 1 (trailer) is a real route — do not generate /2..5
    ...animes.map((a) => ({ url: `${base}/watch/${a.slug}/1` }) as const),
    ...categories.map((c) => ({ url: `${base}/category/${encodeURIComponent(c)}` }) as const),
  ];
}
