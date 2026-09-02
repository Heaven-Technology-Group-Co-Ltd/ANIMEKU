import { describe, it, expect } from "vitest";
import { getLegalPlatforms, getAvailablePlatforms, getVerifiedPlatforms } from "@/lib/platforms";
import type { Anime } from "@/lib/data";
import type { PlatformId } from "@/lib/platforms";

type AnimeWithVerification = Anime & { verifiedPlatforms?: readonly PlatformId[] };

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

function makeVerifiedAnime(verifiedPlatforms: readonly PlatformId[], overrides: Partial<Anime> = {}): AnimeWithVerification {
  return {
    ...makeAnime(overrides),
    verifiedPlatforms,
  } as AnimeWithVerification;
}

describe("getLegalPlatforms", () => {
  it("returns 6 platforms with expected ids in stable order", () => {
    const platforms = getLegalPlatforms(makeAnime());
    expect(platforms).toHaveLength(6);
    expect(platforms.map((p) => p.id)).toEqual(["crunchyroll", "bilibili", "iqiyi", "youtube", "netflix", "prime"]);
  });

  it("all platforms are discovery (unverified) when no explicit verified data exists", () => {
    const platforms = getLegalPlatforms(makeAnime());
    for (const p of platforms) {
      expect(p.verified).toBe(false);
      expect(p.available).toBe(false); // deprecated alias mirrors verified
    }
    // No platform is exposed as confirmed availability by default
    expect(platforms.every((p) => !p.verified)).toBe(true);
    expect(platforms.every((p) => !p.available)).toBe(true);
  });

  it("unverified platform is never exposed as confirmed availability", () => {
    const platforms = getLegalPlatforms(makeAnime({ id: "16498", rating: 9.5, genres: ["แอคชั่น"] }));
    // Even high-rated / popular titles are still unverified without explicit data
    expect(platforms.every((p) => p.verified === false)).toBe(true);
    // getVerifiedPlatforms returns empty when nothing is verified
    expect(getVerifiedPlatforms(makeAnime({ id: "16498", rating: 9.5 }))).toHaveLength(0);
    expect(getAvailablePlatforms(makeAnime({ id: "16498", rating: 9.5 }))).toHaveLength(0);
  });

  it("verified platform can be exposed as verified via explicit verifiedPlatforms field", () => {
    const anime = makeVerifiedAnime(["crunchyroll", "bilibili"], { id: "test-verified-1" });
    const platforms = getLegalPlatforms(anime);
    expect(platforms.find((p) => p.id === "crunchyroll")!.verified).toBe(true);
    expect(platforms.find((p) => p.id === "bilibili")!.verified).toBe(true);
    expect(platforms.find((p) => p.id === "crunchyroll")!.available).toBe(true);
    expect(platforms.find((p) => p.id === "iqiyi")!.verified).toBe(false);
    expect(platforms.find((p) => p.id === "netflix")!.verified).toBe(false);

    const verified = getVerifiedPlatforms(anime);
    expect(verified.map((p) => p.id).sort()).toEqual(["bilibili", "crunchyroll"]);
    expect(verified.every((p) => p.verified)).toBe(true);
  });

  it("getAvailablePlatforms is deprecated alias of getVerifiedPlatforms", () => {
    const anime = makeVerifiedAnime(["youtube"], { id: "alias-check" });
    const viaVerified = getVerifiedPlatforms(anime);
    const viaAvailable = getAvailablePlatforms(anime);
    expect(viaAvailable.map((p) => p.id)).toEqual(viaVerified.map((p) => p.id));
    expect(viaAvailable.map((p) => p.url)).toEqual(viaVerified.map((p) => p.url));
    expect(viaAvailable.map((p) => p.verified)).toEqual(viaVerified.map((p) => p.verified));
    expect(viaAvailable.map((p) => p.id)).toEqual(["youtube"]);
  });

  it("is deterministic for same anime — urls and verified flags stable", () => {
    const a1 = getLegalPlatforms(makeAnime({ id: "123", titleEn: "Deterministic" }));
    const a2 = getLegalPlatforms(makeAnime({ id: "123", titleEn: "Deterministic" }));
    expect(a1.map((p) => p.url)).toEqual(a2.map((p) => p.url));
    expect(a1.map((p) => p.verified)).toEqual(a2.map((p) => p.verified));
    expect(a1.map((p) => p.searchUrl(makeAnime({ id: "123", titleEn: "Deterministic" })))).toEqual(
      a2.map((p) => p.searchUrl(makeAnime({ id: "123", titleEn: "Deterministic" }))),
    );
  });

  it("different titles produce different encoded urls (deterministic per title)", () => {
    const p1 = getLegalPlatforms(makeAnime({ id: "same-id", titleEn: "Title A" })).find((p) => p.id === "crunchyroll")!;
    const p2 = getLegalPlatforms(makeAnime({ id: "same-id", titleEn: "Title B" })).find((p) => p.id === "crunchyroll")!;
    expect(p1.url).not.toEqual(p2.url);
    expect(p1.url).toContain(encodeURIComponent("Title A"));
    expect(p2.url).toContain(encodeURIComponent("Title B"));
  });

  it("platform output is deterministic across repeated calls", () => {
    const ids = ["1", "2", "3", "42", "999", "16498", "101922"];
    for (const id of ids) {
      const first = getLegalPlatforms(makeAnime({ id }));
      const second = getLegalPlatforms(makeAnime({ id }));
      expect(first.map((p) => ({ id: p.id, url: p.url, verified: p.verified }))).toEqual(
        second.map((p) => ({ id: p.id, url: p.url, verified: p.verified })),
      );
      // searchUrl is a function returning url — compare behaviour, not identity
      for (let i = 0; i < first.length; i++) {
        expect(first[i].searchUrl(makeAnime({ id }))).toBe(second[i].searchUrl(makeAnime({ id })));
      }
    }
  });

  it("search/discovery URL is correctly constructed with proper encoding", () => {
    const anime = makeAnime({ titleEn: "Attack on Titan", titleTh: "ทดสอบ" });
    const platforms = getLegalPlatforms(anime);

    const cr = platforms.find((p) => p.id === "crunchyroll")!;
    expect(cr.url).toBe(`https://www.crunchyroll.com/search?q=${encodeURIComponent("Attack on Titan")}`);
    expect(cr.searchUrl(anime)).toBe(cr.url);

    const bili = platforms.find((p) => p.id === "bilibili")!;
    expect(bili.url).toBe(`https://www.bilibili.tv/search?q=${encodeURIComponent("ทดสอบ")}`);
    expect(bili.searchUrl(anime)).toBe(bili.url);

    const iqiyi = platforms.find((p) => p.id === "iqiyi")!;
    expect(iqiyi.url).toBe(`https://www.iq.com/search?query=${encodeURIComponent("Attack on Titan")}`);

    const yt = platforms.find((p) => p.id === "youtube")!;
    expect(yt.url).toBe(`https://www.youtube.com/results?search_query=${encodeURIComponent("Attack on Titan ซับไทย")}`);

    const nf = platforms.find((p) => p.id === "netflix")!;
    expect(nf.url).toBe(`https://www.netflix.com/search?q=${encodeURIComponent("Attack on Titan")}`);

    const prime = platforms.find((p) => p.id === "prime")!;
    expect(prime.url).toBe(`https://www.primevideo.com/search?phrase=${encodeURIComponent("Attack on Titan")}`);
  });

  it("encodes special characters and Thai correctly — no malformed URLs", () => {
    const anime = makeAnime({ titleEn: "Kaguya-sama: Love is War & More? #1", titleTh: "เรื่อง & ทดสอบ/พิเศษ" });
    const platforms = getLegalPlatforms(anime);
    for (const p of platforms) {
      const url = p.url;
      // Must be valid absolute URL
      expect(() => new URL(url)).not.toThrow();
      expect(url.startsWith("https://")).toBe(true);
      // Raw unencoded special chars must not appear in query
      // e.g. raw " & " should be encoded
      if (p.id !== "bilibili" && p.id !== "youtube") {
        expect(url).not.toContain(" & ");
      }
      // searchUrl must return same url
      expect(p.searchUrl(anime)).toBe(url);
    }
  });

  it("platforms have required fields including new verified/url", () => {
    const platforms = getLegalPlatforms(makeAnime());
    for (const p of platforms) {
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.color).toBeDefined();
      expect(p.textColor).toBeDefined();
      expect(p.label).toBeDefined();
      expect(typeof p.verified).toBe("boolean");
      expect(typeof p.available).toBe("boolean");
      expect(p.available).toBe(p.verified);
      expect(typeof p.url).toBe("string");
      expect(p.url.startsWith("https://")).toBe(true);
      expect(typeof p.searchUrl).toBe("function");
      expect(p.searchUrl(makeAnime())).toBe(p.url);
    }
  });

  it("existing platform list remains stable — 6 entries with branding intact", () => {
    const platforms = getLegalPlatforms(makeAnime());
    expect(platforms.map((p) => ({ id: p.id, name: p.name, label: p.label }))).toEqual([
      { id: "crunchyroll", name: "Crunchyroll", label: "Crunchyroll" },
      { id: "bilibili", name: "Bilibili", label: "Bilibili" },
      { id: "iqiyi", name: "iQIYI", label: "iQIYI" },
      { id: "youtube", name: "YouTube (Muse)", label: "YouTube" },
      { id: "netflix", name: "Netflix", label: "Netflix" },
      { id: "prime", name: "Prime Video", label: "Prime Video" },
    ]);
  });

  it("no external network is required — pure synchronous function", () => {
    // No fetch usage, no async — just call and verify no promise
    const result = getLegalPlatforms(makeAnime());
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(6);
    // Calling many times must not trigger network or throw
    for (let i = 0; i < 10; i++) {
      expect(() => getLegalPlatforms(makeAnime({ id: String(i) }))).not.toThrow();
    }
  });
});

describe("getVerifiedPlatforms / getAvailablePlatforms", () => {
  it("returns only verified platforms — empty when no explicit data", () => {
    const verified = getVerifiedPlatforms(makeAnime());
    expect(verified).toEqual([]);
    expect(getAvailablePlatforms(makeAnime())).toEqual([]);
  });

  it("is subset of getLegalPlatforms and only contains verified entries", () => {
    const anime = makeVerifiedAnime(["netflix", "prime"], { id: "subset-check" });
    const all = getLegalPlatforms(anime);
    const verified = getVerifiedPlatforms(anime);
    expect(verified.length).toBe(2);
    expect(verified.every((p) => p.verified)).toBe(true);
    expect(verified.length).toBe(all.filter((p) => p.verified).length);
    expect(getAvailablePlatforms(anime).length).toBe(verified.length);
  });

  it("returns url field that is deterministic search url, never empty", () => {
    const anime = makeAnime({ titleEn: "One Piece", titleTh: "วันพีซ" });
    const all = getLegalPlatforms(anime);
    for (const p of all) {
      expect(p.url).toBeTruthy();
      expect(p.url).not.toContain("undefined");
      expect(p.url).not.toContain("null");
    }
  });
});
