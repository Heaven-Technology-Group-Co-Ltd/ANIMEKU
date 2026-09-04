/**
 * Pre-domain deploy gate — deterministic contract tests.
 *
 * Context: production validation must reject localhost/loopback/local URLs,
 * but ANIMEKU has no real domain yet and the VPS host has no `node` binary.
 * `scripts/check-production-site-url.sh` (POSIX sh, no node) is the gate;
 * `.github/workflows/deploy.yml` must call it instead of `node -e`.
 *
 * Design under test (see docs/pre-domain-deploy.md):
 *   PRE_DOMAIN_DEPLOY=1 (exact "1") -> permits ONLY http://localhost:1234.
 *   anything else                    -> real production, loopback/local rejected.
 * Missing/invalid values fail closed in BOTH modes (never silent localhost).
 *
 * No live VPS, no network, no git state: the gate is driven via env vars and
 * deploy.yml is asserted as static text.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GATE = join(ROOT, "scripts/check-production-site-url.sh");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

function runGate(opts: {
  siteUrl?: string;
  preDomain?: string;
}): { code: number; out: string } {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.NEXT_PUBLIC_SITE_URL;
  delete env.PRE_DOMAIN_DEPLOY;
  if (opts.siteUrl !== undefined) env.NEXT_PUBLIC_SITE_URL = opts.siteUrl;
  if (opts.preDomain !== undefined) env.PRE_DOMAIN_DEPLOY = opts.preDomain;
  try {
    const out = execFileSync("sh", [GATE], { encoding: "utf8", env });
    return { code: 0, out: String(out).trim() };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: unknown; stderr?: unknown };
    const out = `${String(e.stdout ?? "")}\n${String(e.stderr ?? "")}`.trim();
    return { code: e.status ?? 1, out };
  }
}

const LOOPBACKS = [
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
];

describe("normal production rejects localhost", () => {
  it("rejects http://localhost:1234 with a loopback error", () => {
    const r = runGate({ siteUrl: "http://localhost:1234" });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/loopback\/local/);
  });

  it("logs mode=production when the flag is unset", () => {
    const r = runGate({ siteUrl: "https://animeku.example.com" });
    expect(r.code).toBe(0);
    expect(r.out).toContain("mode=production");
  });
});

describe("normal production rejects loopback/local addresses", () => {
  it("rejects every loopback/local form", () => {
    for (const bad of LOOPBACKS.filter((u) => u !== "http://localhost:1234")) {
      const r = runGate({ siteUrl: bad });
      expect(r.code).toBe(1);
      expect(r.out).toMatch(/loopback\/local/);
    }
  });

  it("accepts real http(s) origins (not https-only)", () => {
    expect(runGate({ siteUrl: "https://animeku.example.com" }).code).toBe(0);
    expect(runGate({ siteUrl: "http://animeku.example.com" }).code).toBe(0);
  });
});

describe("explicit pre-domain mode behaves as designed", () => {
  it("permits exactly http://localhost:1234 and logs mode=pre-domain", () => {
    const r = runGate({
      siteUrl: "http://localhost:1234",
      preDomain: "1",
    });
    expect(r.code).toBe(0);
    expect(r.out).toContain("mode=pre-domain");
  });

  it("does NOT allow arbitrary localhost/loopback URLs", () => {
    for (const bad of [
      "http://127.0.0.1:1234",
      "http://127.0.0.2:1234",
      "http://0.0.0.0:1234",
      "http://[::1]:1234",
      "http://app.localhost:1234",
      "http://mybox.local:1234",
      // Exact-match contract: only byte-for-byte "http://localhost:1234"
      // passes — trailing slash, path, query, fragment, scheme, port, and
      // bare-host variations are all rejected.
      "http://localhost:1234/",
      "http://localhost:1234/path",
      "http://localhost:1234?x=1",
      "http://localhost:1234/foo?x=1",
      "http://localhost:1234#fragment",
      "http://localhost:1234/path?x=1#fragment",
      "https://localhost:1234",
      "http://localhost:1235",
      "http://localhost",
    ]) {
      const r = runGate({ siteUrl: bad, preDomain: "1" });
      expect(r.code).toBe(1);
      expect(r.out).toMatch(/permits only the temporary URL/);
    }
  });

  it("still accepts a real origin in pre-domain mode", () => {
    const r = runGate({
      siteUrl: "https://animeku.example.com",
      preDomain: "1",
    });
    expect(r.code).toBe(0);
    expect(r.out).toContain("mode=pre-domain");
  });
});

describe("invalid values fail closed", () => {
  it("non-\"1\" flag values stay in production (localhost rejected)", () => {
    for (const flag of ["true", "yes", "0", "2", ""]) {
      const r = runGate({
        siteUrl: "http://localhost:1234",
        preDomain: flag,
      });
      expect(r.code).toBe(1);
      expect(r.out).toContain("mode=production");
    }
  });

  it("missing/invalid URLs fail in both modes (no silent localhost fallback)", () => {
    for (const preDomain of [undefined, "1"]) {
      for (const siteUrl of ["not-a-url", "ftp://example.com", "   "]) {
        const r = runGate({ siteUrl, preDomain });
        expect(r.code).toBe(1);
      }
      // Missing entirely: env key absent — must fail, never default to OK.
      const r = runGate(preDomain === undefined ? {} : { preDomain });
      expect(r.code).toBe(1);
      expect(r.out).toMatch(/required in production/);
    }
  });
});

describe("gate script stays POSIX (no host node dependency)", () => {
  const script = read("scripts/check-production-site-url.sh");

  it("is a bourne script with no node invocation", () => {
    expect(script.split("\n")[0].trim()).toBe("#!/bin/sh");
    expect(script).not.toContain("node -e");
    expect(script).not.toMatch(/\bnode\b/);
  });

  it("uses only POSIX constructs", () => {
    // Bash `[[ ... ]]` conditionals must not appear (POSIX `[` / `case` only).
    // NOTE: `[[:space:]]` character classes inside sed patterns are POSIX and
    // fine — only a line-opening `[[` conditional is a bashism.
    expect(script).not.toMatch(/^\s*\[\[/m);
    expect(script).not.toMatch(/^function\s/m);
  });

  it("decides pre-domain by exact full-URL match (no origin normalization)", () => {
    // The pre-domain allowlist must compare the whole trimmed URL value —
    // building a scheme://host:port origin would silently tolerate paths,
    // queries, and fragments.
    expect(script).not.toMatch(/\bORIGIN\b/);
    expect(script).toContain('[ "$URL" = "http://localhost:1234" ]');
  });
});

describe("deploy workflow uses the POSIX gate (no host node)", () => {
  const deploy = read(".github/workflows/deploy.yml");

  it("calls the gate script instead of node", () => {
    expect(deploy).toContain("scripts/check-production-site-url.sh");
    expect(deploy).not.toContain("node -e");
  });

  it("logs which mode is active before gating", () => {
    expect(deploy).toContain("PRE_DOMAIN_DEPLOY");
    expect(deploy).toMatch(/Site-URL gate mode/);
  });

  it("keeps the fail-loud gate before the build (no localhost bake by default)", () => {
    expect(deploy).toMatch(/fail-loud|Validating NEXT_PUBLIC_SITE_URL/);
    expect(deploy).toMatch(/must not be loopback\/local/);
    expect(deploy).toMatch(/NEXT_PUBLIC_SITE_URL is required in production/);
    const gateIdx = deploy.indexOf("check-production-site-url.sh");
    const buildIdx = deploy.indexOf("Building and starting");
    expect(gateIdx).toBeGreaterThan(0);
    expect(gateIdx).toBeLessThan(buildIdx);
    expect(deploy.slice(gateIdx, buildIdx)).toMatch(/exit 1/);
  });

  it("keeps health check, rollback, and dirty-tree protection", () => {
    expect(deploy).toContain("/api/health");
    expect(deploy).toContain("Rolling back");
    expect(deploy).toContain("ROLLBACK RESULT");
    expect(deploy).toContain("--no-build");
    expect(deploy).toContain("git status --porcelain");
    expect(deploy).toContain("ERROR: Production working tree is dirty.");
    expect(deploy).toContain("git fetch origin main");
    expect(deploy).toContain("git reset --hard origin/main");
  });
});
