# P3.6 Observability / smoke runbook (ANIMEKU)

Local / dry-run only — no production changes, no external services.

## 1. Pre-deploy
- Branch must be `chore/p3-6-observability-smoke` (not `main`).
- `git status --porcelain` must be clean or only `docs/LEDGER.md` (see working-tree gate).
- Verified commit: read `git log --oneline -1`.
- Production site URL gate: `scripts/check-production-site-url.sh` with `PRE_DOMAIN_DEPLOY=1 NEXT_PUBLIC_SITE_URL=http://localhost:1234` (pre-domain) and with real origin (production). Loopback rejected in production.

## 2. Health verification
- `GET /api/health` → HTTP 200, body contains `status: "ok"`, `service: "ANIMEKU"`, `timestamp`, `version` (and optional `commit`).
- Must have `force-dynamic`, `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, no external calls, no secrets.
- Never change response contract; only observe.

## 3. Smoke verification (no production contact)
- `sh scripts/smoke-local.sh` — working tree, site URL gate (both modes), docker compose config, build, lint, data validation (104/104), route count (3 API routes), health contract preserved, docker log rotation present.
- Canonical / basePath (`/animeku`) responds correctly through configured local binding (`127.0.0.1:1234`).
- No localhost leakage when real-domain mode is configured (`PRE_DOMAIN_DEPLOY` unset, real `NEXT_PUBLIC_SITE_URL`).

## 4. Rollback
- Rollback target: `webanime:rollback` image (existing rollback mechanism; do not rebuild).
- Restore previous image: `docker compose up -d webanime:webanime:rollback` (or equivalent per deploy workflow).
- After rollback: verify `/api/health` 200; run smoke-local gate; confirm no new routes / contracts changed.
- Never force-push, never edit production `.env`, never SSH to VPS.

## 5. Dirty-tree failure (intentional allowlist)
- Only `docs/LEDGER.md` drift is tolerated (exit 10 from `scripts/check-production-working-tree.sh`).
- Everything else (other docs edits, untracked files, deletions, renames, unstaged code) blocks deploy (exit 1).
- Do NOT run broad `git reset --hard` or `git clean -fd` — that destroys the allowlist behavior and backup/restore path.

## 6. Degraded network diagnostics (observability log interpretation)
- Captions 502: look for `[api:captions] event=upstream_error` with `provider=youtube`, `status=502`, `failure_class=all_providers_failed`, `cache_state=miss`, `videoId=<normalized>`. Previous `logFailure` stage=timedtext/watch with `failure_class=` (http_error, oversized, bad-caption-json, timeout) indicates which provider failed.
- AniList graceful degradation: `[anilist] event=failure` / `fallback` / `timeout` with `provider=anilist`; `route=/api/*`; `failure_class=` (http_error, graphql_error, missing_media, timeout). If `getAnimeByIdAni` returns null with `failure_class=missing_media`, upstream had no data for that id — expected, not a protocol error.
- Rate-limit 429: `route=/api/youtube/captions` or `/api/subs/auto-generate`; `status=429`; `Retry-After` header present. Logs do not contain IP or user tokens.
- All structured log lines omit secrets, authorization headers, cookies, full URLs with sensitive query data, and raw user content.

## 7. Pre-domain mode
- `PRE_DOMAIN_DEPLOY=1` (exact `"1"`) permits only `http://localhost:1234`.
- `localhost` is temporary only; real-domain cutover requires: set `NEXT_PUBLIC_SITE_URL=https://<domain>` in VPS `.env`, unset/`0` `PRE_DOMAIN_DEPLOY`, rebuild (`docker compose up -d --build`).
- Client JS is baked at build time via `docker-compose.yml` args (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_HLS_BASE_URL`); changing `.env` alone is insufficient.

## References
- `scripts/check-production-site-url.sh`
- `scripts/check-production-working-tree.sh`
- `scripts/smoke-local.sh`
- `src/app/api/health/route.ts`
- `src/lib/structured-log.ts`
- `docs/pre-domain-deploy.md`
- `docker-compose.yml` (log rotation: `json-file`, `max-size: 10m`, `max-file: 3`)
