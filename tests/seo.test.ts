import { describe, it, expect } from "vitest";
import { animeJsonLd, breadcrumbJsonLd, videoJsonLd, buildCanonicalUrl } from "@/lib/seo";
import type { Anime } from "@/lib/data";

const mockAnime: Anime = {
  id: "999",
  slug: "999-test-anime",
  title: "Test Anime",
  titleTh: "ทดสอบ อนิเมะ",
  titleEn: "Test Anime EN",
  description: "A test anime description for SEO.",
  cover: "https://example.com/cover.jpg",
  banner: "https://example.com/banner.jpg",
  year: 2024,
  season: "ฤดูใบไม้ผลิ 2024",
  episodesTotal: 12,
  episodes: [],
  rating: 8.5,
  views: 500000,
  genres: ["แอคชั่น", "ดราม่า"],
  status: "จบแล้ว",
  studio: "Test Studio",
  duration: "24 นาที/ตอน",
};

const SITE = "https://animeku.example.com";

describe("animeJsonLd (P2.5 honest contract)", () => {
  it("generates valid TVSeries JSON-LD with DIRECT-source fields only", () => {
    const ld = animeJsonLd(mockAnime, SITE);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("TVSeries");
    expect(ld.name).toBe(mockAnime.titleTh);
    expect(ld.alternateName).toEqual([mockAnime.title, mockAnime.titleEn]);
    expect(ld.description).toBe(mockAnime.description);
    expect(ld.image).toBe(mockAnime.cover);
    expect(ld.genre).toEqual(mockAnime.genres);
    expect(ld.numberOfEpisodes).toBe(mockAnime.episodesTotal);
    expect(ld.productionCompany).toEqual({ "@type": "Organization", name: mockAnime.studio });
    expect(ld.url).toBe(`${SITE}/anime/${mockAnime.slug}`);
  });

  it("omits fabricated/inferred fields (no fake ratings, dates, seasons)", () => {
    const ld = animeJsonLd(mockAnime, SITE);
    expect(ld).not.toHaveProperty("aggregateRating");
    expect(ld).not.toHaveProperty("datePublished");
    expect(ld).not.toHaveProperty("numberOfSeasons");
    expect(ld).not.toHaveProperty("uploadDate");
    expect(JSON.stringify(ld)).not.toMatch(/viewCount|interactionCount|ratingCount/);
  });

  it("dedupes alternateName and drops blanks", () => {
    const dup = { ...mockAnime, title: "Same", titleEn: "Same" };
    expect(animeJsonLd(dup, SITE).alternateName).toEqual(["Same"]);
    const blank = { ...mockAnime, title: "", titleEn: "  " };
    expect(animeJsonLd(blank, SITE)).not.toHaveProperty("alternateName");
  });

  it("omits placeholder studio instead of emitting an Organization named Unknown", () => {
    expect(animeJsonLd({ ...mockAnime, studio: "Unknown" }, SITE)).not.toHaveProperty("productionCompany");
    expect(animeJsonLd({ ...mockAnime, studio: "" }, SITE)).not.toHaveProperty("productionCompany");
  });

  it("round-trips through JSON (no undefined/NaN/functions)", () => {
    const ld = animeJsonLd(mockAnime, SITE);
    expect(JSON.parse(JSON.stringify(ld))).toEqual(ld);
  });
});

describe("breadcrumbJsonLd", () => {
  it("generates BreadcrumbList with correct positions", () => {
    const items = [
      { name: "Home", url: "/" },
      { name: "Anime", url: "/anime/999-test-anime" },
    ];
    const ld = breadcrumbJsonLd(items, SITE);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(2);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1].position).toBe(2);
    expect(ld.itemListElement[0].item).toBe("https://animeku.example.com/");
    expect(ld.itemListElement[1].item).toBe("https://animeku.example.com/anime/999-test-anime");
  });

  it("handles empty items", () => {
    const ld = breadcrumbJsonLd([], "https://example.com");
    expect(ld.itemListElement).toEqual([]);
  });
});

describe("videoJsonLd (P2.5 honest contract)", () => {
  it("generates VideoObject JSON-LD without invented uploadDate/duration", () => {
    const episode = { number: 1, titleTh: "ตอนที่ 1", thumbnail: "https://example.com/thumb.jpg" };
    const ld = videoJsonLd(mockAnime, episode, SITE);
    expect(ld["@type"]).toBe("VideoObject");
    expect(ld.name).toContain("ตอนที่ 1");
    expect(ld.thumbnailUrl).toBe(episode.thumbnail);
    expect(ld.contentUrl).toBe(`${SITE}/watch/${mockAnime.slug}/1`);
    expect(ld.embedUrl).toBe(`${SITE}/watch/${mockAnime.slug}/1`);
    expect(ld).not.toHaveProperty("uploadDate");
    expect(ld).not.toHaveProperty("duration");
  });
});

describe("buildCanonicalUrl", () => {
  it("builds absolute canonicals without dup slashes or query/hash", () => {
    expect(buildCanonicalUrl(SITE, "/anime/999-test-anime")).toBe(`${SITE}/anime/999-test-anime`);
    expect(buildCanonicalUrl(`${SITE}/`, "//anime//999-test-anime")).toBe(`${SITE}/anime/999-test-anime`);
    expect(buildCanonicalUrl(SITE, "/search?q=x#frag")).toBe(`${SITE}/search`);
    expect(buildCanonicalUrl(SITE, "/")).toBe(`${SITE}/`);
  });
});
