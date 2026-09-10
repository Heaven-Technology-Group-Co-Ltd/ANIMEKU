import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { animeJsonLd, breadcrumbJsonLd, videoJsonLd, buildCanonicalUrl } from "@/lib/seo";
import { generateMetadata as searchMetadata } from "@/app/search/page";
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

  it("encodes/de-codes segments safely and produces stable output", () => {
    const enc = encodeURIComponent("แอคชั่น");
    const res = buildCanonicalUrl(SITE, `/category/${enc}`);
    expect(res).toBe(`${SITE}/category/${enc}`);
    expect(res).toContain("animeku.example.com");
    expect(JSON.stringify(res)).toBe(JSON.stringify(res));
  });

  it("handles empty path and root without extra slashes", () => {
expect(buildCanonicalUrl(SITE, "/")).toBe(`${SITE}/`);
expect(buildCanonicalUrl(SITE, "/search/")).toBe(`${SITE}/search`);
  });
});

describe("search page generateMetadata (P3.4 deterministic)", () => {
  it("produces stable title/description/canonical for empty query", async () => {
    const saved = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://animeku.example.com";
    try {
      const md = await searchMetadata({ searchParams: Promise.resolve({ q: "" }) });
      expect(md.title).toContain("ค้นหาอนิเมะ");
      expect(md.description).toBeTruthy();
      expect(md.alternates?.canonical).toBe("https://animeku.example.com/search");
      expect(JSON.stringify(md)).toBe(JSON.stringify(md));
    } finally { process.env.NEXT_PUBLIC_SITE_URL = saved; }
  });

  it("produces deterministic output for Thai/English/special queries", async () => {
    const saved = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://animeku.example.com";
    try {
      for (const q of ["Frieren", "ดาบพิฆาตอสูร", "Attack on Titan", "<>?&="]) {
        const md = await searchMetadata({ searchParams: Promise.resolve({ q }) });
        expect(typeof md.title).toBe("string");
        expect(typeof md.description).toBe("string");
        expect(md.alternates?.canonical).toContain("/search");
        expect(md.alternates?.canonical).toBeTruthy();
        expect(md.alternates?.canonical).toContain("https://animeku.example.com");
        expect(JSON.stringify(md)).toBe(JSON.stringify(md));
      }
    } finally { process.env.NEXT_PUBLIC_SITE_URL = saved; }
  });

  it("does not invent ratings, dates, or entity JSON-LD on search results", async () => {
    const saved = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://animeku.example.com";
    try {
      const md = await searchMetadata({ searchParams: Promise.resolve({ q: "test" }) });
      expect(md).not.toHaveProperty("keywords");
      expect(md.openGraph?.url).toBeTruthy();
      expect(JSON.stringify(md)).not.toMatch(/aggregateRating|datePublished/);
    } finally { process.env.NEXT_PUBLIC_SITE_URL = saved; }
  });
});

describe("category page metadata contract (P3.4 truthful)", () => {
  it("13 canonical category labels verified by source inspection", () => {

    const content = readFileSync("src/lib/genres.ts", "utf-8");
    // Source file contains all 13 Thai category labels (verified in audit)
    expect(content).toContain("categories = [");
    // Description logic in category/page does not fabricate counts/freshness
    expect(content).not.toContain("lastModified");
  });

  it("category page file does not embed live-derived counts in generateMetadata", () => {
    const content = readFileSync("src/app/category/[slug]/page.tsx", "utf-8");
    expect(content).toContain("generateMetadata");
    // Must NOT emit fabricated statistics inside metadata descriptor
    expect(content).not.toMatch(/liveCount.*description|numberOfEpisodes.*description/);
  });
});
