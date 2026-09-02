import { describe, it, expect } from "vitest";
import { toAnime, type AniAnime } from "@/lib/anilist";

function makeAni(overrides: Partial<AniAnime> = {}): AniAnime {
  return {
    id: 999,
    title: { romaji: "Test Romaji", english: "Test English", native: "テスト" },
    coverImage: { extraLarge: "https://example.com/cover.jpg", large: "https://example.com/cover-small.jpg" },
    bannerImage: "https://example.com/banner.jpg",
    averageScore: 85,
    seasonYear: 2024,
    season: "SPRING",
    episodes: 12,
    status: "FINISHED",
    studios: { nodes: [{ name: "Test Studio" }] },
    genres: ["Action", "Romance", "Comedy"],
    trailer: { id: "abc123", site: "youtube", thumbnail: "https://i.ytimg.com/vi/abc123/hqdefault.jpg" },
    description: "<i>Test</i> description<br>with html",
    popularity: 100000,
    ...overrides,
  };
}

describe("toAnime mapping", () => {
  it("maps basic fields correctly", () => {
    const ani = makeAni();
    const anime = toAnime(ani, 1);
    expect(anime.id).toBe("999");
    expect(anime.title).toBe("Test Romaji");
    expect(anime.titleEn).toBe("Test English");
    expect(anime.titleTh).toBe("Test English"); // fallback to english
    expect(anime.cover).toBe("https://example.com/cover.jpg");
    expect(anime.banner).toBe("https://example.com/banner.jpg");
    expect(anime.year).toBe(2024);
    expect(anime.episodesTotal).toBe(12);
    expect(anime.studio).toBe("Test Studio");
    expect(anime.duration).toBe("24 นาที/ตอน");
  });

  it("strips HTML from description and truncates", () => {
    const ani = makeAni({ description: "<b>Hello</b> <i>world</i> test" });
    const anime = toAnime(ani);
    expect(anime.description).not.toContain("<");
    expect(anime.description).toContain("Hello");
    expect(anime.description.length).toBeLessThanOrEqual(320);
  });

  it("maps status correctly", () => {
    expect(toAnime(makeAni({ status: "FINISHED" })).status).toBe("จบแล้ว");
    expect(toAnime(makeAni({ status: "RELEASING" })).status).toBe("กำลังฉาย");
    expect(toAnime(makeAni({ status: "NOT_YET_RELEASED" })).status).toBe("ยังไม่ฉาย");
    expect(toAnime(makeAni({ status: "HIATUS" })).status).toBe("ยังไม่ฉาย");
    expect(toAnime(makeAni({ status: "CANCELLED" })).status).toBe("จบแล้ว");
    // unknown fallback
    expect(toAnime(makeAni({ status: "UNKNOWN" })).status).toBe("จบแล้ว");
  });

  it("maps genres via genreMap and limits to 3", () => {
    const ani = makeAni({ genres: ["Action", "Romance", "Comedy", "Drama", "Fantasy"] });
    const anime = toAnime(ani);
    expect(anime.genres).toHaveLength(3);
    expect(anime.genres[0]).toBe("แอคชั่น");
    expect(anime.genres[1]).toBe("โรแมนติก");
    expect(anime.genres[2]).toBe("คอมเมดี้");
  });

  it("keeps unknown genre as-is", () => {
    const ani = makeAni({ genres: ["UnknownGenre"] });
    expect(toAnime(ani).genres).toEqual(["UnknownGenre"]);
  });

  it("fallback genre when empty", () => {
    const ani = makeAni({ genres: [] });
    expect(toAnime(ani).genres).toEqual(["แอคชั่น"]);
  });

  it("maps season correctly", () => {
    expect(toAnime(makeAni({ season: "WINTER", seasonYear: 2024 })).season).toBe("ฤดูหนาว 2024");
    expect(toAnime(makeAni({ season: "SPRING", seasonYear: 2023 })).season).toBe("ฤดูใบไม้ผลิ 2023");
    expect(toAnime(makeAni({ season: "SUMMER", seasonYear: 2022 })).season).toBe("ฤดูร้อน 2022");
    expect(toAnime(makeAni({ season: "FALL", seasonYear: 2021 })).season).toBe("ฤดูใบไม้ร่วง 2021");
  });

  it("handles missing season/year gracefully", () => {
    expect(toAnime(makeAni({ season: null, seasonYear: null })).season).toBe("ไม่ระบุ");
    expect(toAnime(makeAni({ season: null, seasonYear: 2024 })).season).toBe("2024");
    expect(toAnime(makeAni({ season: "SPRING", seasonYear: null })).season).toBe("ฤดูใบไม้ผลิ");
  });

  it("maps rating from averageScore", () => {
    expect(toAnime(makeAni({ averageScore: 85 })).rating).toBe(8.5);
    expect(toAnime(makeAni({ averageScore: 73 })).rating).toBe(7.3);
    expect(toAnime(makeAni({ averageScore: null })).rating).toBe(8.0);
    expect(toAnime(makeAni({ averageScore: 100 })).rating).toBe(10);
  });

  it("calculates views from popularity", () => {
    const anime = toAnime(makeAni({ popularity: 100000 }));
    expect(anime.views).toBe(Math.floor(1500000 + 100000 * 0.8));
    // fallback when no popularity
    const anime2 = toAnime(makeAni({ popularity: 0 }));
    expect(anime2.views).toBe(Math.floor(1500000 + 50000 * 0.8));
  });

  it("slugifies romaji title", () => {
    const anime = toAnime(makeAni({ title: { romaji: "Shingeki no Kyojin", english: null, native: "進撃の巨人" } }));
    expect(anime.slug).toMatch(/^999-/);
    expect(anime.slug).toContain("shingeki-no-kyojin");
    expect(anime.slug.length).toBeLessThanOrEqual(35); // 30 chars romaji + id prefix
  });

  it("sets trendingRank and featured correctly", () => {
    expect(toAnime(makeAni(), 2).trendingRank).toBe(2);
    expect(toAnime(makeAni(), 2).featured).toBe(true);
    expect(toAnime(makeAni(), 5).featured).toBe(false);
    expect(toAnime(makeAni(), undefined).featured).toBe(false);
    expect(toAnime(makeAni(), 3).featured).toBe(true);
    expect(toAnime(makeAni(), 4).featured).toBe(false);
  });

  it("handles youtube trailer vs non-youtube", () => {
    const withYt = toAnime(makeAni({ trailer: { id: "xyz", site: "youtube", thumbnail: null } }));
    expect(withYt.trailerYoutubeId).toBe("xyz");
    expect(withYt.trailerThumbnail).toBeUndefined(); // null -> undefined

    const nonYt = toAnime(makeAni({ trailer: { id: "xyz", site: "dailymotion", thumbnail: null } }));
    expect(nonYt.trailerYoutubeId).toBeUndefined();

    const noTrailer = toAnime(makeAni({ trailer: null }));
    expect(noTrailer.trailerYoutubeId).toBeUndefined();
  });

  it("generates episodes array based on status and episode count", () => {
    const finished = toAnime(makeAni({ status: "FINISHED", episodes: 12 }));
    expect(finished.episodes).toHaveLength(12);
    expect(finished.episodes[0].number).toBe(1);
    expect(finished.episodes[0].views).toBe(finished.views);

    const notYet = toAnime(makeAni({ status: "NOT_YET_RELEASED", episodes: 12 }));
    expect(notYet.episodes).toHaveLength(0);

    const capped = toAnime(makeAni({ status: "FINISHED", episodes: 100 }));
    expect(capped.episodes).toHaveLength(24); // capped at 24
  });

  it("uses fallback values for missing studio/cover", () => {
    const ani = makeAni({
      studios: { nodes: [] },
      coverImage: { extraLarge: "https://example.com/cover.jpg", large: "https://example.com/small.jpg" },
      bannerImage: null,
      description: null,
    });
    const anime = toAnime(ani);
    expect(anime.studio).toBe("Unknown");
    expect(anime.banner).toBe("https://example.com/cover.jpg"); // fallback to cover
    expect(anime.description).toContain("Test Romaji"); // fallback description includes title
  });

  it("uses English or Romaji fallback for titleTh", () => {
    const withEnglish = makeAni({ title: { romaji: "Romaji", english: "English", native: "native" } });
    expect(toAnime(withEnglish).titleTh).toBe("English");

    const withoutEnglish = makeAni({ title: { romaji: "Romaji", english: null, native: "native" } });
    expect(toAnime(withoutEnglish).titleTh).toBe("Romaji");
  });
});
