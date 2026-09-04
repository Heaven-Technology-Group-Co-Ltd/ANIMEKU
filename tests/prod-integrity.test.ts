/**
 * P2.1 production-integrity contract tests (deterministic, file-based).
 * No live VPS, no GitHub Actions, no network. These assert the static
 * wiring that makes the production deploy honest:
 *  - Dockerfile wires NEXT_PUBLIC_* build args BEFORE `npm run build`
 *    (build-time embed — runtime env alone cannot fix baked client JS).
 *  - docker-compose.yml declares the REAL image name `webanime:latest`
 *    that deploy.yml's save/restore path references.
 *  - deploy.yml rollback restores without --build and reports its result.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("Dockerfile build-time public config (P2.1-a)", () => {
  const dockerfile = read("Dockerfile");

  it("declares NEXT_PUBLIC_SITE_URL build arg", () => {
    expect(dockerfile).toMatch(/ARG\s+NEXT_PUBLIC_SITE_URL/);
  });

  it("declares NEXT_PUBLIC_HLS_BASE_URL build arg", () => {
    expect(dockerfile).toMatch(/ARG\s+NEXT_PUBLIC_HLS_BASE_URL/);
  });

  it("exports build args to ENV before `npm run build`", () => {
    const argIdx = dockerfile.indexOf("ARG NEXT_PUBLIC_SITE_URL");
    const envIdx = dockerfile.indexOf("ENV NEXT_PUBLIC_SITE_URL");
    const buildIdx = dockerfile.indexOf("npm run build");
    expect(argIdx).toBeGreaterThanOrEqual(0);
    expect(envIdx).toBeGreaterThan(0);
    expect(buildIdx).toBeGreaterThan(0);
    // Order matters: ARG -> ENV -> build (values must exist at build time).
    expect(argIdx).toBeLessThan(envIdx);
    expect(envIdx).toBeLessThan(buildIdx);
  });
});

describe("compose image/tag strategy matches deploy (P2.1-b)", () => {
  const compose = read("docker-compose.yml");
  const deploy = read(".github/workflows/deploy.yml");

  it("compose declares the real image name referenced by rollback", () => {
    expect(compose).toMatch(/image:\s*webanime:latest/);
  });

  it("compose forwards NEXT_PUBLIC_* as build args (build-time embed)", () => {
    expect(compose).toMatch(/NEXT_PUBLIC_SITE_URL:\s*\$\{NEXT_PUBLIC_SITE_URL/);
    expect(compose).toMatch(/NEXT_PUBLIC_HLS_BASE_URL:\s*\$\{NEXT_PUBLIC_HLS_BASE_URL/);
  });

  it("deploy save/restore references the same real image (internal consistency)", () => {
    expect(deploy).toContain("docker image inspect webanime:latest");
    expect(deploy).toContain("docker tag webanime:latest webanime:rollback");
    expect(deploy).toContain("docker tag webanime:rollback webanime:latest");
  });

  it("rollback recreates from the restored image WITHOUT --build", () => {
    // The rollback block must not rebuild from the (broken) working tree:
    // every `docker compose up` line there must carry --no-build.
    const rollbackIdx = deploy.indexOf("Rolling back");
    expect(rollbackIdx).toBeGreaterThan(0);
    const rollbackBlock = deploy.slice(rollbackIdx);
    const upLines = rollbackBlock
      .split("\n")
      .filter((l) => l.includes("docker compose up"));
    expect(upLines.length).toBeGreaterThan(0);
    for (const line of upLines) {
      expect(line).toMatch(/--no-build/);
    }
  });

  it("rollback reports its result explicitly (no silent failure)", () => {
    const rollbackBlock = deploy.slice(deploy.indexOf("Rolling back"));
    expect(rollbackBlock).toMatch(/ROLLBACK RESULT/);
    // Failure with no saved image must be loud, not ignored.
    expect(rollbackBlock).toMatch(/no webanime:rollback image exists/);
  });

  it("deploy preserves health verification, diagnostics, dirty-tree protection", () => {
    expect(deploy).toContain("git diff --quiet");
    expect(deploy).toContain("/api/health");
    expect(deploy).toContain("docker logs --tail 100 webanime-app");
    expect(deploy).toContain("docker compose ps");
  });

  it("deploy loads production env before build (no localhost bake by default)", () => {
    const buildIdx = deploy.indexOf("Building and starting");
    expect(buildIdx).toBeGreaterThan(0);
    const preBuild = deploy.slice(0, buildIdx);
    expect(preBuild).toMatch(/\.env/);
    expect(preBuild).toMatch(/NEXT_PUBLIC_SITE_URL/);
  });
});
