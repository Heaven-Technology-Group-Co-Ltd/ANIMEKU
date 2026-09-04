import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getSiteUrl,
  getHlsBaseUrl,
  isPublicOriginProductionReady,
  isProductionPublicConfigValid,
  assertProductionPublicConfig,
} from "@/lib/env";

/**
 * P2.4 production-env branches (TASK 7 gaps not in env.test.ts).
 * process.env saved/restored per test; console spies restored; no .env read.
 */
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getSiteUrl production branches", () => {
  it("production + garbage URL falls back loudly (no silent misconfig)", () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_SITE_URL = "not-a-url";
    expect(getSiteUrl()).toBe("http://localhost:1234");
    expect(err).toHaveBeenCalled();
  });

  it("production + unsupported protocol falls back loudly", () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_SITE_URL = "ftp://files.example.com/site";
    expect(getSiteUrl()).toBe("http://localhost:1234");
    expect(err).toHaveBeenCalled();
  });

  it("production + any loopback hostname is flagged (127/0/::1, not just localhost)", () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const loopback of [
      "http://127.0.0.1:1234",
      "http://0.0.0.0:1234",
      "http://[::1]:1234",
    ]) {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      process.env.NEXT_PUBLIC_SITE_URL = loopback;
      expect(getSiteUrl()).toBe(loopback);
      expect(err).toHaveBeenCalled();
      err.mockRestore();
    }
  });

  it("non-production invalid values stay quiet (dev convenience, not prod failure)", () => {
    vi.stubEnv("NODE_ENV", "development");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_SITE_URL = "not-a-url";
    expect(getSiteUrl()).toBe("http://localhost:1234");
    expect(err).not.toHaveBeenCalled();
  });
});

describe("isPublicOriginProductionReady edge cases", () => {
  it("rejects every loopback form and non-http(s) scheme", () => {
    for (const bad of [
      "http://0.0.0.0:1234",
      "http://[::1]:1234",
      "http://[::1]/",
      "ftp://example.com",
      "file:///etc/passwd",
      "  ",
      "",
      "http://localhost:1234",
      "http://127.0.0.1:1234",
      // PR #10: full 127/8 range + localhost/local dev hostnames
      "http://127.0.0.2:1234",
      "http://127.1.2.3:1234",
      "http://app.localhost:1234",
      "http://mybox.local:1234",
    ]) {
      expect(isPublicOriginProductionReady(bad)).toBe(false);
    }
    expect(isPublicOriginProductionReady(undefined)).toBe(false);
  });

  it("accepts http production origins too (not https-only)", () => {
    expect(isPublicOriginProductionReady("http://animeku.example.com")).toBe(true);
    expect(isPublicOriginProductionReady("https://animeku.example.com")).toBe(true);
  });
});

describe("isProductionPublicConfigValid with invalid prod values", () => {
  it("false for garbage/invalid prod URLs (not just missing/loopback)", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_SITE_URL = "not-a-url";
    expect(isProductionPublicConfigValid()).toBe(false);
    process.env.NEXT_PUBLIC_SITE_URL = "ftp://example.com";
    expect(isProductionPublicConfigValid()).toBe(false);
  });

  it("false for empty/whitespace/loopback-local prod values", () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const bad of [
      "",
      "   ",
      "http://localhost:1234",
      "http://127.0.0.1:1234",
      "http://127.0.0.2:1234",
      "http://0.0.0.0:1234",
      "http://[::1]:1234",
      "http://app.localhost:1234",
      "http://mybox.local:1234",
    ]) {
      process.env.NEXT_PUBLIC_SITE_URL = bad;
      expect(isProductionPublicConfigValid()).toBe(false);
    }
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(isProductionPublicConfigValid()).toBe(false);
  });
});

describe("assertProductionPublicConfig fail-loud (PR #10)", () => {
  it("throws on missing/empty/whitespace", () => {
    expect(() => assertProductionPublicConfig(undefined)).toThrow();
    expect(() => assertProductionPublicConfig("")).toThrow();
    expect(() => assertProductionPublicConfig("   ")).toThrow();
  });

  it("throws on invalid URL and unsupported protocol", () => {
    expect(() => assertProductionPublicConfig("not-a-url")).toThrow();
    expect(() => assertProductionPublicConfig("ftp://example.com")).toThrow();
    expect(() => assertProductionPublicConfig("file:///etc/passwd")).toThrow();
  });

  it("throws on every loopback/local dev hostname", () => {
    for (const bad of [
      "http://localhost:1234",
      "http://localhost/",
      "http://127.0.0.1:1234",
      "http://127.0.0.2:1234",
      "http://127.1.2.3:1234",
      "http://0.0.0.0:1234",
      "http://[::1]:1234",
      "http://[::1]/",
      "http://app.localhost:1234",
      "http://mybox.local:1234",
    ]) {
      expect(() => assertProductionPublicConfig(bad)).toThrow();
    }
  });

  it("returns canonical origin on valid http(s) production URLs", () => {
    expect(assertProductionPublicConfig("https://animeku.example.com")).toBe(
      "https://animeku.example.com"
    );
    expect(assertProductionPublicConfig("http://animeku.example.com")).toBe(
      "http://animeku.example.com"
    );
    expect(assertProductionPublicConfig("https://animeku.example.com/")).toBe(
      "https://animeku.example.com"
    );
  });

  it("reads NEXT_PUBLIC_SITE_URL from env when no arg given", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://animeku.example.com");
    expect(assertProductionPublicConfig()).toBe("https://animeku.example.com");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:1234");
    expect(() => assertProductionPublicConfig()).toThrow();
  });
});

describe("getHlsBaseUrl observability", () => {
  it("warns loudly on invalid values (no silent ignore)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_HLS_BASE_URL = "not-valid";
    expect(getHlsBaseUrl()).toBe("");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("NEXT_PUBLIC_HLS_BASE_URL");
    warn.mockClear();
    process.env.NEXT_PUBLIC_HLS_BASE_URL = "ftp://example.com/hls";
    expect(getHlsBaseUrl()).toBe("");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("trims whitespace and keeps origin+pathname", () => {
    process.env.NEXT_PUBLIC_HLS_BASE_URL = "  https://bucket.r2.dev/hls/  ";
    expect(getHlsBaseUrl()).toBe("https://bucket.r2.dev/hls");
  });
});
