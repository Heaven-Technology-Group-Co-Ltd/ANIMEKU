import { animes } from "@/data/animes";

// P2.3 (ARCH-04): canonical category source lives in `./genres`.
// Re-exported here so existing `@/lib/data` import paths keep working.
export { categories, isValidCategory, getAnilistGenreForThai, categoryUrl } from "./genres";
export type { CategorySlug } from "./genres";

export type Episode = { id: string; number: number; title: string; titleTh: string; duration: string; thumbnail: string; views: number; updatedAt: string; hlsUrl?: string; };
export type Anime = { id: string; slug: string; title: string; titleTh: string; titleEn: string; description: string; cover: string; banner: string; year: number; season: string; episodesTotal: number; episodes: Episode[]; rating: number; views: number; genres: string[]; status: "กำลังฉาย" | "จบแล้ว" | "ยังไม่ฉาย"; studio: string; duration: string; featured?: boolean; trendingRank?: number; trailerYoutubeId?: string;
  /**
   * P2.3 DATA-04 verdict: KEEP (deprecated).
   * All 104 catalog rows ship `""`; the verified-dub gate is `resolveTrailerDub`
   * in `@/lib/dubMap` (empty map = no verified dub). This field is never used
   * as dub evidence and must not be populated with invented IDs. Kept only for
   * CMS/serialization compat — new code must use `resolveTrailerDub` instead.
   * Removal condition: safe to drop only after confirming no CMS payload,
   * test fixture, or serialized cache reads this key.
   */
  trailerDubYoutubeId?: string; trailerThumbnail?: string; };

/**
 * @deprecated P2.3 ARCH-05 — raw, unvalidated env passthrough. Kept only for
 * backwards compatibility. New code must use `getHlsBaseUrl()` from
 * `@/lib/env` (validates absolute http/https, ignores invalid values).
 * Removal condition: safe to delete once no importer references it
 * (P2.3 switches the only consumer, VideoPlayer, to the validated path).
 */
export const HLS_BASE = process.env.NEXT_PUBLIC_HLS_BASE_URL || "";

export { animes };

// ---------------------------------------------------------------------------
// Data-access boundary — local anime queries (single source of truth)
// All pages/routes should import through these helpers, not sort animes[] inline.
// ---------------------------------------------------------------------------

/** Find anime by slug (used by /anime/[slug], /watch/[slug]/...). */
export const getAnimeBySlug = (slug: string) => animes.find((a) => a.slug === slug);

/** Featured anime for Hero (featured flag, stable trendingRank order). */
export const getFeatured = () => animes.filter((a) => a.featured).sort((a, b) => (a.trendingRank ?? 999) - (b.trendingRank ?? 999));

/** Trending / popularity ordering (trendingRank asc). */
export const getTrending = () => animes.filter((a) => a.trendingRank).sort((a, b) => (a.trendingRank! - b.trendingRank!));

/** Season rank for recency sorting: winter < spring < summer < fall */
const seasonRank = (season: string): number => {
  if (season.includes("ฤดูหนาว")) return 1;
  if (season.includes("ฤดูใบไม้ผลิ")) return 2;
  if (season.includes("ฤดูร้อน")) return 3;
  if (season.includes("ฤดูใบไม้ร่วง")) return 4;
  return 0;
};

/**
 * Latest / recency ordering — genuinely different from getTrending().
 * Sorts by year desc, then season order desc, then numeric id desc as stable tie-breaker.
 * Deterministic and overlap-free for the home page “ใหม่ล่าสุด” section.
 */
export const getLatest = () =>
  [...animes].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    const sr = seasonRank(b.season) - seasonRank(a.season);
    if (sr !== 0) return sr;
    return Number(b.id) - Number(a.id);
  });

export const getLatestEpisodes = () => { const eps: (Episode & { anime: Anime })[] = []; animes.forEach((anime) => { if(anime.episodes.length===0) return; anime.episodes.slice(0, 2).forEach((ep) => eps.push({ ...ep, anime })); }); return eps.sort((a, b) => b.views - a.views).slice(0, 8); };

/**
 * P2.3 DATA-03: case-insensitive on every branch.
 * Previously the genre branch used `g.includes(q)` (case-asymmetric), so a
 * lowercase/mixed-case query missed Thai/Latin genre matches that the title
 * branches (already lowercased) would find. Now both sides are lowercased.
 */
export const searchAnimes = (q: string) => { const lower = q.toLowerCase(); return animes.filter((a) => a.title.toLowerCase().includes(lower) || a.titleEn.toLowerCase().includes(lower) || a.titleTh.toLowerCase().includes(lower) || a.genres.some((g) => g.toLowerCase().includes(lower))); };
export const filterByCategory = (cat: string) => { if (cat === "ทั้งหมด") return animes; return animes.filter((a) => a.genres.includes(cat)); };

// ---------------------------------------------------------------------------
// P2.3 home selectors (ARCH-02) — replace the inline `animes.filter(...)`
// previously in `src/app/page.tsx` so the view never sorts/filters inline.
// All preserve catalog order (Array.filter order) exactly.
// ---------------------------------------------------------------------------

/** Watchable catalog: everything except "ยังไม่ฉาย" (catalog order). */
export const getWatchableAnimes = () => animes.filter((a) => a.status !== "ยังไม่ฉาย");

/** Upcoming catalog: only "ยังไม่ฉาย" (catalog order). */
export const getUpcomingAnimes = () => animes.filter((a) => a.status === "ยังไม่ฉาย");

/** Catalog slice by exact status value (catalog order). */
export const getAnimesByStatus = (status: Anime["status"]) => animes.filter((a) => a.status === status);

/**
 * Home sections bundle — the exact selections `src/app/page.tsx` renders:
 * featured hero (first of getFeatured, fallback animes[0]), trending top 8,
 * latest top 8, watchable + upcoming full lists, and status counts.
 * Pure + deterministic; ordering/results identical to the pre-P2.3 inline code.
 */
export function selectHomeSections() {
  const featured = getFeatured()[0] ?? animes[0];
  const trending = getTrending().slice(0, 8);
  const latestRecommended = getLatest().slice(0, 8);
  const watchable = getWatchableAnimes();
  const upcoming = getUpcomingAnimes();
  const counts = {
    total: animes.length,
    watchable: watchable.length,
    upcoming: upcoming.length,
    airing: getAnimesByStatus("กำลังฉาย").length,
    completed: getAnimesByStatus("จบแล้ว").length,
  };
  return { featured, trending, latestRecommended, watchable, upcoming, counts };
}

// ---------------------------------------------------------------------------
// P2.3 related-items helper (ARCH-03).
// Single deterministic helper; callers keep their own counts
// (anime page = 6, watch page = 4) — never force one caller's count on another.
// ---------------------------------------------------------------------------

/**
 * Related anime: catalog order excluding the current title, first `count`.
 * Deterministic; returns fewer than `count` when the catalog is small.
 */
export function getRelated(anime: Anime, count: number): Anime[] {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];
  return animes.filter((a) => a.id !== anime.id).slice(0, n);
}
