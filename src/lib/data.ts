import { animes } from "@/data/animes";

export type Episode = { id: string; number: number; title: string; titleTh: string; duration: string; thumbnail: string; views: number; updatedAt: string; hlsUrl?: string; };
export type Anime = { id: string; slug: string; title: string; titleTh: string; titleEn: string; description: string; cover: string; banner: string; year: number; season: string; episodesTotal: number; episodes: Episode[]; rating: number; views: number; genres: string[]; status: "กำลังฉาย" | "จบแล้ว" | "ยังไม่ฉาย"; studio: string; duration: string; featured?: boolean; trendingRank?: number; trailerYoutubeId?: string; trailerDubYoutubeId?: string; trailerThumbnail?: string; };
export const HLS_BASE = process.env.NEXT_PUBLIC_HLS_BASE_URL || "";

export { animes };

export const categories = ["ทั้งหมด","แอคชั่น","ผจญภัย","แฟนตาซี","ดราม่า","คอมเมดี้","ไซไฟ","โรงเรียน","โรแมนติก","เหนือธรรมชาติ","สยองขวัญ","กีฬา","ดนตรี"] as const;

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
export const searchAnimes = (q: string) => { const lower = q.toLowerCase(); return animes.filter((a) => a.title.toLowerCase().includes(lower) || a.titleEn.toLowerCase().includes(lower) || a.titleTh.toLowerCase().includes(lower) || a.genres.some((g) => g.includes(q))); };
export const filterByCategory = (cat: string) => { if (cat === "ทั้งหมด") return animes; return animes.filter((a) => a.genres.includes(cat)); };