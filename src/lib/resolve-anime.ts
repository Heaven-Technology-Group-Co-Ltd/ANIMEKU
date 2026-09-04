import { getAnimeBySlug, type Anime } from "./data";
import { getAnimeByIdAni, toAnime } from "./anilist";

/**
 * P2.3 ARCH-01: shared anime resolver (was duplicated verbatim in
 * `src/app/anime/[slug]/page.tsx` and `src/app/watch/[slug]/[episode]/page.tsx`).
 *
 * Behavior preserved exactly:
 * - local lookup first (`getAnimeBySlug`)
 * - else AniList fallback by numeric id prefix (`Number(slug.split("-")[0])`)
 * - non-numeric / non-positive id → null (no fetch)
 * - upstream throw → log + null (graceful degradation, page calls `notFound()`)
 * - return type `Anime | null`; SEO/metadata callers treat null as {} / 404.
 *
 * `logTag` keeps the per-caller log prefix (`[anime]` vs `[watch]`) so existing
 * log greps keep working; defaults to `[resolveAnime]`.
 */
export async function resolveAnime(slug: string, logTag = "[resolveAnime]"): Promise<Anime | null> {
  const local = getAnimeBySlug(slug);
  if (local) return local;
  const id = Number(slug.split("-")[0]);
  if (isNaN(id) || id <= 0) return null;
  try {
    const ani = await getAnimeByIdAni(id);
    if (ani) return toAnime(ani);
  } catch (err) {
    console.error(`${logTag} AniList fallback failed for slug="${slug}"`, err);
  }
  return null;
}
