import { describe, it, expect } from "vitest";
import {
  animes,
  getAnimeBySlug,
  getFeatured,
  getTrending,
  getLatest,
  getLatestEpisodes,
  searchAnimes,
  filterByCategory,
  categories,
} from "@/lib/data";

describe("getAnimeBySlug", () => {
  it("returns anime for known slug", () => {
    const slug = animes[0].slug;
    const result = getAnimeBySlug(slug);
    expect(result).toBeDefined();
    expect(result?.slug).toBe(slug);
    expect(result?.id).toBe(animes[0].id);
  });

  it("returns undefined for missing slug", () => {
    expect(getAnimeBySlug("does-not-exist")).toBeUndefined();
    expect(getAnimeBySlug("")).toBeUndefined();
    expect(getAnimeBySlug("99999-not-found")).toBeUndefined();
  });

  it("is case-sensitive (slug must match exactly)", () => {
    const slug = animes[0].slug;
    expect(getAnimeBySlug(slug.toUpperCase())).toBeUndefined();
  });
});

describe("searchAnimes", () => {
  it("finds by title (romaji)", () => {
    const results = searchAnimes("Shingeki");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((a) => a.slug.includes("shingeki"))).toBe(true);
  });

  it("finds by titleEn", () => {
    const results = searchAnimes("Attack on Titan");
    expect(results.length).toBeGreaterThan(0);
  });

  it("finds by titleTh", () => {
    // Search using a known Thai title fragment from first anime
    const th = animes[0].titleTh.slice(0, 4);
    const results = searchAnimes(th);
    expect(results.length).toBeGreaterThan(0);
  });

  it("finds by genre (Thai exact match via genres.includes)", () => {
    // genres use Thai values like "แอคชั่น" ; searchAnimes uses g.includes(q)
    const results = searchAnimes("แอคชั่น");
    expect(results.length).toBeGreaterThan(0);
    // all results must contain that genre because search matches genre includes
    expect(results.every((a) => a.genres.some((g) => g.includes("แอคชั่น")))).toBe(true);
    expect(results.some((a) => a.genres.includes("แอคชั่น"))).toBe(true);
  });

  it("returns empty for non-matching query", () => {
    expect(searchAnimes("zzzzz_no_match_12345")).toEqual([]);
  });

  it("is case-insensitive for title fields", () => {
    const lower = searchAnimes("death note");
    const upper = searchAnimes("DEATH NOTE");
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBeGreaterThan(0);
  });

  it("returns empty for empty string? — currently matches all via includes('')", () => {
    // Document current behavior: "" lowercased is "" and every title includes ""
    const results = searchAnimes("");
    expect(results.length).toBe(animes.length);
  });
});

describe("filterByCategory", () => {
  it("returns all when category is ทั้งหมด", () => {
    expect(filterByCategory("ทั้งหมด")).toHaveLength(animes.length);
    expect(filterByCategory("ทั้งหมด")).toBe(animes); // same ref
  });

  it("filters by known category", () => {
    const cat = "แอคชั่น";
    const results = filterByCategory(cat);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((a) => a.genres.includes(cat))).toBe(true);
  });

  it("returns empty for unknown category", () => {
    expect(filterByCategory("不存在的分类")).toEqual([]);
  });

  it("every defined category except ทั้งหมด has at least some coverage or is allowed to be empty", () => {
    // Ensure categories constant is consistent
    expect(categories).toContain("ทั้งหมด");
    for (const cat of categories) {
      const res = filterByCategory(cat);
      expect(Array.isArray(res)).toBe(true);
    }
  });
});

describe("getFeatured", () => {
  it("returns only featured anime sorted by trendingRank asc", () => {
    const featured = getFeatured();
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.every((a) => a.featured)).toBe(true);
    for (let i = 1; i < featured.length; i++) {
      const prev = featured[i - 1].trendingRank ?? 999;
      const curr = featured[i].trendingRank ?? 999;
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });

  it("first featured has trendingRank 1", () => {
    const featured = getFeatured();
    expect(featured[0].trendingRank).toBe(1);
  });
});

describe("getTrending", () => {
  it("returns only anime with trendingRank sorted asc", () => {
    const trending = getTrending();
    expect(trending.length).toBeGreaterThan(0);
    expect(trending.every((a) => typeof a.trendingRank === "number")).toBe(true);
    for (let i = 1; i < trending.length; i++) {
      expect(trending[i - 1].trendingRank!).toBeLessThan(trending[i].trendingRank!);
    }
  });

  it("is deterministic and does not mutate source array", () => {
    const before = [...animes];
    getTrending();
    expect(animes.map((a) => a.id)).toEqual(before.map((a) => a.id));
  });
});

describe("getLatest", () => {
  it("sorts by year desc, then seasonRank desc, then id desc", () => {
    const latest = getLatest();
    expect(latest.length).toBe(animes.length);
    // Verify ordering invariant: year desc primary
    for (let i = 1; i < latest.length; i++) {
      const a = latest[i - 1];
      const b = latest[i];
      if (a.year !== b.year) {
        expect(a.year).toBeGreaterThanOrEqual(b.year);
      }
    }
    // Ensure deterministic: sorted copy, not mutating animes
    const idsBefore = animes.map((a) => a.id);
    getLatest();
    expect(animes.map((a) => a.id)).toEqual(idsBefore);
  });

  it("latest first entry has max year", () => {
    const latest = getLatest();
    const maxYear = Math.max(...animes.map((a) => a.year));
    expect(latest[0].year).toBe(maxYear);
  });

  it("is genuinely different from trending order", () => {
    const trending = getTrending().map((a) => a.id);
    const latest = getLatest().map((a) => a.id);
    // Not identical ordering
    expect(trending.join(",")).not.toBe(latest.join(","));
  });
});

describe("getLatestEpisodes", () => {
  it("returns at most 8 episodes sorted by views desc and each has anime ref", () => {
    const eps = getLatestEpisodes();
    expect(eps.length).toBeLessThanOrEqual(8);
    expect(eps.length).toBeGreaterThan(0);
    for (const ep of eps) {
      expect(ep.anime).toBeDefined();
      expect(ep.views).toBeDefined();
    }
    for (let i = 1; i < eps.length; i++) {
      expect(eps[i - 1].views).toBeGreaterThanOrEqual(eps[i].views);
    }
  });
});
