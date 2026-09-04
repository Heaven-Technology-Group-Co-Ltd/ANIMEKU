import type { Anime } from "./data";

/**
 * P2.5 SEO + Data Integrity — honest structured data.
 *
 * Policy (never fabricate to look complete):
 * - Omit unknown values entirely (no fake uploadDate, ratingCount, dates,
 *   durations, season counts). A missing rich-result is better than a lying one.
 * - `numberOfEpisodes` is a build-time AniList snapshot (`episodesTotal`) and
 *   may drift from live AniList; the local `episodes[]` demo list is NOT the
 *   source for totals (65/104 rows differ by design — demo placeholders).
 * - `aggregateRating` is OMITTED: we have no truthful vote-count source.
 *   `ratingCount = floor(views/100)` was invented (views themselves are static
 *   editorial numbers / `toAnime` estimates, not measured analytics), and a
 *   bare `ratingValue` without a count still misleads. Re-add only with a real
 *   review/vote source (rating value + count from the same source).
 * - `datePublished` is OMITTED: `${year}-01-01` invented a month/day we do not
 *   know. Re-add only with a real per-title release date.
 * - `numberOfSeasons: 1` was a hardcoded guess (wrong for long series).
 *   Re-add only with a real season-count source.
 * - `videoJsonLd.uploadDate = now()` was non-deterministic AND invented.
 *   OMITTED — this builder is now a pure function of its inputs
 *   (byte-identical across calls). `VideoObject` loses upload-date rich-result
 *   eligibility until the product records a real publish date per trailer.
 * - `videoJsonLd.duration = "PT24M"` contradicted the watch page itself
 *   (trailer ≈ "01:32"). OMITTED — real per-trailer runtime unknown.
 *
 * FIELD → SOURCE → TRUST map (P2.5 Task 1):
 * | field | source | trust |
 * | name / alternateName | catalog `titleTh` / `title`,`titleEn` (deduped) | DIRECT |
 * | description | catalog `description` | DIRECT |
 * | image / thumbnailUrl | catalog `cover` / trailer thumbnail (absolute https) | DIRECT |
 * | genre | catalog `genres` (omitted when empty) | DIRECT |
 * | numberOfEpisodes | catalog `episodesTotal` (build-time snapshot) | STALE — may drift |
 * | productionCompany | catalog `studio` (omitted when empty/"Unknown") | DIRECT / OMITTED-if-placeholder |
 * | url / contentUrl / embedUrl / breadcrumb items | `siteUrl` origin + route path | SAFE-TRANSFORM (absolute) |
 * | aggregateRating | — | REMOVED (was FABRICATED ratingCount) |
 * | datePublished | — | REMOVED (was FABRICATED month/day) |
 * | numberOfSeasons | — | REMOVED (was hardcoded guess) |
 * | uploadDate | — | REMOVED (was non-deterministic now()) |
 * | duration | — | REMOVED (was hardcoded, contradicted UI) |
 * | views / ratingCount / interactionCount | — | NEVER emitted in JSON-LD |
 */

function isAbsoluteHttpUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function animeJsonLd(anime: Anime, siteUrl: string) {
  const alternateName = [...new Set([anime.title, anime.titleEn].filter((t) => t && t.trim()))];
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: anime.titleTh,
    description: anime.description,
    numberOfEpisodes: anime.episodesTotal,
    url: buildCanonicalUrl(siteUrl, `/anime/${anime.slug}`),
  };
  if (alternateName.length > 0) ld.alternateName = alternateName;
  if (anime.cover && isAbsoluteHttpUrl(anime.cover)) ld.image = anime.cover;
  if (anime.genres.length > 0) ld.genre = anime.genres;
  const studio = (anime.studio || "").trim();
  if (studio && studio !== "Unknown" && studio !== "Unknown Studio") {
    ld.productionCompany = { "@type": "Organization", name: anime.studio };
  }
  return ld;
}

export function breadcrumbJsonLd(items: { name: string; url: string }[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: buildCanonicalUrl(siteUrl, item.url),
    })),
  };
}

export function videoJsonLd(
  anime: Anime,
  episode: { number: number; titleTh: string; thumbnail: string },
  siteUrl: string
) {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${anime.titleTh} ตอนที่ ${episode.number} - ${episode.titleTh}`,
    description: anime.description,
    contentUrl: buildCanonicalUrl(siteUrl, `/watch/${anime.slug}/${episode.number}`),
    embedUrl: buildCanonicalUrl(siteUrl, `/watch/${anime.slug}/${episode.number}`),
  };
  if (episode.thumbnail && isAbsoluteHttpUrl(episode.thumbnail)) {
    ld.thumbnailUrl = episode.thumbnail;
  }
  return ld;
}

/**
 * P2.5 canonical builder — absolute HTTPS-ready canonical from the P2.1 env
 * origin (`getSiteUrl()`) + route path. Guarantees: no duplicate slashes, no
 * query string / hash in the canonical, slug path encoded. `siteUrl` itself is
 * the validated origin (or the localhost dev fallback — callers/tests pass the
 * prod origin; localhost-bake warnings stay owned by `env.ts`/P1).
 */
export function buildCanonicalUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  const cleanPath = `/${path.split(/[?#]/)[0].replace(/^\/+/, "")}`;
  const collapsed = cleanPath.replace(/\/{2,}/g, "/");
  const encoded = collapsed
    .split("/")
    .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
    .join("/");
  return `${base}${encoded === "/" ? "/" : encoded}`;
}
