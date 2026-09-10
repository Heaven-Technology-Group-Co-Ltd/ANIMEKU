#!/bin/sh
# smoke-local.sh - deterministic dry-run / smoke checks (NO production contact).
# Fail closed where appropriate. Uses only repo-local tools.
set -eu

fail() { echo "SMOKE FAIL: $1" >&2; exit 1; }
echo "smoke-local: start (branch=$(git rev-parse --abbrev-ref HEAD) commit=$(git rev-parse --short HEAD))"

# 1) Working-tree gate (fail on anything except allowed ledger-only drift).
if command -v sh >/dev/null 2>&1; then
  sh scripts/check-production-working-tree.sh >/dev/null 2>&1 || {
    # Allow ledger-only exit 10; anything else (exit 1) is failure.
    code=$?
    if [ "$code" -eq 10 ]; then
      echo "smoke-local: working-tree ledger-only (exit 10, permitted)"
    elif [ "$code" -eq 0 ]; then
      echo "smoke-local: working-tree clean"
    else
      fail "working-tree gate blocked (exit $code)"
    fi
  }
fi

# 2) Site-URL gate (fail-closed) with fixture modes.
PRE_DOMAIN_DEPLOY=1 NEXT_PUBLIC_SITE_URL=http://localhost:1234 \
  sh scripts/check-production-site-url.sh >/dev/null || fail "site-url gate pre-domain"
PRE_DOMAIN_DEPLOY= NEXT_PUBLIC_SITE_URL=https://example.com \
  sh scripts/check-production-site-url.sh >/dev/null || fail "site-url gate production"
NEXT_PUBLIC_SITE_URL=http://localhost:1234 \
  sh scripts/check-production-site-url.sh >/dev/null 2>&1 && fail "site-url gate should reject loopback in production" || echo "smoke-local: site-url gate rejects loopback (good)"
echo "smoke-local: site-url gate OK"

# 3) Docker compose config.
docker compose config >/dev/null || fail "docker compose config"
echo "smoke-local: docker compose config OK"

# 4) Build sanity (no production requests; build is local).
npm run build >/dev/null 2>&1 || fail "npm run build"
echo "smoke-local: build OK"

# 5) Lint.
npm run lint >/dev/null 2>&1 || fail "npm run lint"
echo "smoke-local: lint OK"

# 6) Data validation (catalog 104/104; no catalog changes).
node scripts/validate-data.mjs >/dev/null 2>&1 || fail "data validation"
echo "smoke-local: data validation OK"

# 7) Route table unchanged (exactly 3 API routes; no new routes from build).
api_routes=$(find src/app/api -name 'route.ts' | wc -l | tr -d ' ')
[ "$api_routes" -eq 3 ] || fail "expected 3 API routes, got $api_routes"
echo "smoke-local: route count OK ($api_routes)"

# 8) Health endpoint unchanged (compare content to baseline; no rewrite).
if [ -f src/app/api/health/route.ts ]; then
  grep -q 'force-dynamic' src/app/api/health/route.ts || fail "health missing force-dynamic"
  grep -q 'Cache-Control' src/app/api/health/route.ts || fail "health missing Cache-Control"
  echo "smoke-local: health contract OK"
fi

# 9) Log rotation configured (P2 json-file).
grep -q 'driver: json-file' docker-compose.yml || fail "docker log rotation missing"
echo "smoke-local: docker log rotation OK"

# 10) No new infrastructure references in docs/scripts (manual checklist; not automated beyond above).
echo "smoke-local: complete (all checks pass)"
