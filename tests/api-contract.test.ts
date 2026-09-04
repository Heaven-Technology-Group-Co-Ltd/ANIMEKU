import { describe, it, expect, vi, afterEach } from "vitest";
import {
  normalizeVideoId,
  parseAnimeId,
  errorBody,
  VIDEO_ID_RE,
} from "@/lib/api-contract";

/**
 * P2.4 unit contract for src/lib/api-contract.ts.
 * Pure helpers shared by /api/youtube/captions + /api/subs/auto-generate.
 * Deterministic, no network, no env, no timers.
 */
describe("VIDEO_ID_RE", () => {
  it("accepts 6-20 YouTube-id chars, rejects the rest", () => {
    expect(VIDEO_ID_RE.test("dQw4w9WgXcQ")).toBe(true);
    expect(VIDEO_ID_RE.test("abc123")).toBe(true); // 6 = min
    expect(VIDEO_ID_RE.test("x".repeat(20))).toBe(true); // 20 = max
    expect(VIDEO_ID_RE.test("ab")).toBe(false);
    expect(VIDEO_ID_RE.test("x".repeat(21))).toBe(false);
    expect(VIDEO_ID_RE.test("has space!")).toBe(false);
    expect(VIDEO_ID_RE.test("")).toBe(false);
    expect(VIDEO_ID_RE.test("v=id?x")).toBe(false);
  });
});

describe("normalizeVideoId", () => {
  it("returns trimmed ids that match the contract", () => {
    expect(normalizeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(normalizeVideoId("  abc12345  ")).toBe("abc12345");
  });

  it("rejects wrong types without throwing", () => {
    for (const bad of [undefined, null, 12345, true, {}, [], 21.5]) {
      expect(normalizeVideoId(bad)).toBeNull();
    }
  });

  it("rejects out-of-range / malformed strings", () => {
    for (const bad of ["", "   ", "ab", "x".repeat(21), "bad id!", "a/b=c", "日本語テスト"]) {
      expect(normalizeVideoId(bad)).toBeNull();
    }
  });
});

describe("parseAnimeId", () => {
  it("maps absent/empty to null (no upstream call needed)", () => {
    expect(parseAnimeId(undefined)).toEqual({ ok: true, value: null });
    expect(parseAnimeId(null)).toEqual({ ok: true, value: null });
    expect(parseAnimeId("")).toEqual({ ok: true, value: null });
    expect(parseAnimeId("   ")).toEqual({ ok: true, value: null });
  });

  it("accepts finite positive numbers and numeric strings", () => {
    expect(parseAnimeId(21)).toEqual({ ok: true, value: 21 });
    expect(parseAnimeId("21")).toEqual({ ok: true, value: 21 });
    expect(parseAnimeId("  21  ")).toEqual({ ok: true, value: 21 });
  });

  it("floors floats to the AniList Int contract", () => {
    expect(parseAnimeId(21.9)).toEqual({ ok: true, value: 21 });
    expect(parseAnimeId("21.9")).toEqual({ ok: true, value: 21 });
  });

  it("rejects zero/negative/NaN/non-finite/unsafe/wrong-type", () => {
    for (const bad of [
      0,
      -3,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "abc",
      "Infinity",
      "NaN",
      "12abc",
      3.5e30, // floor exceeds safe integer
      Number.MAX_SAFE_INTEGER + 1,
      true,
      false,
      {},
      [],
      ["21"],
    ]) {
      expect(parseAnimeId(bad)).toEqual({ ok: false });
    }
  });
});

describe("errorBody", () => {
  it("builds the stable { error: { code, message } } envelope", () => {
    expect(errorBody("rate_limited", "too many requests")).toEqual({
      error: { code: "rate_limited", message: "too many requests" },
    });
    expect(errorBody("invalid_video_id", "missing or invalid v")).toEqual({
      error: { code: "invalid_video_id", message: "missing or invalid v" },
    });
  });

  it("exposes no extra keys (contract surface is exactly error.code/message)", () => {
    const body = errorBody("upstream_error", "caption providers unavailable");
    expect(Object.keys(body)).toEqual(["error"]);
    expect(Object.keys(body.error).sort()).toEqual(["code", "message"]);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
