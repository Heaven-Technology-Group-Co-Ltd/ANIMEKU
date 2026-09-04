import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getSiteUrl,
  getHlsBaseUrl,
  isPublicOriginProductionReady,
  isProductionPublicConfigValid,
} from "@/lib/env";

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

describe("getSiteUrl", () => {
  it("returns fallback when NEXT_PUBLIC_SITE_URL missing", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    // NODE_ENV not production => no error log, just fallback
    expect(getSiteUrl()).toBe("http://localhost:1234");
  });

  it("returns origin for valid absolute URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://animeku.example.com";
    expect(getSiteUrl()).toBe("https://animeku.example.com");

    process.env.NEXT_PUBLIC_SITE_URL = "https://animeku.example.com/";
    expect(getSiteUrl()).toBe("https://animeku.example.com");

    process.env.NEXT_PUBLIC_SITE_URL = "https://animeku.example.com/some/path?x=1#hash";
    expect(getSiteUrl()).toBe("https://animeku.example.com");
  });

  it("fallbacks for invalid URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "not-a-url";
    expect(getSiteUrl()).toBe("http://localhost:1234");

    process.env.NEXT_PUBLIC_SITE_URL = "ftp://example.com";
    expect(getSiteUrl()).toBe("http://localhost:1234");
  });

  it("trims whitespace", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "  https://animeku.example.com  ";
    expect(getSiteUrl()).toBe("https://animeku.example.com");
  });

  // P2.1: production branches — prod values must resolve with no localhost.
  it("production: real prod origin resolves verbatim (no localhost)", () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_SITE_URL = "https://animeku.example.com";
    expect(getSiteUrl()).toBe("https://animeku.example.com");
    expect(err).not.toHaveBeenCalled();
  });

  it("production: missing value still falls back but logs loudly (no silent fallback)", () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe("http://localhost:1234");
    expect(err).toHaveBeenCalled();
  });

  it("production: localhost-baked value is flagged loudly", () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:1234";
    expect(getSiteUrl()).toBe("http://localhost:1234");
    expect(err).toHaveBeenCalled();
  });

  it("dev localhost fallback stays valid and quiet", () => {
    vi.stubEnv("NODE_ENV", "development");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe("http://localhost:1234");
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:1234";
    expect(getSiteUrl()).toBe("http://localhost:1234");
    expect(err).not.toHaveBeenCalled();
  });
});

describe("isPublicOriginProductionReady", () => {
  it("accepts absolute non-loopback origins", () => {
    expect(isPublicOriginProductionReady("https://animeku.example.com")).toBe(true);
    expect(isPublicOriginProductionReady("https://animeku.example.com/")).toBe(true);
  });

  it("rejects missing/invalid/loopback values", () => {
    expect(isPublicOriginProductionReady(undefined)).toBe(false);
    expect(isPublicOriginProductionReady("")).toBe(false);
    expect(isPublicOriginProductionReady("not-a-url")).toBe(false);
    expect(isPublicOriginProductionReady("ftp://example.com")).toBe(false);
    expect(isPublicOriginProductionReady("http://localhost:1234")).toBe(false);
    expect(isPublicOriginProductionReady("http://127.0.0.1:1234")).toBe(false);
  });
});

describe("isProductionPublicConfigValid", () => {
  it("true only for production + real origin (supplied prod values, no localhost)", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_SITE_URL = "https://animeku.example.com";
    expect(isProductionPublicConfigValid()).toBe(true);
  });

  it("false for localhost-baked or missing prod config", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:1234";
    expect(isProductionPublicConfigValid()).toBe(false);
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(isProductionPublicConfigValid()).toBe(false);
  });

  it("false outside production (dev localhost fallback is intended, not a failure)", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.NEXT_PUBLIC_SITE_URL = "https://animeku.example.com";
    expect(isProductionPublicConfigValid()).toBe(false);
  });
});

describe("getHlsBaseUrl", () => {
  it("returns empty string when missing", () => {
    delete process.env.NEXT_PUBLIC_HLS_BASE_URL;
    expect(getHlsBaseUrl()).toBe("");
    process.env.NEXT_PUBLIC_HLS_BASE_URL = "";
    expect(getHlsBaseUrl()).toBe("");
  });

  it("returns normalized origin+pathname without trailing slash", () => {
    process.env.NEXT_PUBLIC_HLS_BASE_URL = "https://bucket.r2.dev/hls";
    expect(getHlsBaseUrl()).toBe("https://bucket.r2.dev/hls");

    process.env.NEXT_PUBLIC_HLS_BASE_URL = "https://bucket.r2.dev/hls/";
    expect(getHlsBaseUrl()).toBe("https://bucket.r2.dev/hls");

    process.env.NEXT_PUBLIC_HLS_BASE_URL = "https://bucket.r2.dev";
    expect(getHlsBaseUrl()).toBe("https://bucket.r2.dev");
  });

  it("returns empty for invalid URL", () => {
    process.env.NEXT_PUBLIC_HLS_BASE_URL = "not-valid";
    expect(getHlsBaseUrl()).toBe("");

    process.env.NEXT_PUBLIC_HLS_BASE_URL = "ftp://example.com/hls";
    expect(getHlsBaseUrl()).toBe("");
  });
});
