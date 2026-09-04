/**
 * Deploy working-tree gate — deterministic contract tests.
 *
 * Production deploys must stay fail-closed: any working-tree change blocks,
 * EXCEPT the single documented documentation-only drift
 * `M docs/LEDGER.md` (operational project ledger, VPS-local session appends).
 *
 * The tolerated ledger path is BACKUP -> VERIFY BACKUP -> NEUTRALIZE exact
 * file -> CHECKOUT/RESET -> RESTORE. Checkout while the tracked file is still
 * modified aborts, so neutralization of ONLY docs/LEDGER.md is required.
 *
 * These tests pin that contract without touching a VPS, without network,
 * and without git state: they drive `scripts/check-production-working-tree.sh`
 * with fixture porcelain inputs and assert the inline gate in
 * `.github/workflows/deploy.yml` mirrors the same exact allowlist plus
 * backup/verify/neutralize/restore (never discard ledger drift via `reset --hard`).
 *
 * Exit-code contract of the helper (and the inline gate semantics):
 *   0  -> clean (proceed)
 *   10 -> ledger-only drift (proceed WITH backup/restore)
 *   1  -> blocked (refuse to deploy)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

let FIXTURE_DIR = "";

beforeAll(() => {
  FIXTURE_DIR = mkdtempSync(join(tmpdir(), "deploy-gate-"));
});

function runGate(porcelain: string): { code: number; out: string } {
  const file = join(
    FIXTURE_DIR,
    `porcelain-${Math.random().toString(36).slice(2)}.txt`,
  );
  writeFileSync(file, porcelain);
  try {
    const out = execFileSync(
      join(ROOT, "scripts/check-production-working-tree.sh"),
      [file],
      { encoding: "utf8" },
    );
    return { code: 0, out: out.trim() };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    const out = String(e.stdout ?? e.stderr ?? "").trim();
    return { code: e.status ?? 1, out };
  }
}

function codeOnly(text: string): string {
  // Strip full-line `#` comments (shell + YAML) so assertions target
  // functional code, not explanatory comments that name forbidden patterns
  // to document their absence.
  return text
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("#"))
    .join("\n");
}

describe("helper gate classification (fixture porcelain -> exit code)", () => {
  it("clean tree proceeds (exit 0)", () => {
    expect(runGate("").code).toBe(0);
  });

  it("unstaged ledger modification is tolerated intentionally (exit 10) — the VPS case", () => {
    const r = runGate(" M docs/LEDGER.md\n");
    expect(r.code).toBe(10);
    expect(r.out).toBe("ledger-only");
  });

  it("staged and both-staged ledger modifications are tolerated (exit 10)", () => {
    expect(runGate("M  docs/LEDGER.md\n").code).toBe(10);
    expect(runGate("MM docs/LEDGER.md\n").code).toBe(10);
  });

  it("arbitrary tracked modifications still block (exit 1)", () => {
    expect(runGate(" M src/app/page.tsx\n").code).toBe(1);
    expect(runGate("M  Dockerfile\n").code).toBe(1);
    expect(runGate(" M .env\n").code).toBe(1);
  });

  it("ledger drift PLUS any other change still blocks (exit 1)", () => {
    expect(runGate(" M docs/LEDGER.md\n M src/app/page.tsx\n").code).toBe(1);
    expect(
      runGate(" M docs/LEDGER.md\n?? new-file.txt\n").code,
    ).toBe(1);
  });

  it("untracked ledger file blocks (fail-closed: ?? is never tolerated)", () => {
    expect(runGate("?? docs/LEDGER.md\n").code).toBe(1);
  });

  it("deletions, renames, and added ledger entries block", () => {
    expect(runGate(" D docs/LEDGER.md\n").code).toBe(1);
    expect(runGate("D  docs/LEDGER.md\n").code).toBe(1);
    expect(runGate("A  docs/LEDGER.md\n").code).toBe(1);
    expect(
      runGate("R  docs/OLD.md -> docs/LEDGER.md\n").code,
    ).toBe(1);
  });

  it("look-alike paths block (no glob/broad docs bypass)", () => {
    expect(runGate(" M docs/LEDGER.md.bak\n").code).toBe(1);
    expect(runGate(" M docs/LEDGER2.md\n").code).toBe(1);
    expect(runGate(" M docs/other.md\n").code).toBe(1);
    expect(runGate(" M docs/ledger.md\n").code).toBe(1);
    expect(runGate(" M DOCS/LEDGER.md\n").code).toBe(1);
    expect(runGate(" M src/docs/LEDGER.md\n").code).toBe(1);
  });
});

describe("helper script stays narrow (no broad bypass baked in)", () => {
  const script = read("scripts/check-production-working-tree.sh");

  it("references the single exact path", () => {
    expect(script).toContain("docs/LEDGER.md");
  });

  it("introduces no glob bypass for docs or markdown", () => {
    // Comment-aware: explanatory comments may name the forbidden globs to
    // document their absence; only functional code must be glob-free.
    const code = codeOnly(script);
    expect(code).not.toContain("docs/*");
    expect(code).not.toContain("*.md");
  });

  it("never mutates the tree itself (no reset/checkout/clean/restore)", () => {
    expect(script).not.toMatch(/git reset/);
    expect(script).not.toMatch(/git checkout/);
    expect(script).not.toMatch(/git clean/);
    expect(script).not.toMatch(/git restore/);
  });
});

describe("deploy.yml inline gate mirrors the helper (fail-closed + preserve)", () => {
  const deploy = read(".github/workflows/deploy.yml");
  const script = read("scripts/check-production-working-tree.sh");

  it("keeps the fail-closed porcelain check and error strings", () => {
    expect(deploy).toContain("git status --porcelain");
    expect(deploy).toContain("ERROR: Production working tree is dirty.");
    expect(deploy).toContain("git status --short");
    expect(deploy).toContain("Working tree clean");
  });

  it("allows ONLY the exact ledger path (same regex family as helper)", () => {
    // Both files must pin the identical allowlist pattern.
    expect(deploy).toContain("docs/LEDGER\\.md");
    expect(script).toContain("docs/LEDGER\\.md");
    expect(deploy).toMatch(/grep -v -E/);
  });

  it("introduces no broad bypass: no docs glob, no markdown glob, no clean", () => {
    // Comment-aware (see above): `no \`docs/*\`` appears in an inline
    // comment documenting the exact-match rule; assert on code only.
    const code = codeOnly(deploy);
    expect(code).not.toContain("docs/*");
    // `*.md` must not appear as an ignore pattern (the literal filename
    // docs/LEDGER.md contains `.md` but never the glob `*.md`).
    expect(code).not.toContain("*.md");
    expect(code).not.toMatch(/git clean/);
    // Must not ignore all untracked files or skip the tree check.
    expect(code).not.toMatch(/--exclude-standard|untracked-files=no/i);
  });

  it("backs up ledger drift before reset and restores after (never discards)", () => {
    expect(deploy).toContain("Backed up docs/LEDGER.md");
    expect(deploy).toContain("Restored production-local docs/LEDGER.md");
    expect(deploy).toContain("/tmp/prod-LEDGER-backup.md");
    const backupIdx = deploy.indexOf("Backed up docs/LEDGER.md");
    const resetIdx = deploy.indexOf("git reset --hard origin/main");
    const restoreIdx = deploy.indexOf(
      "Restored production-local docs/LEDGER.md",
    );
    expect(backupIdx).toBeGreaterThan(0);
    expect(resetIdx).toBeGreaterThan(backupIdx);
    expect(restoreIdx).toBeGreaterThan(resetIdx);
  });

  it("still syncs main via fetch/checkout/reset (no silent behavior change)", () => {
    expect(deploy).toContain("git fetch origin main");
    expect(deploy).toContain("git checkout main");
    expect(deploy).toContain("git reset --hard origin/main");
  });

  it("neutralizes ONLY the exact ledger file before checkout (handles staged + worktree)", () => {
    // Exact safe mechanism covering both worktree (" M") and staged ("M "/"MM").
    expect(deploy).toContain(
      "git restore --source=HEAD --staged --worktree -- docs/LEDGER.md",
    );
  });

  it("orders BACKUP -> VERIFY -> NEUTRALIZE -> CHECKOUT -> RESET -> RESTORE", () => {
    const backupCpIdx = deploy.indexOf('cp docs/LEDGER.md "$LEDGER_BACKUP"');
    const verifyIdx = deploy.indexOf(
      "ledger backup missing at $LEDGER_BACKUP",
    );
    const neutralizeIdx = deploy.indexOf(
      "git restore --source=HEAD --staged --worktree -- docs/LEDGER.md",
    );
    const checkoutIdx = deploy.indexOf("git checkout main");
    const resetIdx = deploy.indexOf("git reset --hard origin/main");
    const restoreCpIdx = deploy.indexOf('cp "$LEDGER_BACKUP" docs/LEDGER.md');
    for (const idx of [
      backupCpIdx,
      verifyIdx,
      neutralizeIdx,
      checkoutIdx,
      resetIdx,
      restoreCpIdx,
    ]) {
      expect(idx).toBeGreaterThan(0);
    }
    expect(verifyIdx).toBeGreaterThan(backupCpIdx);
    expect(neutralizeIdx).toBeGreaterThan(verifyIdx);
    expect(checkoutIdx).toBeGreaterThan(neutralizeIdx);
    expect(resetIdx).toBeGreaterThan(checkoutIdx);
    expect(restoreCpIdx).toBeGreaterThan(resetIdx);
  });

  it("fails closed when the expected backup is missing (no silent continuation)", () => {
    expect(deploy).toContain(
      "ERROR: ledger backup missing at $LEDGER_BACKUP",
    );
    expect(deploy).toContain(
      "ERROR: expected ledger backup missing at $LEDGER_BACKUP",
    );
    // Both missing-backup guards must abort the deploy (set -e alone is not
    // enough for the skipped-restore case).
    const firstGuard = deploy.indexOf("refusing to neutralize.");
    const secondGuard = deploy.indexOf(
      "refusing to continue without restore.",
    );
    expect(firstGuard).toBeGreaterThan(0);
    expect(secondGuard).toBeGreaterThan(0);
  });

  it("neutralization stays exact: no broad restore, no clean, no early reset", () => {
    const code = codeOnly(deploy);
    // Exact file only — never a directory-wide restore.
    expect(code).not.toContain("git restore .");
    expect(code).not.toMatch(/git restore --source=HEAD --staged --worktree -- \./);
    // No untracked-file deletion and no reset before the backup exists.
    expect(code).not.toMatch(/git clean/);
    const backupCpIdx = code.indexOf('cp docs/LEDGER.md "$LEDGER_BACKUP"');
    const resetIdx = code.indexOf("git reset --hard origin/main");
    expect(backupCpIdx).toBeGreaterThan(0);
    expect(resetIdx).toBeGreaterThan(backupCpIdx);
    // Single hard reset (the sync one); no pre-backup discard.
    expect(code.match(/git reset --hard/g)?.length).toBe(1);
  });
});
