import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/subs/auto-generate/route";
import { checkRateLimit, resetRateLimitStore, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

function post(body: string | null, ip = "203.0.113.7"): NextRequest {
  return new NextRequest("http://localhost/api/subs/auto-generate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body,
  });
}

function anilistMediaResponse() {
  return {
    data: {
      Media: {
        id: 21,
        title: { romaji: "One Piece", english: "One Piece", native: "ワンピース" },
        coverImage: { extraLarge: "https://example.com/c.jpg", large: "https://example.com/s.jpg" },
        bannerImage: null,
        averageScore: 87,
        seasonYear: 1999,
        season: "FALL",
        episodes: 1000,
        status: "RELEASING",
        studios: { nodes: [{ name: "Toei" }] },
        genres: ["Action", "Adventure"],
        trailer: null,
        description: "Pirate adventure",
        popularity: 500000,
      },
    },
  };
}

beforeEach(() => {
  resetRateLimitStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/subs/auto-generate", () => {
  it("generates cues for a valid request, normalizing animeId to a number", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(anilistMediaResponse()), { status: 200 })),
    );
    const res = await POST(post(JSON.stringify({ videoId: "abc12345", animeId: "21" })));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      videoId: string;
      animeId: unknown;
      cues: { start: number; end: number; text: string }[];
    };
    expect(json.videoId).toBe("abc12345");
    expect(json.animeId).toBe(21);
    expect(json.cues.length).toBeGreaterThan(0);
    expect(json.cues[0].text).toContain("One Piece");
  });

  it("works without animeId (animeId null, no upstream call needed)", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(post(JSON.stringify({ videoId: "abc12345" })));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { videoId: string; animeId: unknown };
    expect(json.videoId).toBe("abc12345");
    expect(json.animeId).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("400s bad videoIds with a stable error shape", async () => {
    for (const videoId of ["", "ab", "x".repeat(21), "has space!", 12345, null]) {
      const res = await POST(post(JSON.stringify({ videoId, animeId: 21 })));
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: { code: string; message: string } };
      expect(json.error.code).toBe("invalid_video_id");
    }
  });

  it("400s bad animeIds (negative, zero, NaN-ish, non-safe-integer, wrong type)", async () => {
    for (const animeId of [0, -3, 3.5e30, "abc", "Infinity", true, {}, []]) {
      const res = await POST(post(JSON.stringify({ videoId: "abc12345", animeId })));
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: { code: string } };
      expect(json.error.code).toBe("invalid_anime_id");
    }
    // Floats are floored to the AniList Int contract.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(anilistMediaResponse()), { status: 200 })),
    );
    const res = await POST(post(JSON.stringify({ videoId: "abc12345", animeId: 21.9 })));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { animeId: unknown }).animeId).toBe(21);
  });

  it("400s malformed JSON with observability (warn logged, no body leaked)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await POST(post("{oops not json"));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("malformed_json");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logged = warnSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("malformed JSON");
    expect(logged).not.toContain("oops");
    warnSpy.mockRestore();
  });

  it("falls back gracefully when AniList fails (200, videoId title)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad gateway", { status: 502 })),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post(JSON.stringify({ videoId: "abc12345", animeId: 21 })));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { videoId: string; animeId: unknown; cues: { text: string }[] };
    expect(json.videoId).toBe("abc12345");
    expect(json.animeId).toBe(21);
    expect(json.cues.length).toBeGreaterThan(0);
    errSpy.mockRestore();
  });

  it("falls back gracefully when AniList throws (network down)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post(JSON.stringify({ videoId: "abc12345", animeId: 21 })));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { videoId: string }).videoId).toBe("abc12345");
    errSpy.mockRestore();
  });

  it("rejects oversized bodies with 413", async () => {
    const big = JSON.stringify({ videoId: "abc12345", pad: "x".repeat(40_000) });
    const r = new NextRequest("http://localhost/api/subs/auto-generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(big.length),
        "x-forwarded-for": "203.0.113.7",
      },
      body: big,
    });
    const res = await POST(r);
    expect(res.status).toBe(413);
  });

  it("429s with Retry-After once the per-IP budget is exceeded", async () => {
    const ip = "198.51.100.77";
    for (let i = 0; i < RATE_LIMIT_PRESETS.autoGeneratePerIp.limit; i++) {
      checkRateLimit(
        `autogen:ip:${ip}`,
        RATE_LIMIT_PRESETS.autoGeneratePerIp.limit,
        RATE_LIMIT_PRESETS.autoGeneratePerIp.windowMs,
      );
    }
    const res = await POST(post(JSON.stringify({ videoId: "abc12345" }), ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "rate_limited",
    );
  });
});
