import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as healthGET } from "@/app/api/health/route";
import { GET as captionsGET } from "@/app/api/youtube/captions/route";
import { POST as autogenPOST } from "@/app/api/subs/auto-generate/route";
import {
  checkRateLimit,
  resetRateLimitStore,
  RATE_LIMIT_PRESETS,
} from "@/lib/rate-limit";
import { resetCaptionsCache } from "@/lib/captions-cache";
import { resolveAnime } from "@/lib/resolve-anime";
import { UpstreamTimeoutError } from "@/lib/fetch-timeout";

/**
 * P2.4 regression coverage for P2.1 / P2.2 / P2.3 (TASK 11).
 * Asserts behavior the earlier suites do not: health version/commit env
 * branches (P2.1), global-bucket 429 + validation-before-ratelimit ordering
 * (P2.2), resolver timeout/default-tag paths (P2.3). No duplication of
 * existing cases; all network mocked; env + rate-limit state restored.
 */
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  resetRateLimitStore();
  resetCaptionsCache();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("P2.1 regression: health version/commit branches", () => {
  it("exposes commit separately when APP_VERSION differs from the sha", async () => {
    vi.stubEnv("APP_VERSION", "1.2.3");
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    vi.stubEnv("GIT_COMMIT_SHA", "abcdef1234567890");
    delete process.env.GITHUB_SHA;
    const json = (await (await healthGET()).json()) as Record<string, string>;
    expect(json.version).toBe("1.2.3");
    expect(json.commit).toBe("abcdef1");
  });

  it("omits commit when it duplicates version (sha-sourced version dedup rule)", async () => {
    vi.stubEnv("APP_VERSION", "");
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    vi.stubEnv("GIT_COMMIT_SHA", "abcdef1234567890");
    delete process.env.GITHUB_SHA;
    const json = (await (await healthGET()).json()) as Record<string, string>;
    // version and commit both derive from the same sliced sha -> single key.
    expect(json.version).toBe("abcdef1");
    expect(json).not.toHaveProperty("commit");
  });

  it("defaults to 0.1.0 with no version keys set", async () => {
    vi.stubEnv("APP_VERSION", "");
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    delete process.env.GIT_COMMIT_SHA;
    delete process.env.GITHUB_SHA;
    const json = (await (await healthGET()).json()) as Record<string, string>;
    expect(json.version).toBe("0.1.0");
    expect(json).not.toHaveProperty("commit");
  });
});

describe("P2.2 regression: rate-limit ordering + global buckets", () => {
  it("captions validates BEFORE rate-limiting (bad input -> 400, never 429)", async () => {
    for (let i = 0; i < RATE_LIMIT_PRESETS.captionsGlobal.limit; i++) {
      checkRateLimit(
        "captions:global",
        RATE_LIMIT_PRESETS.captionsGlobal.limit,
        RATE_LIMIT_PRESETS.captionsGlobal.windowMs,
      );
    }
    const bad = new NextRequest("http://localhost/api/youtube/captions?v=ab", {
      headers: { "x-forwarded-for": "203.0.113.50" },
    });
    const res = await captionsGET(bad);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "invalid_video_id",
    );
  });

  it("auto-generate 429s on the GLOBAL bucket with Retry-After", async () => {
    for (let i = 0; i < RATE_LIMIT_PRESETS.autoGenerateGlobal.limit; i++) {
      checkRateLimit(
        "autogen:global",
        RATE_LIMIT_PRESETS.autoGenerateGlobal.limit,
        RATE_LIMIT_PRESETS.autoGenerateGlobal.windowMs,
      );
    }
    const r = new NextRequest("http://localhost/api/subs/auto-generate", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.60" },
      body: JSON.stringify({ videoId: "abc12345" }),
    });
    const res = await autogenPOST(r);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "rate_limited",
    );
  });

  it("both mutating-adjacent routes share the stable error envelope", async () => {
    const badCap = await captionsGET(
      new NextRequest("http://localhost/api/youtube/captions", {
        headers: { "x-forwarded-for": "203.0.113.51" },
      }),
    );
    const badGen = await autogenPOST(
      new NextRequest("http://localhost/api/subs/auto-generate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.52" },
        body: JSON.stringify({}),
      }),
    );
    for (const res of [badCap, badGen]) {
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: { code: string; message: string } };
      expect(typeof json.error.code).toBe("string");
      expect(typeof json.error.message).toBe("string");
      expect(Object.keys(json)).toEqual(["error"]);
    }
  });
});

describe("P2.3 regression: resolver timeout + default tag", () => {
  it("returns null on UpstreamTimeoutError (timeout is a failure, not empty)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new UpstreamTimeoutError(9000, "graphql.anilist.co");
      }),
    );
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await resolveAnime("777777-unknown")).toBeNull();
    expect(err).toHaveBeenCalled();
  });

  it("uses the default log tag when none is supplied", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await resolveAnime("777778-unknown");
    const logged = err.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("[resolveAnime]");
  });

  it("returns null when AniList resolves to null Media (no record, no throw)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: { Media: null } }), { status: 200 })),
    );
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await resolveAnime("777779-unknown", "[anime]")).toBeNull();
    expect(err).not.toHaveBeenCalled();
  });
});
