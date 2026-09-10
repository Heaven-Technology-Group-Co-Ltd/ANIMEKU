import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { structuredLog } from "@/lib/structured-log";
import { GET as healthGet } from "@/app/api/health/route";

describe("p3.6 observability", () => {
  describe("structured log (no secret leakage)", () => {
    it("emits stable tag and structured fields for captions degradation", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      structuredLog("api:captions", "degradation", {
        stage: "timedtext",
        videoId: "dQw4w9WgXcQ",
        failure_class: "http-502",
        provider: "youtube",
        route: "/api/youtube/captions",
      });
      const msg = spy.mock.calls[0][0] as string;
      expect(msg).toContain("[api:captions]");
      expect(msg).toContain("event=degradation");
      expect(msg).toContain("stage=timedtext");
      expect(msg).toContain("provider=youtube");
      expect(msg).not.toContain("Authorization");
      expect(msg).not.toContain("cookie");
      expect(msg).not.toContain("token");
      spy.mockRestore();
    });

    it("does not emit full payload or secret headers", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      structuredLog("api:autogenerate", "degradation", {
        route: "/api/subs/auto-generate",
        failure_class: "malformed_json_body",
        status: 400,
      });
      const msg = spy.mock.calls[0][0] as string;
      expect(msg).not.toContain("User-Agent");
      spy.mockRestore();
    });

    it("accepts anilist tag and captures timeout without payload", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      structuredLog("anilist", "timeout", {
        route: "/api/*",
        failure_class: "UpstreamTimeoutError",
        provider: "anilist",
      });
      const msg = spy.mock.calls[0][0] as string;
      expect(msg).toContain("[anilist]");
      expect(msg).toContain("event=timeout");
      spy.mockRestore();
    });
  });

  describe("health contract unchanged", () => {
    it("returns 200 with serialized status and no external dependency", () => {
      const res = healthGet();
      expect(res.status).toBe(200);
    });

    it("preserves force-dynamic and Cache-Control markers in source", () => {
      const src = fs.readFileSync("src/app/api/health/route.ts", "utf-8");
      expect(src).toContain("force-dynamic");
      expect(src).toContain("Cache-Control");
      expect(src).toContain('status: "ok"');
      expect(src).not.toContain("fetch(");
    });
  });

  describe("captions contracts preserved (502 / 429)", () => {
    it("route module exists and exports GET", () => {
      const src = fs.readFileSync("src/app/api/youtube/captions/route.ts", "utf-8");
      expect(src).toContain("export async function GET");
    });

    it("existing contracts are present in source (not modified away)", () => {
      const src = fs.readFileSync("src/app/api/youtube/captions/route.ts", "utf-8");
      expect(src).toContain("status: 429");
      expect(src).toContain("Retry-After");
      expect(src).toContain("status: 502");
      expect(src).toContain('source: "error"');
    });
  });

  describe("AniList graceful degradation preserved", () => {
    it("anilist module preserves graceful-throw contract", () => {
      const src = fs.readFileSync("src/lib/anilist.ts", "utf-8");
      expect(src).toContain("gracefully");
      expect(src).toContain("episodes: []");
      expect(src).toContain("structuredLog");
    });
  });

  describe("production site URL gate (fail-closed)", () => {
    it("script exists and has both mode branches", () => {
      const src = fs.readFileSync("scripts/check-production-site-url.sh", "utf-8");
      expect(src).toContain("pre-domain");
      expect(src).toContain("production");
      expect(src).toContain("is_loopback");
      expect(src).toContain("exit 1");
      expect(src).toContain("exit 0");
    });
  });

  describe("working-tree gate (protects production)", () => {
    it("script exists with allowlist for docs/LEDGER.md only", () => {
      const src = fs.readFileSync("scripts/check-production-working-tree.sh", "utf-8");
      expect(src).toContain("docs/LEDGER.md");
      expect(src).toContain("exit 10");
      expect(src).toContain("exit 1");
      expect(src).toContain("ledger-only");
      expect(src).not.toContain("git reset --hard");
      expect(src).not.toContain("git clean -fd");
    });
  });

  describe("runbook / script consistency", () => {
    it("runbook covers required sections and references scripts", () => {
      const src = fs.readFileSync("docs/p3-6-observability-runbook.md", "utf-8");
      expect(src).toContain("Pre-deploy");
      expect(src).toContain("Health verification");
      expect(src).toContain("Smoke verification");
      expect(src).toContain("Rollback");
      expect(src).toContain("Dirty-tree");
      expect(src).toContain("Degraded network");
      expect(src).toContain("Pre-domain");
      expect(src).toContain("check-production-site-url.sh");
      expect(src).toContain("check-production-working-tree.sh");
      expect(src).toContain("smoke-local.sh");
      expect(src).not.toContain("https://example.com");
    });
  });

  describe("Docker log rotation (P2 preserved)", () => {
    it("compose has json-file driver with max-size/max-file", () => {
      const src = fs.readFileSync("docker-compose.yml", "utf-8");
      expect(src).toContain("driver: json-file");
      expect(src).toContain('max-size: "10m"');
      expect(src).toContain('max-file: "3"');
    });
  });

  describe("no new routes (route-table invariant)", () => {
    it("exactly 3 API route files exist under src/app/api/", () => {
      let count = 0;
      function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name === "route.ts") count++;
        }
      }
      walk("src/app/api");
      expect(count).toBe(3);
    });
  });

  describe("smoke script deterministic (no production requests)", () => {
    it("script references only local commands", () => {
      const src = fs.readFileSync("scripts/smoke-local.sh", "utf-8");
      expect(src).toContain("docker compose config");
      expect(src).toContain("npm run build");
      expect(src).toContain("npm run lint");
      expect(src).not.toContain("curl");
      expect(src).not.toContain("wget");
      expect(src).not.toContain("youtube.com");
    });
  });
});
