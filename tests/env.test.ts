import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getSiteUrl, getHlsBaseUrl } from "@/lib/env";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
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
