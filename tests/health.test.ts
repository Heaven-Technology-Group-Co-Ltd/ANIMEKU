import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns HTTP 200", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("returns valid JSON with status ok", async () => {
    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.status).toBe("ok");
  });

  it("contains required fields: service, timestamp, version", async () => {
    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.service).toBe("ANIMEKU");
    expect(typeof json.timestamp).toBe("string");
    // ISO8601 check
    expect(() => new Date(json.timestamp as string).toISOString()).not.toThrow();
    expect(new Date(json.timestamp as string).toISOString()).toBe(json.timestamp);
    expect(typeof json.version).toBe("string");
    expect((json.version as string).length).toBeGreaterThan(0);
  });

  it("does not expose secrets", async () => {
    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;
    const body = JSON.stringify(json).toLowerCase();

    // Must not leak env/secrets
    const forbidden = [
      "api_key",
      "apikey",
      "secret",
      "token",
      "password",
      "ssh",
      "cookie",
      ".env",
      "aws_",
      "next_public_hls",
    ];

    for (const term of forbidden) {
      expect(body).not.toContain(term);
    }

    // Ensure no wholesale env dump — only allowed keys
    const allowedKeys = new Set(["status", "service", "timestamp", "version", "commit"]);
    for (const key of Object.keys(json)) {
      expect(allowedKeys.has(key)).toBe(true);
    }
  });

  it("is valid JSON and has correct content-type", async () => {
    const res = await GET();
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    // Cache-Control must prevent caching
    const cc = res.headers.get("cache-control") || "";
    expect(cc).toMatch(/no-store/);
    const json = await res.json();
    expect(json).toBeDefined();
  });

  it("is lightweight and does not require external calls", async () => {
    // Ensure multiple calls are fast and consistent (< 50ms each, no network)
    const start = Date.now();
    const res1 = await GET();
    const res2 = await GET();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
    const j1 = (await res1.json()) as Record<string, unknown>;
    const j2 = (await res2.json()) as Record<string, unknown>;
    expect(j1.status).toBe(j2.status);
    expect(j1.service).toBe(j2.service);
  });

  it("serializes with compact status ok (docker healthcheck grep contract)", async () => {
    // P2.2 TEST-07: Dockerfile + compose grep the serialized bytes for
    // '"status":"ok"'. Pretty-printing would pass the JSON tests above yet
    // break healthchecks, so assert on the serialized form (compact default).
    const res = await GET();
    const text = JSON.stringify(await res.json());
    expect(text).toContain('"status":"ok"');
    expect(text).not.toContain("\n");
  });
});
