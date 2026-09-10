# P3.5 — Compat-shim + config-debt sweep audit (chore/p3-5-compat-config-cleanup)

Branch: chore/p3-5-compat-config-cleanup
Base: chore/p3-4-truthful-discoverability (b9617b5)
Status: audit-only; ZERO source removals; zero behavior change.

## 1. platforms.ts shim audit (ARCH-06)
- `available` — KEEP. Zero runtime source consumers; removal condition (migrate callers/tests to `verified`) not met; tests (`platforms.test.ts`, `p23-architecture.test.ts`) still assert alias.
- `searchUrl()` — KEEP. Zero runtime source callers outside construction in `getLegalPlatforms`; removal condition (no external/CMS consumer needs function form) not fully satisfied; tests assert equality with `url`.
- `LegalPlatform` — KEEP. Zero source callers outside type usage; removal condition (rename to `PlatformInfo`) not met.
- `getAvailablePlatforms()` — KEEP. Tests only; `src/` uses `getVerifiedPlatforms`/`getLegalPlatforms`; removal condition (migrate tests/callers) not met.
Evidence: grep of src/ (empty for `.available`/`.searchUrl` property use outside platforms.ts; `getAvailablePlatforms` only in definition + tests).

## 2. Port / canonical config (ARCH-08)
- No casual replacement of 1234.
- `docker-compose.yml`: binding `127.0.0.1:1234:1234` preserved; `PORT=1234`; healthcheck `127.0.0.1:1234` consistent.
- `Dockerfile`: `ENV PORT=1234`; `EXPOSE 1234`; `CMD -p 1234`; `HEALTHCHECK` consistent.
- `.env`: `localhost:1234` (dev origin) preserved.
- `.env.example`: doc/example values preserved.
- Single-source already clear (compose for bind, Dockerfile for container/app, .env for runtime). No deletion/replacement performed.

## 3. trailerDubYoutubeId (DATA-04)
- KEEP. Active runtime consumer `src/lib/dubMap.ts`: `resolveTrailerDub()` types it (line 87); `applyDubMap()` writes/clears it (lines 166–172). All 104 `src/data/animes.ts` rows have `""`; removal condition (confirm no CMS/test/serialized cache reads) not safely met; `tests/dubMap.test.ts` and `tests/p23-architecture.test.ts` cover behavior.
Evidence: `Select-String` across src/tests/scripts — only `dubMap.ts`, `animes.ts`, and tests reference field; no script/consumer outside those.

## 4. TEST-05 env / HLS-duality harness
- DEFERRED. Existing coverage sufficient: `tests/env.test.ts` (line 129–147) resets/sets `NEXT_PUBLIC_HLS_BASE_URL`; `tests/api-env-prod.test.ts` validates invalid values and warnings. `resolveHlsUrl()` and `HLS_DEMO_FALLBACK_URL` already pure (no network, deterministic). Adding harness would duplicate without reducing risk.

## 5. Other compatibility shims (Part E)
- `src/lib/data.ts` `@deprecated` `HLS_BASE` — KEEP. Consumer `src/components/VideoPlayer.tsx` (line 5/32) still imports; removal condition (switch VideoPlayer to `getHlsBaseUrl()`) not met.
No other zero-consumer dead aliases found (only platforms.ts audit notes and the above documented shims).

## 6. Verification results (no source edits → no regressions expected)
- lint: pre-existing `tests/seo.test.ts` `require()` errors + 2 image warnings (not P3.5)
- test:run: 345 passed, 15 failed — pre-existing (`p32-no-streaming`, `seo.test.ts`, deploy gates, prod-integrity with `fileURLToPath`); no new failures
- build: OK (routes rendered)
- validate-data.mjs: 104 / 104; no duplicates; sha256 preserved
- route table unchanged: /, /anime/[slug], /watch/[slug]/1, /category/[slug], /search, /admin/subs, 3 API routes
- docker compose / docker build: docker not available in this win32 session — syntax validated by file inspection; binding preserved
- git diff --check: only LF/CRLF line-ending warnings (pre-existing)
- basePath `/animeku`: preserved
- production `.env`: untouched
- dependency/infrastructure: no changes

## 7. Decision summary
No compatibility shim removed this milestone because every documented removal condition requires a subsequent migration/test update that is out of scope for hygiene-only P3.5 and would risk behavior change. Audit completed, evidence preserved in source comments and this note.

Commit planned: `refactor(p3.5): remove obsolete compatibility debt` (audit-only; empty-change milestone mark).
No push / PR / merge / deploy.
