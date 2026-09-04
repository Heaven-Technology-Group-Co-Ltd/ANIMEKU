/**
 * P2.3 Architecture & Data Boundary Cleanup — deterministic, network-free.
 * Covers: resolveAnime, home selectors equivalence, related, category mappings,
 * search case normalization, HLS validation, compat shims, dub-field verdict.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  animes,
  getFeatured,
  getTrending,
  getLatest,
  getWatchableAnimes,
  getUpcomingAnimes,
  getAnimesByStatus,
  getRelated,
  searchAnimes,
  filterByCategory,
  categories,
  selectHomeSections,
} from "@/lib/data";
import { categories as canonicalCategories, thaiToAnilistGenre, GENRE_TABLE, getAnilistGenreForThai, isValidCategory, categoryUrl } from "@/lib/genres";
import { CATEGORY_THAI } from "@/lib/anilist";
import { resolveAnime } from "@/lib/resolve-anime";
import { getHlsBaseUrl, resolveHlsUrl, HLS_DEMO_FALLBACK_URL } from "@/lib/env";
import { getLegalPlatforms, getVerifiedPlatforms, getAvailablePlatforms } from "@/lib/platforms";
import { resolveTrailerDub } from "@/lib/dubMap";
import type { AniAnime } from "@/lib/anilist";

function makeAniMedia(id: number): AniAnime {
  return {
    id,
    title: { romaji: "Fallback Romaji", english: "Fallback English", native: "テスト" },
    coverImage: { extraLarge: "https://example.com/cover.jpg", large: "https://example.com/small.jpg" },
    bannerImage: null,
    averageScore: 80,
    seasonYear: 2024,
    season: "SPRING",
    episodes: 12,
    status: "FINISHED",
    studios: { nodes: [{ name: "Fallback Studio" }] },
    genres: ["Action"],
    trailer: null,
    description: "fallback",
    popularity: 50000,
  };
}

describe("P2.3 catalog invariant", () => {
  it("catalog still has ~104 records", () => {
    expect(animes.length).toBe(104);
  });
});

describe("P2.3 resolveAnime (ARCH-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns local anime without fetching", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const slug = animes[0].slug;
    const result = await resolveAnime(slug, "[anime]");
    expect(result?.slug).toBe(slug);
    expect(result?.id).toBe(animes[0].id);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to AniList by numeric id prefix", async () => {
    const media = makeAniMedia(999999);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { Media: media } }) }),
    );
    const result = await resolveAnime("999999-some-unknown-title", "[anime]");
    expect(result?.id).toBe("999999");
    expect(result?.title).toBe("Fallback Romaji");
  });

  it("returns null for non-numeric slug without fetching", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await resolveAnime("not-a-number", "[anime]")).toBeNull();
    expect(await resolveAnime("", "[anime]")).toBeNull();
    expect(await resolveAnime("0-zero", "[anime]")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("degrades gracefully (null) when upstream throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("upstream down")),
    );
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await resolveAnime("888888-unknown", "[watch]");
    expect(result).toBeNull();
    expect(err).toHaveBeenCalled();
  });

  it("degrades gracefully (null) when upstream returns non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await resolveAnime("888888-unknown", "[anime]")).toBeNull();
    expect(err).toHaveBeenCalled();
  });
});

describe("P2.3 home selectors equivalence (ARCH-02)", () => {
  it("getWatchable/getUpcoming equal the old inline filters (same ids, same order)", () => {
    const oldWatchable = animes.filter((a) => a.status !== "ยังไม่ฉาย");
    const oldUpcoming = animes.filter((a) => a.status === "ยังไม่ฉาย");
    expect(getWatchableAnimes().map((a) => a.id)).toEqual(oldWatchable.map((a) => a.id));
    expect(getUpcomingAnimes().map((a) => a.id)).toEqual(oldUpcoming.map((a) => a.id));
  });

  it("status counts equal old inline lengths", () => {
    expect(getWatchableAnimes().length).toBe(animes.filter((a) => a.status !== "ยังไม่ฉาย").length);
    expect(getUpcomingAnimes().length).toBe(animes.filter((a) => a.status === "ยังไม่ฉาย").length);
    expect(getAnimesByStatus("กำลังฉาย").length).toBe(animes.filter((a) => a.status === "กำลังฉาย").length);
    expect(getAnimesByStatus("จบแล้ว").length).toBe(animes.filter((a) => a.status === "จบแล้ว").length);
    expect(getAnimesByStatus("ยังไม่ฉาย").length).toBe(animes.filter((a) => a.status === "ยังไม่ฉาย").length);
  });

  it("trending/latest/featured selections are unchanged", () => {
    expect(getFeatured()[0] ?? animes[0]).toEqual((() => {
      const f = animes.filter((a) => a.featured).sort((a, b) => (a.trendingRank ?? 999) - (b.trendingRank ?? 999));
      return f[0] ?? animes[0];
    })());
    expect(getTrending().slice(0, 8).map((a) => a.id)).toHaveLength(8);
    expect(getLatest().slice(0, 8).map((a) => a.id)).toHaveLength(8);
  });

  it("selectHomeSections bundles the same results", () => {
    const s = selectHomeSections();
    expect(s.featured).toEqual(getFeatured()[0] ?? animes[0]);
    expect(s.trending.map((a) => a.id)).toEqual(getTrending().slice(0, 8).map((a) => a.id));
    expect(s.latestRecommended.map((a) => a.id)).toEqual(getLatest().slice(0, 8).map((a) => a.id));
    expect(s.watchable.map((a) => a.id)).toEqual(getWatchableAnimes().map((a) => a.id));
    expect(s.upcoming.map((a) => a.id)).toEqual(getUpcomingAnimes().map((a) => a.id));
    expect(s.counts.total).toBe(104);
    expect(s.counts.watchable + s.counts.upcoming).toBe(104);
  });
});

describe("P2.3 getRelated (ARCH-03)", () => {
  it("excludes the current anime", () => {
    const anime = animes[0];
    for (const r of getRelated(anime, 6)) {
      expect(r.id).not.toBe(anime.id);
    }
  });

  it("is deterministic and preserves catalog order", () => {
    const anime = animes[5];
    const a = getRelated(anime, 6).map((x) => x.id);
    const b = getRelated(anime, 6).map((x) => x.id);
    expect(a).toEqual(b);
    const expected = animes.filter((x) => x.id !== anime.id).slice(0, 6).map((x) => x.id);
    expect(a).toEqual(expected);
  });

  it("honors differing caller counts (6 vs 4) without forcing", () => {
    const anime = animes[0];
    expect(getRelated(anime, 6)).toHaveLength(6);
    expect(getRelated(anime, 4)).toHaveLength(4);
    expect(getRelated(anime, 4).map((a) => a.id)).toEqual(getRelated(anime, 6).slice(0, 4).map((a) => a.id));
  });

  it("returns fewer when catalog is smaller than count; empty for 0/negative", () => {
    const anime = animes[0];
    expect(getRelated(anime, 1000)).toHaveLength(animes.length - 1);
    expect(getRelated(anime, 0)).toEqual([]);
    expect(getRelated(anime, -3)).toEqual([]);
  });
});

describe("P2.3 canonical categories (ARCH-04)", () => {
  const expectedTh = ["ทั้งหมด","แอคชั่น","ผจญภัย","แฟนตาซี","ดราม่า","คอมเมดี้","ไซไฟ","โรงเรียน","โรแมนติก","เหนือธรรมชาติ","สยองขวัญ","กีฬา","ดนตรี"];
  const expectedEn: Record<string, string | null> = {
    ทั้งหมด: null, แอคชั่น: "Action", ผจญภัย: "Adventure", แฟนตาซี: "Fantasy",
    ดราม่า: "Drama", คอมเมดี้: "Comedy", ไซไฟ: "Sci-Fi", โรงเรียน: "School",
    โรแมนติก: "Romance", เหนือธรรมชาติ: "Supernatural", สยองขวัญ: "Horror",
    กีฬา: "Sports", ดนตรี: "Music",
  };

  it("has exactly the 13 Thai labels in canonical order (no removals/inventions)", () => {
    expect([...categories]).toEqual(expectedTh);
    expect([...canonicalCategories]).toEqual(expectedTh);
    expect([...CATEGORY_THAI]).toEqual(expectedTh);
    expect(GENRE_TABLE.map((g) => g.th)).toEqual(expectedTh);
  });

  it("preserves Thai->English AniList mappings", () => {
    for (const [th, en] of Object.entries(expectedEn)) {
      expect(thaiToAnilistGenre[th]).toBe(en);
      expect(getAnilistGenreForThai(th)).toBe(en);
    }
    expect(getAnilistGenreForThai("ทั้งหมด")).toBeNull();
    expect(getAnilistGenreForThai("nope-unknown")).toBeUndefined();
  });

  it("validates categories and builds stable slugs/URLs", () => {
    expect(isValidCategory("แอคชั่น")).toBe(true);
    expect(isValidCategory("nope")).toBe(false);
    for (const c of expectedTh) {
      expect(categoryUrl(c as never)).toBe(`/category/${encodeURIComponent(c)}`);
      // matches CategoryPills/sitemap derivation
      expect(filterByCategory(c)).toBeDefined();
    }
  });
});

describe("P2.3 search case normalization (DATA-03)", () => {
  it("matches Latin genres case-insensitively (upper/lower/mixed)", () => {
    const lower = searchAnimes("ecchi");
    const upper = searchAnimes("ECCHI");
    const mixed = searchAnimes("Ecchi");
    expect(lower.length).toBeGreaterThan(0);
    expect(upper.length).toBe(lower.length);
    expect(mixed.length).toBe(lower.length);
    expect(lower.map((a) => a.id).sort()).toEqual(upper.map((a) => a.id).sort());
  });

  it("matches Psychological case-insensitively", () => {
    const a = searchAnimes("psychological");
    const b = searchAnimes("PSYCHOLOGICAL");
    const c = searchAnimes("Psychological");
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBe(a.length);
    expect(c.length).toBe(a.length);
  });

  it("keeps Thai genre + title matching working", () => {
    expect(searchAnimes("แอคชั่น").length).toBeGreaterThan(0);
    expect(searchAnimes("death note").length).toBe(searchAnimes("DEATH NOTE").length);
    expect(searchAnimes("DeAtH nOtE").length).toBe(searchAnimes("death note").length);
  });
});

describe("P2.3 HLS validated path (ARCH-05)", () => {
  it("resolveHlsUrl prefers validated base + slug/episode", () => {
    expect(
      resolveHlsUrl({ hlsBase: "https://bucket.r2.dev/hls", animeSlug: "x", episodeNumber: 1 }),
    ).toBe("https://bucket.r2.dev/hls/x/ep-1/master.m3u8");
  });

  it("invalid/empty base never builds a broken URL (falls through)", () => {
    expect(
      resolveHlsUrl({ hlsBase: "", animeSlug: "x", episodeNumber: 1, hlsUrl: undefined }),
    ).toBe(HLS_DEMO_FALLBACK_URL);
    // raw invalid value must be validated to "" before reaching the resolver
    process.env.NEXT_PUBLIC_HLS_BASE_URL = "not-valid";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getHlsBaseUrl()).toBe("");
    expect(
      resolveHlsUrl({ hlsBase: getHlsBaseUrl(), animeSlug: "x", episodeNumber: 1 }),
    ).toBe(HLS_DEMO_FALLBACK_URL);
    warn.mockRestore();
    delete process.env.NEXT_PUBLIC_HLS_BASE_URL;
  });

  it("per-episode hlsUrl is used when no base; demo fallback last", () => {
    expect(
      resolveHlsUrl({ hlsBase: "", hlsUrl: "https://cdn.example.com/a.m3u8" }),
    ).toBe("https://cdn.example.com/a.m3u8");
    expect(resolveHlsUrl({})).toBe(HLS_DEMO_FALLBACK_URL);
  });
});

describe("P2.3 platform shims (ARCH-06)", () => {
  const anime = animes[0];
  it("available mirrors verified; searchUrl() equals url", () => {
    for (const p of getLegalPlatforms(anime)) {
      expect(p.available).toBe(p.verified);
      expect(p.searchUrl(anime)).toBe(p.url);
    }
  });

  it("getAvailablePlatforms equals getVerifiedPlatforms (deprecated alias)", () => {
    expect(getAvailablePlatforms(anime)).toEqual(getVerifiedPlatforms(anime));
  });
});

describe("P2.3 dub field verdict (DATA-04 keep-with-reason)", () => {
  it("catalog rows keep the dead field as empty string (no invented IDs)", () => {
    const nonEmpty = animes.filter((a) => (a.trailerDubYoutubeId ?? "") !== "");
    expect(nonEmpty).toHaveLength(0);
  });

  it("dub gate ignores the row field (empty map = unverified even if field set)", () => {
    const withField = { ...animes[0], trailerDubYoutubeId: "dQw4w9WgXcQ" };
    expect(resolveTrailerDub(withField).verified).toBe(false);
    expect(resolveTrailerDub(withField).videoId).toBeUndefined();
  });
});
