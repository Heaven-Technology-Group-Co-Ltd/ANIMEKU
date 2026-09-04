import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/youtube/captions/route";
import { checkRateLimit, resetRateLimitStore, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { resetCaptionsCache } from "@/lib/captions-cache";
import { UpstreamTimeoutError } from "@/lib/fetch-timeout";

const VID = "dQw4w9WgXcQ";

function req(v: string | null, ip = "203.0.113.7"): NextRequest {
  const url =
    v === null
      ? "http://localhost/api/youtube/captions"
      : `http://localhost/api/youtube/captions?v=${v}`;
  return new NextRequest(url, { headers: { "x-forwarded-for": ip } });
}

function timedTextXmlEmpty(): string {
  return `<?xml version="1.0"?><transcript_list></transcript_list>`;
}

function timedTextXmlTracks(): string {
  return (
    `<?xml version="1.0"?><transcript_list>` +
    `<track id="0" name="" lang_code="en" kind="asr" />` +
    `<track id="1" name="ไทย" lang_code="th" />` +
    `</transcript_list>`
  );
}

function watchHtmlWithTracks(): string {
  const tracks = JSON.stringify([
    { languageCode: "en", name: { simpleText: "English" }, kind: "asr", baseUrl: "https://x/y" },
    { languageCode: "th", name: { simpleText: "Thai" }, baseUrl: "https://x/z" },
  ]);
  return `<html><body>{"captionTracks":${tracks},"other":1}</body></html>`;
}

beforeEach(() => {
  resetRateLimitStore();
  resetCaptionsCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/youtube/captions", () => {
  it("400s invalid, missing, and oversized videoIds with a stable error shape", async () => {
    for (const v of ["ab", "x".repeat(21), "bad id!", "a".repeat(1000)]) {
      const res = await GET(req(v));
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: { code: string; message: string } };
      expect(json.error.code).toBe("invalid_video_id");
      expect(typeof json.error.message).toBe("string");
    }
    const missing = await GET(req(null));
    expect(missing.status).toBe(400);
  });

  it("ignores unexpected extra query params (no overvalidation)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(timedTextXmlTracks(), { status: 200 })),
    );
    const r = new NextRequest(`http://localhost/api/youtube/captions?v=${VID}&foo=bar&x=1`, {
      headers: { "x-forwarded-for": "203.0.113.7" },
    });
    const res = await GET(r);
    expect(res.status).toBe(200);
  });

  it("returns timedtext tracks with source=timedtext and no baseUrl leak", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(timedTextXmlTracks(), { status: 200 })),
    );
    const res = await GET(req(VID));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      videoId: string;
      tracks: Record<string, unknown>[];
      source: string;
    };
    expect(json.videoId).toBe(VID);
    expect(json.source).toBe("timedtext");
    expect(json.tracks).toHaveLength(2);
    expect(json.tracks[0]).toEqual({ lang: "en", name: "en", kind: "asr", isAuto: true });
    expect(json.tracks[1]).toEqual({ lang: "th", name: "ไทย", kind: "", isAuto: false });
    for (const t of json.tracks) {
      expect(Object.keys(t).sort()).toEqual(["isAuto", "kind", "lang", "name"]);
      expect(t).not.toHaveProperty("baseUrl");
    }
  });

  it("falls back to the watch page with source=watch and strips baseUrl", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("watch")) return new Response(watchHtmlWithTracks(), { status: 200 });
        return new Response("<html>no list here</html>", { status: 200 });
      }),
    );
    const res = await GET(req(VID));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      tracks: { lang: string; name: string; kind: string; isAuto: boolean }[];
      source: string;
    };
    expect(json.source).toBe("watch");
    expect(json.tracks).toEqual([
      { lang: "en", name: "English", kind: "asr", isAuto: true },
      { lang: "th", name: "Thai", kind: "", isAuto: false },
    ]);
  });

  it("200s source=none when upstream affirmatively reports no captions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(timedTextXmlEmpty(), { status: 200 })),
    );
    const res = await GET(req(VID));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { tracks: unknown[]; source: string };
    expect(json).toEqual({ videoId: VID, tracks: [], source: "none" });
  });

  it("200s source=none when the watch page has no captionTracks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("watch"))
          return new Response("<html><body>no captions here</body></html>", { status: 200 });
        return new Response("<html>no list here</html>", { status: 200 });
      }),
    );
    const res = await GET(req(VID));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { source: string }).source).toBe("none");
  });

  it("502s source=error with tracks:[] when all providers fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("oops", { status: 500 })),
    );
    const res = await GET(req(VID));
    expect(res.status).toBe(502);
    const json = (await res.json()) as {
      videoId: string;
      tracks: unknown[];
      source: string;
      error: { code: string };
    };
    expect(json.videoId).toBe(VID);
    expect(json.tracks).toEqual([]);
    expect(json.source).toBe("error");
    expect(json.error.code).toBe("upstream_error");
  });

  it("502s source=error when every fetch throws (network down)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    const res = await GET(req(VID));
    expect(res.status).toBe(502);
    expect(((await res.json()) as { source: string }).source).toBe("error");
  });

  it("502s source=error when fetches time out (never leaks stack/HTML)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new UpstreamTimeoutError(10, "www.youtube.com");
      }),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(req(VID));
    expect(res.status).toBe(502);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("captionTracks");
    expect(text).not.toContain("UpstreamTimeoutError");
    expect(text).not.toContain("at ");
    const logged = errSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).not.toContain("<html");
    errSpy.mockRestore();
  });

  it("treats malformed watch-page caption JSON as failure (502), not empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("watch"))
          return new Response('<html>{"captionTracks":[broken json], "x":1}</html>', {
            status: 200,
          });
        return new Response("<html>no list here</html>", { status: 200 });
      }),
    );
    const res = await GET(req(VID));
    expect(res.status).toBe(502);
    expect(((await res.json()) as { source: string }).source).toBe("error");
  });

  it("429s with Retry-After once the per-IP budget is exceeded", async () => {
    const ip = "198.51.100.9";
    for (let i = 0; i < RATE_LIMIT_PRESETS.captionsPerIp.limit; i++) {
      checkRateLimit(
        `captions:ip:${ip}`,
        RATE_LIMIT_PRESETS.captionsPerIp.limit,
        RATE_LIMIT_PRESETS.captionsPerIp.windowMs,
      );
    }
    const res = await GET(req(VID, ip));
    expect(res.status).toBe(429);
    const retryAfter = res.headers.get("retry-after");
    expect(retryAfter).toMatch(/^\d+$/);
    expect(Number(retryAfter)).toBeGreaterThan(0);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("rate_limited");
  });

  it("allows requests under the limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(timedTextXmlEmpty(), { status: 200 })),
    );
    const res = await GET(req(VID, "192.0.2.55"));
    expect(res.status).toBe(200);
  });
});
