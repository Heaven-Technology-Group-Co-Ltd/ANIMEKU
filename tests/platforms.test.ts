import { describe, it, expect } from "vitest";
import { getLegalPlatforms, getAvailablePlatforms } from "@/lib/platforms";
import type { Anime } from "@/lib/data";

// Helper to create minimal Anime for testing platform logic
function makeAnime(overrides: Partial<Anime> = {}): Anime {
  return {
    id: "999",
    slug: "999-test",
    title: "Test",
    titleTh: "ทดสอบ",
    titleEn: "Test EN",
    description: "desc",
    cover: "https://example.com/cover.jpg",
    banner: "https://example.com/banner.jpg",
    year: 2024,
    season: "ฤดูใบไม้ผลิ 2024",
    episodesTotal: 12,
    episodes: [],
    rating: 8.0,
    views: 100000,
    genres: ["แอคชั่น"],
    status: "จบแล้ว",
    studio: "Test Studio",
    duration: "24 นาที/ตอน",
    ...overrides,
  };
}

describe("getLegalPlatforms", () => {
  it("returns 6 platforms with expected ids", () => {
    const platforms = getLegalPlatforms(makeAnime());
    expect(platforms).toHaveLength(6);
    expect(platforms.map((p) => p.id)).toEqual(["crunchyroll", "bilibili", "iqiyi", "youtube", "netflix", "prime"]);
  });

  it("is deterministic for same id", () => {
    const a1 = getLegalPlatforms(makeAnime({ id: "123" }));
    const a2 = getLegalPlatforms(makeAnime({ id: "123" }));
    expect(a1.map((p) => p.available)).toEqual(a2.map((p) => p.available));
  });

  it("differs for different ids due to hash", () => {
    // Use several ids to prove hash variance influences at least one platform
    const ids = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    const variants = ids.map((id) => getLegalPlatforms(makeAnime({ id })).map((p) => p.available).join(","));
    const unique = new Set(variants);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("bilibili is always available", () => {
    for (const id of ["1", "999", "abc", "xyz"]) {
      const platforms = getLegalPlatforms(makeAnime({ id }));
      expect(platforms.find((p) => p.id === "bilibili")!.available).toBe(true);
    }
  });

  it("crunchyroll available when popular or shounen", () => {
    // Popular => true
    expect(getLegalPlatforms(makeAnime({ rating: 9.0 })).find((p) => p.id === "crunchyroll")!.available).toBe(true);
    // Shounen genre => true
    expect(getLegalPlatforms(makeAnime({ rating: 5.0, genres: ["แอคชั่น"] })).find((p) => p.id === "crunchyroll")!.available).toBe(true);
    // Neither popular nor shounen => false
    expect(getLegalPlatforms(makeAnime({ rating: 5.0, genres: ["โรแมนติก"], trendingRank: 100 })).find((p) => p.id === "crunchyroll")!.available).toBe(false);
  });

  it("netflix requires high rating + finished + even hash", () => {
    // Must be finished
    const notFinished = getLegalPlatforms(makeAnime({ status: "กำลังฉาย", rating: 9.0, id: "0" }));
    expect(notFinished.find((p) => p.id === "netflix")!.available).toBe(false);

    // High rating but hash odd => false
    // Find an id where hash %2 !==0 (odd)
    // For "1": hash => let's brute find odd hash id
    let oddId = "";
    let evenId = "";
    for (let i = 0; i < 20; i++) {
      const id = String(i);
      let h = 0;
      for (let c = 0; c < id.length; c++) h = (h * 31 + id.charCodeAt(c)) >>> 0;
      if (h % 2 === 0 && !evenId) evenId = id;
      if (h % 2 !== 0 && !oddId) oddId = id;
    }
    const evenAnime = makeAnime({ id: evenId, rating: 9.0, status: "จบแล้ว" });
    const oddAnime = makeAnime({ id: oddId, rating: 9.0, status: "จบแล้ว" });
    expect(getLegalPlatforms(evenAnime).find((p) => p.id === "netflix")!.available).toBe(true);
    expect(getLegalPlatforms(oddAnime).find((p) => p.id === "netflix")!.available).toBe(false);
  });

  it("searchUrl encodes title correctly", () => {
    const anime = makeAnime({ titleEn: "Attack on Titan", titleTh: "ทดสอบ" });
    const platforms = getLegalPlatforms(anime);
    const cr = platforms.find((p) => p.id === "crunchyroll")!;
    expect(cr.searchUrl(anime)).toContain(encodeURIComponent("Attack on Titan"));
    const bili = platforms.find((p) => p.id === "bilibili")!;
    expect(bili.searchUrl(anime)).toContain(encodeURIComponent("ทดสอบ"));
  });

  it("platforms have required fields", () => {
    const platforms = getLegalPlatforms(makeAnime());
    for (const p of platforms) {
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.color).toBeDefined();
      expect(p.textColor).toBeDefined();
      expect(p.label).toBeDefined();
      expect(typeof p.available).toBe("boolean");
      expect(typeof p.searchUrl).toBe("function");
    }
  });
});

describe("getAvailablePlatforms", () => {
  it("returns only available platforms", () => {
    const available = getAvailablePlatforms(makeAnime());
    expect(available.every((p) => p.available)).toBe(true);
    expect(available.length).toBeLessThanOrEqual(6);
    expect(available.length).toBeGreaterThan(0); // bilibili always available
  });

  it("is subset of getLegalPlatforms", () => {
    const anime = makeAnime({ id: "42" });
    const all = getLegalPlatforms(anime);
    const avail = getAvailablePlatforms(anime);
    expect(avail.length).toBe(all.filter((p) => p.available).length);
  });
});
