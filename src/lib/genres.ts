/**
 * P2.3 canonical genre/category source (ARCH-04).
 *
 * Single source of truth for Thai category labels + AniList English mapping.
 * - `categories` (Thai labels, URL slugs via encodeURIComponent) is derived here.
 * - `thaiToAnilistGenre` maps Thai label -> AniList genre (null = all, no filter).
 * - `CATEGORY_THAI` display list is the same array (kept as alias for callers).
 *
 * No removals/inventions: exactly the 13 labels + 12 mappings that existed in
 * `src/lib/data.ts` (categories), `src/lib/anilist.ts` (CATEGORY_THAI) and
 * `src/app/category/[slug]/page.tsx` (thaiToEn) before P2.3.
 * The richer `genreMap` in `anilist.ts` (AniList EN -> Thai for `toAnime`) is
 * intentionally separate: it covers live-mapped genres beyond the 13 browsable
 * categories (e.g. Mystery, Mecha) and must not be merged into this table.
 */

/** Thai category labels in canonical display order. */
export const categories = [
  "ทั้งหมด",
  "แอคชั่น",
  "ผจญภัย",
  "แฟนตาซี",
  "ดราม่า",
  "คอมเมดี้",
  "ไซไฟ",
  "โรงเรียน",
  "โรแมนติก",
  "เหนือธรรมชาติ",
  "สยองขวัญ",
  "กีฬา",
  "ดนตรี",
] as const;

export type CategorySlug = (typeof categories)[number];

/** Canonical Thai -> AniList English genre table. `null` = no genre filter. */
export const GENRE_TABLE: ReadonlyArray<{ th: CategorySlug; anilist: string | null }> = [
  { th: "ทั้งหมด", anilist: null },
  { th: "แอคชั่น", anilist: "Action" },
  { th: "ผจญภัย", anilist: "Adventure" },
  { th: "แฟนตาซี", anilist: "Fantasy" },
  { th: "ดราม่า", anilist: "Drama" },
  { th: "คอมเมดี้", anilist: "Comedy" },
  { th: "ไซไฟ", anilist: "Sci-Fi" },
  { th: "โรงเรียน", anilist: "School" },
  { th: "โรแมนติก", anilist: "Romance" },
  { th: "เหนือธรรมชาติ", anilist: "Supernatural" },
  { th: "สยองขวัญ", anilist: "Horror" },
  { th: "กีฬา", anilist: "Sports" },
  { th: "ดนตรี", anilist: "Music" },
] as const;

/**
 * Thai -> AniList English lookup (mirrors the pre-P2.3 `thaiToEn` map).
 * `null` = "ทั้งหมด" (no filter). `undefined` = unknown category.
 */
export const thaiToAnilistGenre: Readonly<Record<string, string | null>> = Object.fromEntries(
  GENRE_TABLE.map((g) => [g.th, g.anilist]),
);

/** Display list alias — same 13 Thai labels in the same order. */
export const CATEGORY_THAI = categories;

/** True when `cat` is one of the 13 canonical Thai labels. */
export function isValidCategory(cat: string): cat is CategorySlug {
  return (categories as readonly string[]).includes(cat);
}

/**
 * AniList genre for a Thai category, or `undefined` for unknown input.
 * Returns `null` for "ทั้งหมด" (caller must skip the genre filter).
 */
export function getAnilistGenreForThai(cat: string): string | null | undefined {
  if (!(cat in thaiToAnilistGenre)) return undefined;
  return thaiToAnilistGenre[cat];
}

/** Canonical category URL for a Thai label (matches CategoryPills/sitemap). */
export function categoryUrl(th: CategorySlug): string {
  return `/category/${encodeURIComponent(th)}`;
}
