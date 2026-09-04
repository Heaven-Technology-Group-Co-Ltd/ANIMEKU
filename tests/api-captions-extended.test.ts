import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as captionsGET } from "@/app/api/youtube/captions/route";
import { GET as healthGET } from "@/app/api/health/route";
import {
  checkRateLimit,
  resetRateLimitStore,
  RATE_LIMIT_PRESETS,
} from "@/lib/rate-limit";
import { resetCaptionsCache } from "@/lib/captions-cache";
import { UpstreamTimeoutError } from "@/lib/fetch-timeout";

/**
 * P2.4 extended captions coverage (TASK 4 gaps not in api-captions.test.ts).
 * All fetch mocked; rate-limit store reset per test; no network; no sleeps.
 */
const VID = "dQw4w9WgXcQ";

function req(v: string, ip = "203.0.113.21"): NextRequest {
  return new NextRequest(`http://localhost/api/youtube/captions?v=${v}`, {
    headers: { "x-forwarded-for": ip },
  });
}

function tracksXml(): string {
  return (
    `<?xml version="1.0"?><transcript_list>` +
    `<track id="0" name="" lang_code="en" kind="asr" />` +
    `</transcript_list>`
  );
}

function watchHtml(tracks: unknown): string {
  return `<html><body>{"captionTracks":${JSON.stringify(tracks)},"x":1}</body></html>`;
}

beforeEach(() => {
  resetRateLimitStore();
  resetCaptionsCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("captions timedtext provider variants", () => {
  it("tries the second timedtext host when the first fails", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.includes("www.youtube.com/api/timedtext")) {
          return new Response("oops", { status: 500 });
        }
        return new Response(tracksXml(), { status: 200 });
      }),
    );
    const res = await captionsGET(req(VID));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { source: string }).source).toBe("timedtext");
    expect(calls.some((u) => u.includes("video.google.com"))).toBe(true);
  });

  it("treats unrecognized timedtext XML as provider failure (falls through to watch)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("watch")) {
          return new Response(
            watchHtml([{ languageCode: "en", name: { simpleText: "English" } }]),
            { status: 200 },
          );
        }
        return new Response("<html>garbage, no transcript list</html>", { status: 200 });
      }),
    );
    const res = await captionsGET(req(VID));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { source: string }).source).toBe("watch");
  });

  it("treats short/empty timedtext bodies as provider failure, not tracks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("watch")) return new Response("down", { status: 500 });
        return new Response("", { status: 200 });
      }),
    );
    const res = await captionsGET(req(VID));
    expect(res.status).toBe(502);
    expect(((await res.json()) as { source: string }).source).toBe("error");
  });
});

describe("captions watch-page variants", () => {
  it("filters watch tracks missing languageCode instead of failing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("watch")) {
          return new Response(
            watchHtml([
              { name: { simpleText: "NoLang" } },
              { languageCode: "", name: { simpleText: "Empty" } },
              { languageCode: "th", name: { simpleText: "Thai" } },
            ]),
            { status: 200 },
          );
        }
        return new Response("<html>no list</html>", { status: 200 });
      }),
    );
    const res = await captionsGET(req(VID));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { tracks: { lang: string }[]; source: string };
    expect(json.source).toBe("watch");
    expect(json.tracks).toEqual([{ lang: "th", name: "Thai", kind: "", isAuto: false }]);
  });

  it("treats valid-JSON-but-wrong-shape captionTracks as empty (200 none), not failure", async () => {
    // Changed-markup note: the route regex only matches `"captionTracks":[`;
    // syntactically-broken JSON inside brackets -> 502 (covered in
    // api-captions.test.ts). A well-formed array of non-track items parses
    // fine but yields zero tracks -> upstream said "nothing usable" -> none.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("watch")) {
          return new Response(`<html>{"captionTracks":[1,2,"x"],"y":1}</html>`, {
            status: 200,
          });
        }
        return new Response("<html>no list</html>", { status: 200 });
      }),
    );
    const res = await captionsGET(req(VID));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { source: string }).source).toBe("none");
  });

  it("refuses oversized watch pages (content-length pre-check)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("watch")) {
          return new Response("<html>big</html>", {
            status: 200,
            headers: { "content-length": "99999999" },
          });
        }
        return new Response("<html>no list</html>", { status: 200 });
      }),
    );
    const res = await captionsGET(req(VID));
    // Oversized watch page is skipped as a provider failure -> all fail -> 502.
    expect(res.status).toBe(502);
  });

  it("watch non-2xx + timedtext miss -> 502 with stable error contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("watch")) return new Response("nope", { status: 404 });
        return new Response("<html>no list</html>", { status: 200 });
      }),
    );
    const res = await captionsGET(req(VID));
    expect(res.status).toBe(502);
    const json = (await res.json()) as {
      videoId: string;
      tracks: unknown[];
      source: string;
      error: { code: string; message: string };
    };
    expect(json.videoId).toBe(VID);
    expect(json.tracks).toEqual([]);
    expect(json.error.code).toBe("upstream_error");
    expect(typeof json.error.message).toBe("string");
    // No upstream markup or internal detail leaks.
    const text = JSON.stringify(json);
    expect(text).not.toContain("captionTracks");
    expect(text).not.toContain("baseUrl");
  });
});

describe("captions AbortError handling", () => {
  it("converts a raw AbortError into 502 source=error without leaking", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new Error("This operation was aborted"), { name: "AbortError" });
      }),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await captionsGET(req(VID));
    expect(res.status).toBe(502);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("AbortError");
    expect(text).not.toContain("aborted");
    errSpy.mockRestore();
  });

  it("converts UpstreamTimeoutError from every provider into 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new UpstreamTimeoutError(10, "www.youtube.com");
      }),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await captionsGET(req(VID));
    expect(res.status).toBe(502);
    expect(((await res.json()) as { source: string }).source).toBe("error");
    errSpy.mockRestore();
  });
});

describe("captions rate-limit contract", () => {
  it("429s with Retry-After once the GLOBAL budget is exceeded", async () => {
    for (let i = 0; i < RATE_LIMIT_PRESETS.captionsGlobal.limit; i++) {
      checkRateLimit(
        "captions:global",
        RATE_LIMIT_PRESETS.captionsGlobal.limit,
        RATE_LIMIT_PRESETS.captionsGlobal.windowMs,
      );
    }
    const res = await captionsGET(req(VID, "192.0.2.99"));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "rate_limited",
    );
  });

  it("never rate-limits /api/health even when captions buckets are exhausted", async () => {
    for (let i = 0; i < RATE_LIMIT_PRESETS.captionsGlobal.limit; i++) {
      checkRateLimit(
        "captions:global",
        RATE_LIMIT_PRESETS.captionsGlobal.limit,
        RATE_LIMIT_PRESETS.captionsGlobal.windowMs,
      );
    }
    for (let i = 0; i < RATE_LIMIT_PRESETS.captionsPerIp.limit; i++) {
      checkRateLimit(
        "captions:ip:203.0.113.21",
        RATE_LIMIT_PRESETS.captionsPerIp.limit,
        RATE_LIMIT_PRESETS.captionsPerIp.windowMs,
      );
    }
    const res = await healthGET();
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe("ok");
  });
});
