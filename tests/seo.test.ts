import { describe, it, expect } from "vitest";
import { animeJsonLd, breadcrumbJsonLd, videoJsonLd } from "@/lib/seo";
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

describe("animeJsonLd", () => {
  it("generates valid TVSeries JSON-LD", () => {
    const siteUrl = "https://animeku.example.com";
    const ld = animeJsonLd(mockAnime, siteUrl);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("TVSeries");
    expect(ld.name).toBe(mockAnime.titleTh);
    expect(ld.alternateName).toEqual([mockAnime.title, mockAnime.titleEn]);
    expect(ld.description).toBe(mockAnime.description);
    expect(ld.image).toBe(mockAnime.cover);
    expect(ld.genre).toEqual(mockAnime.genres);
    expect(ld.numberOfEpisodes).toBe(mockAnime.episodesTotal);
    expect(ld.productionCompany).toEqual({ "@type": "Organization", name: mockAnime.studio });
    expect(ld.url).toBe(`${siteUrl}/anime/${mockAnime.slug}`);
    expect(ld.datePublished).toBe("2024-01-01");
    expect(ld.aggregateRating.ratingValue).toBe(mockAnime.rating);
    expect(ld.aggregateRating.ratingCount).toBe(Math.floor(mockAnime.views / 100));
  });
});

describe("breadcrumbJsonLd", () => {
  it("generates BreadcrumbList with correct positions", () => {
    const siteUrl = "https://animeku.example.com";
    const items = [
      { name: "Home", url: "/" },
      { name: "Anime", url: "/anime/999-test-anime" },
    ];
    const ld = breadcrumbJsonLd(items, siteUrl);
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

describe("videoJsonLd", () => {
  it("generates VideoObject JSON-LD", () => {
    const siteUrl = "https://animeku.example.com";
    const episode = { number: 1, titleTh: "ตอนที่ 1", thumbnail: "https://example.com/thumb.jpg" };
    const ld = videoJsonLd(mockAnime, episode, siteUrl);
    expect(ld["@type"]).toBe("VideoObject");
    expect(ld.name).toContain("ตอนที่ 1");
    expect(ld.thumbnailUrl).toBe(episode.thumbnail);
    expect(ld.contentUrl).toBe(`${siteUrl}/watch/${mockAnime.slug}/1`);
    expect(ld.embedUrl).toBe(`${siteUrl}/watch/${mockAnime.slug}/1`);
    expect(ld.duration).toBe("PT24M");
    expect(typeof ld.uploadDate).toBe("string");
  });
});
