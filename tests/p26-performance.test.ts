import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { renderToString } from "react-dom/server";
import { GET as captionsGET } from "@/app/api/youtube/captions/route";
import { resetRateLimitStore } from "@/lib/rate-limit";
import {
  CAPTIONS_CACHE_MAX_ENTRIES,
  CAPTIONS_CACHE_TTL_MS,
  captionsCacheKey,
  captionsCacheSize,
  getCaptionsCache,
  resetCaptionsCache,
  setCaptionsCache,
} from "@/lib/captions-cache";
import { animes, selectHomeSections } from "@/lib/data";
import CategoryPills from "@/components/CategoryPills";
import LegalPlatforms from "@/components/LegalPlatforms";

/**
 * P2.6 Performance + Scalability regression tests.
 * Deterministic, network-free (fetch mocked), no sleeps/timers/timing asserts:
 * TTL is asserted with explicit injected timestamps, never wall-clock waits.
 */

const VID = "dQw4w9WgXcQ";
const T0 = 1_700_000_000_000;

function req(v: string, ip = "203.0.113.99"): NextRequest {
  return new NextRequest(`http://localhost/api/youtube/captions?v=${v}`, {
    headers: { "x-forwarded-for": ip },
  });
}

function timedTextXmlTracks(): string {
  return (
    `<?xml version="1.0"?><transcript_list>` +
    `<track id="0" name="" lang_code="en" kind="asr" />` +
    `<track id="1" name="ไทย" lang_code="th" />` +
    `</transcript_list>`
  );
}

beforeEach(() => {
  resetRateLimitStore();
  resetCaptionsCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("captions-cache unit contract", () => {
  it("misses on an empty store and exposes the documented shape constants", () => {
    expect(getCaptionsCache(VID, T0)).toBeNull();
    expect(CAPTIONS_CACHE_MAX_ENTRIES).toBe(200);
    expect(CAPTIONS_CACHE_TTL_MS).toBe(3_600_000);
    expect(captionsCacheKey(VID)).toBe(VID);
    expect(captionsCacheSize()).toBe(0);
  });

  it("hits with byte-identical tracks/source for timedtext, watch, and none", () => {
    const tracks = [{ lang: "th", name: "ไทย", kind: "", isAuto: false }];
    setCaptionsCache("vid-a1", tracks, "timedtext", T0);
    setCaptionsCache("vid-b2", tracks, "watch", T0);
    setCaptionsCache("vid-c3", [], "none", T0);
    expect(getCaptionsCache("vid-a1", T0)).toEqual({ tracks, source: "timedtext" });
    expect(getCaptionsCache("vid-b2", T0)).toEqual({ tracks, source: "watch" });
    expect(getCaptionsCache("vid-c3", T0)).toEqual({ tracks: [], source: "none" });
    expect(captionsCacheSize()).toBe(3);
  });

  it("never stores the error source (upstream failures stay uncached)", () => {
    setCaptionsCache(VID, [], "error", T0);
    expect(getCaptionsCache(VID, T0)).toBeNull();
    expect(captionsCacheSize()).toBe(0);
  });

  it("treats entries as fresh before TTL and stale at/after TTL (explicit now)", () => {
    const tracks = [{ lang: "en", name: "en", kind: "asr", isAuto: true }];
    setCaptionsCache(VID, tracks, "timedtext", T0);
    expect(getCaptionsCache(VID, T0 + CAPTIONS_CACHE_TTL_MS - 1)).not.toBeNull();
    expect(getCaptionsCache(VID, T0 + CAPTIONS_CACHE_TTL_MS)).toBeNull();
    expect(getCaptionsCache(VID, T0 + CAPTIONS_CACHE_TTL_MS + 1)).toBeNull();
    // Stale lookup deletes the entry (observable store size).
    expect(captionsCacheSize()).toBe(0);
  });

  it("evicts oldest-first past maxEntries (bounded memory)", () => {
    const tracks = [{ lang: "en", name: "en", kind: "", isAuto: false }];
    for (let i = 0; i < CAPTIONS_CACHE_MAX_ENTRIES; i++) {
      setCaptionsCache(`video-${i}`, tracks, "timedtext", T0);
    }
    expect(captionsCacheSize()).toBe(CAPTIONS_CACHE_MAX_ENTRIES);
    setCaptionsCache("video-new", tracks, "timedtext", T0);
    expect(captionsCacheSize()).toBe(CAPTIONS_CACHE_MAX_ENTRIES);
    expect(getCaptionsCache("video-0", T0)).toBeNull();
    expect(getCaptionsCache("video-new", T0)).not.toBeNull();
  });
});

describe("captions route cache behavior", () => {
  it("serves the second identical request from cache with zero extra upstream fetches", async () => {
    const fetchMock = vi.fn(async () => new Response(timedTextXmlTracks(), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const first = await captionsGET(req(VID));
    expect(first.status).toBe(200);
    const firstJson = (await first.json()) as { videoId: string; source: string; tracks: unknown[] };
    expect(firstJson.source).toBe("timedtext");
    expect(firstJson.tracks).toHaveLength(2);
    const callsAfterFirst = fetchMock.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    const second = await captionsGET(req(VID));
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(firstJson);
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
  });

  it("does not cache upstream failures: every all-fail request re-fetches", async () => {
    const fetchMock = vi.fn(async () => new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const first = await captionsGET(req(VID));
    expect(first.status).toBe(502);
    const callsAfterFirst = fetchMock.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);
    const second = await captionsGET(req(VID));
    expect(second.status).toBe(502);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it("cached hits still cost rate budget: the 31st same-IP request is 429", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(timedTextXmlTracks(), { status: 200 })));
    let lastStatus = 200;
    for (let i = 0; i < 31; i++) {
      const res = await captionsGET(req(VID));
      lastStatus = res.status;
      if (i < 30) expect(res.status).toBe(200);
    }
    expect(lastStatus).toBe(429);
  });
});

describe("home sections bundle (P2.6 single call-site)", () => {
  it("returns the exact selections page.tsx renders, with consistent counts", () => {
    const s = selectHomeSections();
    expect(s.featured).toBeDefined();
    expect(s.trending).toHaveLength(8);
    expect(s.latestRecommended).toHaveLength(8);
    expect(s.counts.total).toBe(104);
    expect(s.counts.total).toBe(animes.length);
    expect(s.watchable.length + s.upcoming.length).toBe(s.counts.total);
    expect(s.counts.watchable).toBe(s.watchable.length);
    expect(s.counts.upcoming).toBe(s.upcoming.length);
    expect(s.counts.airing + s.counts.completed + s.counts.upcoming).toBe(s.counts.total);
  });
});

describe("server-renderability (client-boundary safety net)", () => {
  it("CategoryPills renders server-side with the active category highlighted", () => {
    const html = renderToString(CategoryPills({ active: "แอคชั่น" }));
    expect(html).toContain("/category/");
    expect(html).toContain("แอคชั่น");
    expect(html).toContain("bg-[#ff3b82]");
  });

  it("LegalPlatforms renders server-side as discovery links for the catalog head", () => {
    const html = renderToString(LegalPlatforms({ anime: animes[0] }));
    expect(html).toContain("ค้นหาเรื่องนี้บน");
    expect(html).toContain("https://www.youtube.com/results?search_query=");
  });
});
