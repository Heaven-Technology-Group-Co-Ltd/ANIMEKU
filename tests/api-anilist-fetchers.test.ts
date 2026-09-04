import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getTopAnime, searchAnilist, getAnimeByIdAni } from "@/lib/anilist";
import { UpstreamTimeoutError } from "@/lib/fetch-timeout";

/**
 * P2.4 network-fetcher tests for src/lib/anilist.ts (TASK 5).
 * Exercises the REAL production functions with the network boundary
 * (global fetch) mocked per-test. No real AniList traffic, no sleeps,
 * no random values. fetch-mock restored after every test.
 */
function pageMediaResponse(media: unknown[]) {
  return { data: { Page: { media } } };
}

function mediaItem(id: number) {
  return {
    id,
    title: { romaji: "Romaji", english: "English", native: "テスト" },
    coverImage: { extraLarge: "https://example.com/c.jpg", large: "https://example.com/s.jpg" },
    bannerImage: null,
    averageScore: 80,
    seasonYear: 2024,
    season: "SPRING",
    episodes: 12,
    status: "FINISHED",
    studios: { nodes: [{ name: "Studio" }] },
    genres: ["Action"],
    trailer: null,
    description: "desc",
    popularity: 50000,
  };
}

function okJson(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200 });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getTopAnime (mocked network boundary)", () => {
  it("returns media on success and POSTs to the AniList endpoint", async () => {
    const fetchMock = vi.fn(async () => okJson(pageMediaResponse([mediaItem(1)])));
    vi.stubGlobal("fetch", fetchMock);
    const out = await getTopAnime(10);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("graphql.anilist.co");
    expect(init.method).toBe("POST");
  });

  it("throws on HTTP failure (callers degrade gracefully)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad gateway", { status: 502 })));
    await expect(getTopAnime()).rejects.toThrow("AniList 502");
  });

  it("throws on GraphQL errors field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okJson({ errors: [{ message: "Rate limited" }] })),
    );
    await expect(getTopAnime()).rejects.toThrow("Rate limited");
  });

  it("propagates network rejection unwrapped (not a timeout)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    const err = await getTopAnime().catch((e) => e);
    expect(err).toBeInstanceOf(TypeError);
    expect(err).not.toBeInstanceOf(UpstreamTimeoutError);
  });

  it("propagates UpstreamTimeoutError from the fetch-timeout layer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new UpstreamTimeoutError(9000, "graphql.anilist.co");
      }),
    );
    const err = await getTopAnime().catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamTimeoutError);
  });
});

describe("searchAnilist (mocked network boundary)", () => {
  it("short-circuits blank queries with no fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchAnilist("")).toEqual([]);
    expect(await searchAnilist("   ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns media on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okJson(pageMediaResponse([mediaItem(7), mediaItem(8)]))),
    );
    const out = await searchAnilist("frieren");
    expect(out.map((m) => m.id)).toEqual([7, 8]);
  });

  it("throws on HTTP failure and on GraphQL errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 429 })));
    await expect(searchAnilist("frieren")).rejects.toThrow("AniList 429");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okJson({ errors: [{ message: "boom" }] })),
    );
    await expect(searchAnilist("frieren")).rejects.toThrow("boom");
  });

  it("propagates AbortError/timeout without wrapping into success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new UpstreamTimeoutError(9000, "graphql.anilist.co");
      }),
    );
    await expect(searchAnilist("frieren")).rejects.toBeInstanceOf(UpstreamTimeoutError);
  });
});

describe("getAnimeByIdAni (mocked network boundary)", () => {
  it("returns Media on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okJson({ data: { Media: mediaItem(21) } })),
    );
    const out = await getAnimeByIdAni(21);
    expect(out?.id).toBe(21);
  });

  it("throws on HTTP failure, GraphQL errors, and network rejection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 500 })));
    await expect(getAnimeByIdAni(21)).rejects.toThrow("AniList 500");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okJson({ errors: [{ message: "Not found" }] })),
    );
    await expect(getAnimeByIdAni(21)).rejects.toThrow("Not found");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("dns fail");
      }),
    );
    await expect(getAnimeByIdAni(21)).rejects.toThrow("dns fail");
  });

  it("throws when the payload shape is malformed (no silent undefined)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson({ data: null })));
    await expect(getAnimeByIdAni(21)).rejects.toThrow();
  });
});
