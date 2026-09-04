import { describe, it, expect } from "vitest";
import { animes } from "@/lib/data";

/**
 * P2.5 Task 14 — lightweight data-quality guard over the real catalog.
 * Policy: fix only what is objectively known, otherwise DOCUMENT and never
 * invent replacement data. Every assertion below passes on the current
 * catalog; the two documented exceptions are explicit constants, not silent
 * skips.
 *
 * Known content debt (DOCUMENTED, deferred — not fixed here):
 * - D1: the 4 unreleased rows (`ยังไม่ฉาย`: ids 178788, 171627, 153800,
 *   172463) carry placeholder `rating: 8.8` / `views: ~6M` /
 *   `episodesTotal: 1`. A title cannot have measured ratings or views before
 *   release; the true values are unknown, so nothing is "corrected" — and
 *   P2.5 removes these numbers from JSON-LD so structured data never repeats
 *   them (see `src/lib/seo.ts`).
 * - D2: `LEGACY_SLUG_EXCEPTIONS` — one catalog slug ends in "-" (build-time
 *   truncation). Renaming would break the existing public URL, so the slug
 *   stays and the redesign is deferred (slug-collision work, P2.5 §deferred).
 * - D3: 100/104 rows embed demo `hlsUrl` placeholders + synthetic episode
 *   `updatedAt`/`views` (`toAnime` likewise synthesizes them). Reality gap is
 *   owned by DATA-01 (real media supply); SEO no longer consumes them.
 */
const LEGACY_SLUG_EXCEPTIONS = new Set([
  "112151-kimetsu-no-yaiba-mugen-ressha-", // trailing "-" from build-time truncation; URL frozen
]);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const YT_ID_RE = /^[A-Za-z0-9_-]{6,}$/;
const STATUSES = new Set(["กำลังฉาย", "จบแล้ว", "ยังไม่ฉาย"]);

function isAbsoluteHttpUrl(u: string): boolean {
  try {
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:";
  } catch {
    return false;
  }
}

describe("catalog identity (P2.5 guard)", () => {
  it("has unique ids and unique slugs (one slug → one anime)", () => {
    const ids = animes.map((a) => a.id);
    const slugs = animes.map((a) => a.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has no empty identity/content fields", () => {
    for (const a of animes) {
      expect(a.id.trim().length, `${a.id} id`).toBeGreaterThan(0);
      expect(a.slug.trim().length, `${a.id} slug`).toBeGreaterThan(0);
      expect(a.title.trim().length, `${a.id} title`).toBeGreaterThan(0);
      expect(a.titleTh.trim().length, `${a.id} titleTh`).toBeGreaterThan(0);
      expect(a.titleEn.trim().length, `${a.id} titleEn`).toBeGreaterThan(0);
      expect(a.description.trim().length, `${a.id} description`).toBeGreaterThan(0);
      expect(a.genres.length, `${a.id} genres`).toBeGreaterThan(0);
      expect(STATUSES.has(a.status), `${a.id} status`).toBe(true);
    }
  });

  it("slugs match the safe shape except documented legacy exceptions", () => {
    const bad = animes.map((a) => a.slug).filter((s) => !SLUG_RE.test(s) && !LEGACY_SLUG_EXCEPTIONS.has(s));
    expect(bad).toEqual([]);
    // the exception list must stay exact — no silent growth
    const legacy = animes.map((a) => a.slug).filter((s) => LEGACY_SLUG_EXCEPTIONS.has(s));
    expect(legacy).toEqual([...LEGACY_SLUG_EXCEPTIONS]);
  });
});

describe("catalog numeric ranges (P2.5 guard)", () => {
  it("year / episodesTotal / rating / views are within possible ranges", () => {
    for (const a of animes) {
      expect(Number.isInteger(a.year) && a.year >= 1900 && a.year <= 2100, `${a.id} year`).toBe(true);
      expect(Number.isInteger(a.episodesTotal) && a.episodesTotal >= 1, `${a.id} episodesTotal`).toBe(true);
      expect(a.rating >= 0 && a.rating <= 10, `${a.id} rating`).toBe(true);
      expect(Number.isFinite(a.views) && a.views >= 0, `${a.id} views`).toBe(true);
    }
  });

  it("never lists more episodes than the known total; unreleased rows list none", () => {
    for (const a of animes) {
      expect(a.episodes.length, `${a.id} episodes.length <= episodesTotal`).toBeLessThanOrEqual(a.episodesTotal);
      if (a.status === "ยังไม่ฉาย") {
        expect(a.episodes, `${a.id} unreleased → no episode list`).toEqual([]);
      }
    }
  });
});

describe("catalog URLs (P2.5 guard)", () => {
  it("cover/banner/thumbnail are absolute http(s) URLs", () => {
    for (const a of animes) {
      expect(isAbsoluteHttpUrl(a.cover), `${a.id} cover`).toBe(true);
      expect(isAbsoluteHttpUrl(a.banner), `${a.id} banner`).toBe(true);
      for (const ep of a.episodes) {
        expect(isAbsoluteHttpUrl(ep.thumbnail), `${a.id} ep${ep.number} thumbnail`).toBe(true);
        if (ep.hlsUrl !== undefined) {
          expect(isAbsoluteHttpUrl(ep.hlsUrl), `${a.id} ep${ep.number} hlsUrl`).toBe(true);
        }
      }
    }
  });

  it("trailerYoutubeId is empty (no trailer) or a plausible YouTube id — never whitespace", () => {
    for (const a of animes) {
      const t = a.trailerYoutubeId;
      if (t === undefined || t === "") continue;
      expect(YT_ID_RE.test(t), `${a.id} trailerYoutubeId`).toBe(true);
    }
  });
});
