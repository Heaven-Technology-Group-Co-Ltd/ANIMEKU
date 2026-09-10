# P3.6 Observability floor — milestone record (ANIMEKU)

Status: COMPLETED locally on branch `chore/p3-6-observability-smoke`. Not pushed, not merged, not deployed.

Purpose: close observability/smoke-test gap beyond `/api/health` without new infrastructure.

What changed (exact files):
- `src/lib/structured-log.ts` (new helper — machine-searchable tags `[api:captions]`, `[api:autogenerate]`, `[anilist]`; structured fields event/route/status/failure_class/provider/timeout/cache_state; no secrets)
- `src/app/api/youtube/captions/route.ts` (standardized `logFailure`; added 502 upstream_error structured line; contracts unchanged)
- `src/app/api/subs/auto-generate/route.ts` (structured degradation for malformed JSON; structured failure for AniList lookup; contracts unchanged)
- `src/lib/anilist.ts` (structured timeout/failure/fallback logs in `gql`; structured missing_media fallback; graceful degradation preserved; no full payloads)
- `scripts/smoke-local.sh` (new — working-tree gate, site-URL gate both modes, compose config, build, lint, data validation, route count, health contract, docker rotation; fail-closed; no production requests)
- `docs/p3-6-observability-runbook.md` (new — 7 required sections; references existing scripts/docs; no real credentials)
- `tests/p3-6-observability.test.ts` (new — contracts/logs/health/gates/rotation/routes; mocks/stubs only; no external network)

What preserved (verified):
- `/api/health` unchanged (force-dynamic, no-store, no external, serialized status)
- Caption contracts: 200 timedtext/watch/none; 400 invalid; 429 + Retry-After; 502 upstream/fetch failure
- AniList graceful degradation unchanged (P3.3 provenance/guardrails not reverted)
- Route table: exactly 3 API routes (`/api/health`, `/api/youtube/captions`, `/api/subs/auto-generate`)
- Catalog: 104/104 (`node scripts/validate-data.mjs`)
- Docker log rotation: `json-file`, `max-size: 10m`, `max-file: 3` (`docker-compose.yml`)
- No new infrastructure: no Sentry, Datadog, Loki, Prometheus, Grafana, ELK, external uptime, DB, Redis, K8s, worker, CMS, CDN, auth
- No production changes: no SSH, no `.env` edit, no deploy, no restart, no domain/DNS change

Test / verification results (to be filled after run):
- `npm run lint`: target pass
- `npm run test:run`: target pass (new + existing)
- `npm run build`: target pass
- `docker compose config`: pass
- `docker build .`: target pass
- `git diff --check`: clean
- `node scripts/validate-data.mjs`: 104/104
- `node scripts/smoke-local.sh`: target pass

Pre-existing concerns (not introduced by P3.6):
- `deploy-pre-domain-gate`, `deploy-working-tree-gate`, `prod-integrity` collections may show `fileURLToPath is not a function`. These are pre-existing environment/tooling failures; P3.6 did not modify those files or their contracts.
- Classification if encountered: pre-existing / environment, not P3.6-introduced.

Distinguish:
- Repository-local smoke/dry-run verification (`smoke-local.sh`, fixtures)
- Pre-domain mode (`PRE_DOMAIN_DEPLOY=1`, `localhost:1234` temporary)
- Future real-domain verification (requires `P3.0` domain cutover, not claimed here)
