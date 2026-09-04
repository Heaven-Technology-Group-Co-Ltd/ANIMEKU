import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  clientIdFromHeaders,
  resetRateLimitStore,
  rateLimitStoreSize,
} from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimitStore();
});

describe("checkRateLimit", () => {
  it("allows up to the limit, then denies with Retry-After", () => {
    const now = 1_000_000;
    expect(checkRateLimit("k", 2, 60_000, now).allowed).toBe(true);
    expect(checkRateLimit("k", 2, 60_000, now).allowed).toBe(true);
    const denied = checkRateLimit("k", 2, 60_000, now);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBe(60);
    expect(denied.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    expect(checkRateLimit("k", 1, 1_000, 0).allowed).toBe(true);
    expect(checkRateLimit("k", 1, 1_000, 500).allowed).toBe(false);
    const after = checkRateLimit("k", 1, 1_000, 1_000);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(0);
  });

  it("tracks keys independently", () => {
    expect(checkRateLimit("a", 1, 60_000, 0).allowed).toBe(true);
    expect(checkRateLimit("a", 1, 60_000, 0).allowed).toBe(false);
    expect(checkRateLimit("b", 1, 60_000, 0).allowed).toBe(true);
  });

  it("bounds memory: evicts oldest when over capacity", () => {
    for (let i = 0; i < 2000; i++) {
      checkRateLimit(`key-${i}`, 1, 60_000, 0);
    }
    expect(rateLimitStoreSize()).toBe(2000);
    checkRateLimit("one-more", 1, 60_000, 0);
    expect(rateLimitStoreSize()).toBe(2000);
    // Oldest was evicted, so it is treated as fresh again.
    expect(checkRateLimit("key-0", 1, 60_000, 0).allowed).toBe(true);
  });

  it("purges expired buckets before evicting live ones", () => {
    checkRateLimit("live", 1, 60_000, 50_000);
    for (let i = 0; i < 1999; i++) {
      checkRateLimit(`old-${i}`, 1, 1_000, 0); // all expired by t=50_000
    }
    checkRateLimit("newcomer", 1, 60_000, 50_000);
    // Expired buckets were reclaimed; the live bucket survived.
    expect(checkRateLimit("live", 1, 60_000, 50_000).allowed).toBe(false);
  });
});

describe("clientIdFromHeaders", () => {
  it("uses the first valid IP in X-Forwarded-For", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" });
    expect(clientIdFromHeaders(h)).toBe("ip:203.0.113.7");
  });

  it("skips garbage tokens, falls back to the shared bucket", () => {
    expect(clientIdFromHeaders(new Headers())).toBe("ip:direct");
    expect(
      clientIdFromHeaders(new Headers({ "x-forwarded-for": "not-an-ip!!!" })),
    ).toBe("ip:direct");
    expect(
      clientIdFromHeaders(new Headers({ "x-forwarded-for": "garbage, 198.51.100.9" })),
    ).toBe("ip:198.51.100.9");
  });

  it("accepts IPv6 tokens", () => {
    const h = new Headers({ "x-forwarded-for": "2001:db8::1" });
    expect(clientIdFromHeaders(h)).toBe("ip:2001:db8::1");
  });
});
