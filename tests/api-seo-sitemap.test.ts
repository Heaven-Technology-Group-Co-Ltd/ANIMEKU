import { describe, it, expect, afterEach } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { animes, categories } from "@/lib/data";
import { buildCanonicalUrl } from "@/lib/seo";

/**
 * P2.5 Task 11 — sitemap/robots integrity.
 * - Prod host comes from the P2.1 env config (`NEXT_PUBLIC_SITE_URL`), never
 *   hardcoded localhost: tests pin the host explicitly with save/restore
 *   (same pattern as `tests/api-env-prod.test.ts`), no machine-.env dependence.
 * - Only intended public routes: `/`, `/search`, local `/anime/[slug]`,
 *   `/watch/[slug]/1` (only episode 1 exists), `/category/[label]`.
 *   No API/internal/admin routes, no duplicates, no query strings, no
 *   invented slugs (no catalog expansion — live AniList extras are NOT listed).
 * - No `lastModified` anywhere (the catalog has no per-row update dates;
 *   build-time `now()` was removed in P2.5).
 */
const PROD = "https://animeku.example.com";
const savedSite = process.env.NEXT_PUBLIC_SITE_URL;

function useProdSite() {
  process.env.NEXT_PUBLIC_SITE_URL = PROD;
}

afterEach(() => {
  if (savedSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = savedSite;
});

describe("sitemap (P2.5)", () => {
  it("is byte-identical across calls (no build-time now())", () => {
    useProdSite();
    const a = JSON.stringify(sitemap());
    const b = JSON.stringify(sitemap());
    expect(a).toBe(b);
    expect(a).not.toMatch(/20\d\d-\d\d-\d\d/);
  });

  it("uses the prod host for every URL (no localhost)", () => {
    useProdSite();
    const urls = sitemap().map((e) => e.url);
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(u.startsWith(`${PROD}/`)).toBe(true);
      expect(u).not.toMatch(/localhost|127\.0\.0\.1/);
    }
  });

  it("lists exactly the intended public routes (no API/internal/dup/query)", () => {
    useProdSite();
    const urls = sitemap().map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length); // no duplicates
    for (const u of urls) {
      expect(u).not.toMatch(/\/api\/|\/admin|\?|#/);
    }
    expect(urls).toContain(`${PROD}/`);
    expect(urls).toContain(`${PROD}/search`);
    // one anime + one watch/1 per local catalog row
    expect(urls.filter((u) => u.includes("/anime/")).length).toBe(animes.length);
    expect(urls.filter((u) => u.includes("/watch/")).length).toBe(animes.length);
    for (const u of urls.filter((x) => x.includes("/watch/"))) {
      expect(u.endsWith("/1")).toBe(true); // never /2..5
    }
    expect(urls.filter((u) => u.includes("/category/")).length).toBe(categories.length);
    expect(urls.length).toBe(2 + animes.length * 2 + categories.length);
  });

  it("emits no lastModified (no invented dates)", () => {
    useProdSite();
    for (const entry of sitemap()) {
      expect(entry).not.toHaveProperty("lastModified");
    }
  });
});

describe("robots (P2.5)", () => {
  it("points at the prod sitemap with an absolute URL", () => {
    useProdSite();
    const r = robots();
    expect(r.sitemap).toBe(`${PROD}/sitemap.xml`);
  });
});

describe("canonical builder vs sitemap agreement (P2.5)", () => {
  it("canonicals resolve to URLs the sitemap actually lists", () => {
    useProdSite();
    const urls = new Set(sitemap().map((e) => e.url));
    const first = animes[0];
    expect(urls.has(buildCanonicalUrl(PROD, `/anime/${first.slug}`))).toBe(true);
    expect(urls.has(buildCanonicalUrl(PROD, `/watch/${first.slug}/1`))).toBe(true);
    expect(urls.has(buildCanonicalUrl(PROD, `/category/${encodeURIComponent(categories[1])}`))).toBe(true);
  });
});
