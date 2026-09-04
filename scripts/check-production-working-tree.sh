#!/bin/sh
# check-production-working-tree.sh — fail-closed production working-tree gate.
#
# Purpose: let routine production deploys tolerate documentation-only drift
# of the single operational ledger `docs/LEDGER.md` while continuing to
# block on every other working-tree change.
#
# Contract (mirrors the inline gate in .github/workflows/deploy.yml):
#   exit 0  — working tree clean (proceed, no backup needed)
#   exit 10 — ONLY docs/LEDGER.md is modified (proceed WITH backup/restore)
#   exit 1  — anything else dirty (block deployment)
#
# Usage:
#   ./scripts/check-production-working-tree.sh [porcelain-file]
#     no arg         -> runs `git status --porcelain` live in cwd
#     porcelain-file -> reads a fixture file (deterministic tests)
#
# Allowlist (exact, no globs):
#   Only these three porcelain lines for the exact path docs/LEDGER.md:
#     " M docs/LEDGER.md"  (unstaged modification — the VPS case)
#     "M  docs/LEDGER.md"  (staged modification)
#     "MM docs/LEDGER.md"  (staged + unstaged)
#   Everything else blocks: other paths, untracked (??), deletions,
#   renames (->), added (A), unmerged (U), and look-alike paths
#   (docs/LEDGER.md.bak, docs/other.md, docs/*).
#
# This script never mutates the tree: no reset, no checkout, no clean.
set -e

PORCELAIN_FILE="${1:-}"

if [ -n "$PORCELAIN_FILE" ]; then
  PORCELAIN="$(cat "$PORCELAIN_FILE")"
else
  PORCELAIN="$(git status --porcelain)"
fi

if [ -z "$PORCELAIN" ]; then
  echo "clean"
  exit 0
fi

# Every line must be an allowed ledger modification; anything else is a blocker.
BLOCKERS="$(printf '%s\n' "$PORCELAIN" | grep -v -E '^(M | M|MM) docs/LEDGER\.md$' || true)"

if [ -z "$BLOCKERS" ]; then
  echo "ledger-only"
  exit 10
else
  echo "blocked"
  printf '%s\n' "$BLOCKERS" >&2
  exit 1
fi
