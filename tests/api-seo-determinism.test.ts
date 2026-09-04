import { describe, it, expect } from "vitest";
import { videoJsonLd, animeJsonLd } from "@/lib/seo";
import type { Anime } from "@/lib/data";

/**
 * P2.5 SEO determinism (resolves the P2.4 TEST-04 deferral).
 * `videoJsonLd.uploadDate = new Date().toISOString()` ("now") was removed —
 * freezing it would have invented a publication date the product does not
 * have, so the field is OMITTED instead (see `src/lib/seo.ts` header + the
 * FIELD→SOURCE→TRUST map). Both builders are now pure functions of their
 * inputs: byte-identical output across calls, with frozen time irrelevant.
 */
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

const episode = { number: 3, titleTh: "ตอนที่ 3", thumbnail: "https://example.com/t3.jpg" };
const SITE = "https://animeku.example.com";

describe("videoJsonLd determinism (P2.5: uploadDate removed)", () => {
  it("is byte-identical across calls (all fields, no exceptions)", () => {
    const a = videoJsonLd(mockAnime, episode, SITE);
    const b = videoJsonLd(mockAnime, episode, SITE);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("emits no uploadDate key at all (never fabricate, never now())", () => {
    const ld = videoJsonLd(mockAnime, episode, SITE);
    expect(ld).not.toHaveProperty("uploadDate");
    expect(JSON.stringify(ld)).not.toMatch(/uploadDate|Date|20\d\d-\d\d-\d\d/);
  });

  it("derives episode-scoped URLs from stable inputs (no date in URLs)", () => {
    const ld = videoJsonLd(mockAnime, episode, SITE);
    expect(ld.contentUrl).toBe(`${SITE}/watch/${mockAnime.slug}/3`);
    expect(ld.embedUrl).toBe(`${SITE}/watch/${mockAnime.slug}/3`);
    expect(ld.contentUrl).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(ld.name).toContain("ตอนที่ 3");
  });
});

describe("animeJsonLd determinism (P2.5)", () => {
  it("is byte-identical across calls", () => {
    const a = animeJsonLd(mockAnime, SITE);
    const b = animeJsonLd(mockAnime, SITE);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
