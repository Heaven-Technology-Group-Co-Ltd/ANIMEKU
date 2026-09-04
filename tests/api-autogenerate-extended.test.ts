import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/subs/auto-generate/route";
import { resetRateLimitStore } from "@/lib/rate-limit";
import { UpstreamTimeoutError } from "@/lib/fetch-timeout";

/**
 * P2.4 extended auto-generate coverage (TASK 3 gaps not in
 * api-autogenerate.test.ts). All fetch mocked; store reset per test.
 */
function post(body: unknown, ip = "203.0.113.31"): NextRequest {
  return new NextRequest("http://localhost/api/subs/auto-generate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
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

describe("auto-generate body variants", () => {
  it("400s empty-object body with invalid_video_id (no throw)", async () => {
    const res = await POST(post({}));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "invalid_video_id",
    );
  });

  it("ignores unexpected extra fields and still succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(anilistMediaResponse()), { status: 200 })),
    );
    const res = await POST(
      post({ videoId: "abc12345", animeId: 21, admin: true, debug: "x", nested: { a: 1 } }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.videoId).toBe("abc12345");
    expect(json).not.toHaveProperty("admin");
    expect(json).not.toHaveProperty("debug");
  });

  it("trims a padded videoId instead of rejecting it", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(post({ videoId: "  abc12345  " }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { videoId: string }).videoId).toBe("abc12345");
  });
});

describe("auto-generate upstream variants", () => {
  it("falls back to 200 when AniList times out (UpstreamTimeoutError)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new UpstreamTimeoutError(9000, "graphql.anilist.co");
      }),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({ videoId: "abc12345", animeId: 21 }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { videoId: string; cues: { text: string }[] };
    expect(json.videoId).toBe("abc12345");
    expect(json.cues.length).toBeGreaterThan(0);
    // Fallback cues use the videoId as title — no exception, no upstream echo.
    expect(json.cues[0].text).toContain("abc12345");
    errSpy.mockRestore();
  });

  it("falls back to 200 when AniList returns a GraphQL errors payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ errors: [{ message: "boom" }] }), { status: 200 })),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({ videoId: "abc12345", animeId: 21 }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { videoId: string }).videoId).toBe("abc12345");
    errSpy.mockRestore();
  });

  it("falls back to 200 when AniList JSON is malformed (res.json throws)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError("unexpected token");
        },
      })),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({ videoId: "abc12345", animeId: 21 }));
    expect(res.status).toBe(200);
    errSpy.mockRestore();
  });

  it("falls back to 200 when AniList itself is rate-limited (HTTP 429 upstream)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({ videoId: "abc12345", animeId: 21 }));
    // Upstream 429 must not propagate as our 429 (different budget, different
    // Retry-After semantics): graceful 200 fallback instead.
    expect(res.status).toBe(200);
    expect(res.headers.get("retry-after")).toBeNull();
    errSpy.mockRestore();
  });
});

describe("auto-generate response contract", () => {
  it("emits deterministic cue geometry + stable envelope keys", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(anilistMediaResponse()), { status: 200 })),
    );
    const res = await POST(post({ videoId: "abc12345", animeId: 21 }));
    const json = (await res.json()) as {
      videoId: string;
      animeId: number;
      cues: { start: number; end: number; text: string }[];
      note: string;
    };
    expect(Object.keys(json).sort()).toEqual(["animeId", "cues", "note", "videoId"]);
    expect(json.cues).toHaveLength(4);
    json.cues.forEach((cue, i) => {
      expect(cue.start).toBe(i * 5);
      expect(cue.end).toBe(i * 5 + 4.5);
      expect(typeof cue.text).toBe("string");
    });
    // Same input twice -> identical output (no timestamps/randomness).
    const res2 = await POST(post({ videoId: "abc12345", animeId: 21 }, "203.0.113.32"));
    expect(await res2.json()).toEqual(json);
  });

  it("never leaks secrets, stacks, or upstream payloads on success or fallback", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad gateway", { status: 502 })));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({ videoId: "abc12345", animeId: 21 }));
    const text = JSON.stringify(await res.json()).toLowerCase();
    for (const term of ["secret", "token", "password", "graphql", "stack", "at ", "apikey"]) {
      expect(text).not.toContain(term);
    }
    const logged = errSpy.mock.calls.map((c) => String(c[0])).join("\n");
    // One line, numeric id only (route contract): no videoId echo, no stack.
    expect(logged).toContain("animeId=21");
    expect(logged).not.toContain("abc12345");
    expect(logged).not.toMatch(/\n\s*at\s/);
    errSpy.mockRestore();
  });
});
