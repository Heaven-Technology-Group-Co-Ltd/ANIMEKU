# P2 Architecture & Production Readiness Audit

**Date:** 2026-09-03
**Branch:** `chore/p2-architecture-audit`
**Scope:** Current-state audit AFTER P0 (production hardening), P1.1 (data architecture), P1.2 (test suite + footer), P1.3 (health/monitoring), P1.4 (legal platform data), P1.5 (Thai dub map). Source of truth is the repository, not old roadmap documents.
**Method:** 4 parallel read-only explore lanes (architecture/data/maintainability, API/security, production/testing, performance/SEO/scalability). Zero product edits during evidence gathering. `GROK VERSION: opencode-fallback` (grok CLI unavailable; lanes executed directly).
**Verdict: No P0 (critical) findings. The application is correctly hardened for its current scale; the two P1 production-integrity items (build-time env bake, no-op rollback) are the only must-fix-before-scale concerns.**

## Executive Summary

ANIMEKU is a Next.js 16.3.4 / React 19 anime catalog + trailer/subtitle-tooling site: 104 anime in a file-based TypeScript dataset (`src/data/animes.ts`, 155,129 bytes / 2,505 lines), server-rendered App Router pages, 3 API routes, live AniList GraphQL enrichment (ISR 1h), YouTube caption tooling, and a Docker Compose production deployment (`webanime-app`, port 1234) with GitHub→VPS auto-deploy and a health gate.

P0/P1 did their jobs: non-root container, dual-layer healthchecks, validated env helpers, graceful AniList degradation on every caller, a deterministic 120-test suite (7.7s, all passing), honest "verified vs discovery" legal-platform data, and an empty-by-design dub gate. Secrets posture is good; there is no SSRF, no code/fs/command execution surface, and no middleware/auth gap on any mutating endpoint (nothing mutates server-side).

What remains is technical debt and scale-headroom work, not emergencies:

- **Production integrity (P1, 2 items):** production containers bake `localhost` fallbacks because no `NEXT_PUBLIC_*` is wired into the Docker build/compose (U3 P1-a); the deploy rollback path tags/inspects an image name (`webanime:latest`) that does not exist because compose sets no `image:` key, so rollback is a silent no-op (U3 P1-b).
- **Content reality gap (P1):** all 100 episode `hlsUrl` values are 3 repeating mux demo streams — this is not real streaming (U1 #10). Any "more episodes/users" scale story depends on a real media source first.
- **External-dependency fragility (P1/P2):** caption supply depends on scraping YouTube watch-page HTML with a non-greedy regex (U1 #7, U2 F7); no timeout/AbortSignal on any server fetch (U2 F2); no rate limiting on the captions endpoint that fans 1 inbound request into up to 3 YouTube outbound fetches (U2 F1); AniList-mapped records fabricate views/rating/episodes/dates that feed SEO JSON-LD (U1 #14).
- **API test blind spot (P2):** the highest-branch logic in the repo (144 lines of API routes: XML/track regex, watch-page JSON.parse, validation + AniList fallback) has zero tests; network fetchers and production-env branches are likewise uncovered (U3 P2-c/d/e).
- **Everywhere else** is P2/P3 hygiene (duplicated resolvers, triple category sources, dead components, client-component over-marking, SEO metadata gaps) or INFO (things correctly left alone: no database needed, home-page filter cost negligible, sitemap correct).

**No P0 findings.** Nothing is actively leaking secrets, remotely exploitable, or breaking production.

## Current Architecture

- **Framework:** Next.js 16.3.4, React 19.2.8, Tailwind CSS v4, TypeScript 5. Routes (App Router, server by default):
  - `/` (`src/app/page.tsx:7`), `/anime/[slug]` (`src/app/anime/[slug]/page.tsx:44`), `/watch/[slug]/[episode]` (`src/app/watch/[slug]/[episode]/page.tsx:46`, only `episode=1` valid, `:49` 404s otherwise), `/category/[slug]` (`src/app/category/[slug]/page.tsx:30`), `/search` (`src/app/search/page.tsx:8`), `/admin/subs` (`src/app/admin/subs/page.tsx:32`, client editor, no server mutation), `/api/health` (`src/app/api/health/route.ts:6`), `/api/subs/auto-generate` (`src/app/api/subs/auto-generate/route.ts:11`), `/api/youtube/captions` (`src/app/api/youtube/captions/route.ts:6`), plus `sitemap.ts:5`, `robots.ts:4`, `error.tsx:1`, `not-found.tsx`.
- **Components (10):** `AnimeCard`, `Hero`, `Section`, `CategoryPills`, `Header` (client: search state + router), `Footer`, `LegalPlatforms`, `TrailerPlayer` (625 lines: YT IFrame singleton, caption fetch, custom subs, HLS fallback, theater/controls), `VideoPlayer` (230 lines, hls.js — **zero route imports, dead**), `EpisodeList` (38 lines — **zero imports, dead**).
- **Lib roles:** `data.ts:1-49` (boundary + helpers over `@/data/animes`), `anilist.ts:33-61` (live GraphQL, ISR 1h, `toAnime():98` mapper), `platforms.ts:120` (discovery-URL factory; verified always false by design), `dubMap.ts:62-91` (verified-dub gate, empty by design), `customSubs.ts:7` (3-video hardcoded cues), `env.ts:16,54` (validated site/HLS helpers), `seo.ts:3,26,39` (JSON-LD builders), `utils.ts:4,8,14` (`cn`/`formatViews`/`slugify`).
- **Data (post-P1.1 split `7a26281`):** primary `src/data/animes.ts:5` — 104 records / 152K / 2,505 lines + `src/data/index.ts:1` barrel; secondary live AniList (`getTopAnime:46`, `searchAnilist:51`, `getAnimeByIdAni:57`); tertiary hardcoded `customSubs`, empty `dubMap:41`, empty `VERIFIED_LICENSES:33`.
- **Server/client boundary:** server by default everywhere except 7 `use client` modules: `admin/subs/page.tsx:1`, `error.tsx:1` (required), `Header.tsx:1` (justified: state+router), `CategoryPills.tsx:1` (questionable: no hooks), `LegalPlatforms.tsx:1` (questionable: pure render, no hooks), `VideoPlayer.tsx:1` (dead), `TrailerPlayer.tsx:1` (justified: YT API/DOM). Client-only APIs (`window/document`, YT IFrame, `fetch /api/youtube/captions:149`) are isolated in TrailerPlayer/admin; no server-action leakage observed.
- **Production:** 4-stage `Dockerfile` (node:22-alpine, non-root `nextjs`, `EXPOSE 1234`, wget+grep healthcheck); single-service `docker-compose.yml` (`webanime-app`, `1234:1234`, `restart: unless-stopped`, mirrored healthcheck); `.github/workflows/deploy.yml` (SSH, dirty-tree abort, image-tag rollback, 30×2s curl health gate) and `ci.yml` (node 22, `npm ci`, lint, `test:run`, build).
- **Tests (P1.2):** 9 files / 120 cases / 7.7s, all passing, deterministic and network-free: anilist 16 (mapping only), platforms 16, dubMap 22, data ~22–26, customSubs 12, env 7, health 6, seo 4, utils 15.

## What P0/P1 Already Solved

- **P0 hardening:** non-root runner (`Dockerfile:27-40`), healthcheck at image AND compose layer, `restart: unless-stopped`, deploy health gate with diagnostics (`deploy.yml:50-87`), dirty-tree deploy abort. Verified present, no action.
- **P1.1 data split:** catalog separated from data-access layer (`7a26281`); boundary intent documented (`src/lib/data.ts:11-14`). Partially adopted (home page still bypasses it — see ARCH-02, a P2 follow-through, not a revert).
- **P1.2 suite + footer:** 120 deterministic tests with explicit determinism assertions (`platforms.test.ts:91-122`, `dubMap.test.ts:120-125`, `data.test.ts:136-140`); health secrecy allowlist (`health.test.ts:28-56`); `searchAnimes("")→all` behavior documented in test, not hidden.
- **P1.3 monitoring:** infallible-by-construction `/api/health` (no throw path, no external calls), `force-dynamic` + `no-store`, dual-layer healthcheck grep contract.
- **P1.4 legal honesty:** empty verified-license set is the correct state (`platforms.ts:33-35`); callers must present results as discovery (`platforms.ts:117-118`). No action.
- **P1.5 dub map:** empty map is correct until verification exists (`dubMap.ts:39-43`); trailer never proves dub (`anilist.ts:126-127`). No action.
- **Graceful degradation everywhere:** all five AniList call sites (search, category, anime, watch, subs route) log and continue on upstream failure. Verified strength, no action.

## Architecture Findings

- **ARCH-01 — `resolveAnime` duplicated verbatim across two routes.** Evidence: `src/app/anime/[slug]/page.tsx:15` vs `src/app/watch/[slug]/[episode]/page.tsx:16` (local + AniList fallback not shared). Impact: timeout/retry fix needs 2 edits; drift risk. Recommendation: extract one `resolveAnime` helper into `src/lib/data.ts` (or `anilist.ts`) and call from both routes. Priority: P2. Suggested milestone: P2.3.
- **ARCH-02 — Home page bypasses the declared data-access boundary (7 inline filters).** Evidence: `src/app/page.tsx:36,38,44,46,56,60-62` vs boundary comment `src/lib/data.ts:11-14` ("import through these helpers, not sort animes[] inline"). Impact: sorting/filter logic leaks into the view. Recommendation: route home selections through `data.ts` selectors (add any missing ones). Priority: P2. Suggested milestone: P2.3.
- **ARCH-03 — Related-items logic duplicated with different slices (6 vs 4).** Evidence: `src/app/anime/[slug]/page.tsx:120` vs `src/app/watch/[slug]/[episode]/page.tsx:55`. Impact: inconsistent UX, no shared helper. Recommendation: single `getRelated(anime, n)` helper with one default. Priority: P3. Suggested milestone: P2.3.
- **ARCH-04 — Triple category source.** Evidence: `categories` (`src/lib/data.ts:9`) vs `CATEGORY_THAI` (`src/lib/anilist.ts:146`) vs `thaiToEn` (`src/app/category/[slug]/page.tsx:14`). Impact: adding a genre needs 3 edits. Recommendation: one canonical genre table + derived Thai/EN views. Priority: P2. Suggested milestone: P2.3.
- **ARCH-05 — HLS config duality: raw vs validated, consumer uses raw.** Evidence: `src/lib/data.ts:5` vs `src/lib/env.ts:54-70` vs `src/components/VideoPlayer.tsx:5,32`. Impact: invalid HLS URL passes through to the player. Recommendation: consume only the validated `getHlsBaseUrl()` path; remove the raw export or mark internal. Priority: P2. Suggested milestone: P2.3.
- **ARCH-06 — Deprecated compat shims with no removal plan.** Evidence: `src/lib/platforms.ts:16,24,144` (API surface ~2x: verified vs available). Impact: caller confusion. Recommendation: annotate with removal version/date or delete if unused. Priority: P3. Suggested milestone: Could do later.
- **ARCH-07 — `TrailerPlayer.tsx` is 625 lines with 5 roles (YT load, captions, custom subs, HLS fallback, theater/controls).** Evidence: `wc -l` + `src/components/TrailerPlayer.tsx:27,149,96`. Impact: hard to review/test; every trailer change risks unrelated behavior. Recommendation: split only when touching it (hooks per concern); do NOT refactor speculatively. Priority: P2. Suggested milestone: Could do later.
- **ARCH-08 — Port/canonical config lives in 4 places.** Evidence: `Dockerfile:24,42,49`, `docker-compose.yml:6,9`, `src/lib/env.ts:10`, `.env.example:3`. Impact: a port change needs 4 edits. Recommendation: single source (env) + derive; document once. Priority: P3. Suggested milestone: Could do later.

## Data Layer Findings

- **DATA-01 — All episode `hlsUrl` values are 3 repeating mux demo streams (100 occurrences).** Evidence: `src/data/animes.ts:3` + `grep -c hlsUrl`=100. Impact: this is not real streaming; every "more episodes/users" scale discussion is moot until a real media source exists. Recommendation: decide the real media supply (licensed embeds vs CDN) before any streaming-scale work; until then treat watch pages as trailer/preview surfaces. Priority: P1. Suggested milestone: P2.1 decision (content, not code).
- **DATA-02 — `toAnime` fabricates views/rating/episodes/dates; SEO JSON-LD derives from synthetic numbers.** Evidence: `src/lib/anilist.ts:103-104,111,129-142`; `ratingCount=views/100` (`src/lib/seo.ts:17`). Impact: structured data asserts facts the site does not have (rich-result eligibility + trust risk). Recommendation: omit `aggregateRating` (and any fabricated fields) from JSON-LD unless sourced; mark synthetic fields clearly or drop them from the mapper output. Priority: P1. Suggested milestone: P2.2.
- **DATA-03 — `searchAnimes` is case-asymmetric; genre branch misses Thai/Latin case-insensitive matches.** Evidence: `src/lib/data.ts:48`. Impact: missed results (e.g. lowercase genre query). Recommendation: normalize case on both sides for all branches (one-line-class fix + test). Priority: P2. Suggested milestone: P2.3.
- **DATA-04 — `trailerDubYoutubeId: ""` shipped ×104; dead field superseded by the dubMap gate.** Evidence: `grep -c 'trailerDubYoutubeId: ""'`=104 vs `src/lib/dubMap.ts:87-91`. Impact: payload noise + false affordance that a dub trailer exists per row. Recommendation: drop the field and rely solely on `resolveTrailerDub`, or document why rows keep it (CMS compat). Priority: P3. Suggested milestone: P2.3.
- **DATA-05 — Static params cover only local slugs + episode 1; live AniList IDs pay cold fetch.** Evidence: `src/app/anime/[slug]/page.tsx:29`, `src/app/watch/[slug]/[episode]/page.tsx:30`, `src/app/sitemap.ts:11-12`. Impact: SEO/latency gap for long-tail (non-local) titles. Recommendation: when long-tail traffic justifies it, extend static params or add ISR to anime/watch routes; NOT now (n=104, no evidence of demand). Priority: P2. Suggested milestone: Could do later.
- **DATA-06 — Slug derivation (`romaji` slice 30) has collision risk; live merge dedups only by id+slug.** Evidence: `src/lib/anilist.ts:107` + `src/app/search/page.tsx:19-24`, `src/app/category/[slug]/page.tsx:45-48`. Impact: two titles sharing a slug dedup incorrectly. Recommendation: harden only if a collision is observed; add a regression test with the colliding pair then. Priority: P3. Suggested milestone: Could do later.
- **DATA-07 — File-based catalog is fine at 104 rows; a database is NOT needed yet.** Evidence: `src/data/animes.ts` 155,129 bytes; `validate-data.mjs` → `Anime count: 104 … VALIDATION PASSED`; ISR-1h live reads (`src/lib/anilist.ts:38`). Impact: introducing a DB now adds ops cost for zero measured benefit. Recommendation: defer DB until writes (subs/history) or catalog >~1k rows / real search demand. Priority: INFO. Suggested milestone: Not needed yet.

## API / Backend Findings

Route inventory (complete — 3 routes): GET `/api/health` (infallible, no-store); POST `/api/subs/auto-generate` (`videoId` regex `^[a-zA-Z0-9_-]{6,20}$` `:12`, `animeId` finite >0 `:20-23`, AniList best-effort with catch-and-continue `:24-33`); GET `/api/youtube/captions?v=` (same ID regex `:7-10`, up to 3 YouTube outbound fetches per inbound, ISR 1h, all-exhausted collapses to `200 {tracks:[], source:"none"}` `:88`).

- **API-01 (✅ fixed in P2.2) — No rate limiting on any route; captions endpoint amplifies 1 inbound → up to 3 YouTube outbound fetches.** Evidence: full read of all 3 route files; no limiter, no `headers()`, no middleware file repo-wide. Impact: videoId enumeration burns egress + compute (full watch-page HTML per unique `v`). Recommendation: per-IP rate limit (at minimum on `/api/youtube/captions`) + cache hits by `v` (already ISR 1h — verify hit rate before adding more). Priority: P2. Suggested milestone: P2.2.
- **API-02 (✅ fixed in P2.2) — No timeout/AbortSignal on any server fetch.** Evidence: `src/lib/anilist.ts:34-39`, `src/app/api/youtube/captions/route.ts:21-27,59-62` — bare `await fetch` with only ISR revalidate. Impact: hung upstream holds server workers; graceful-degrade catches exist but latency is unbounded. Recommendation: add AbortSignal timeouts (e.g. 8–10s AniList, 10–15s YouTube) to the three fetch sites + tests. Priority: P2. Suggested milestone: P2.2.
- **API-03 (✅ fixed in P2.2) — Upstream failure indistinguishable from empty result (captions).** Evidence: `src/app/api/youtube/captions/route.ts:88` returns `200 {tracks:[], source:"none"}` both when timedtext is empty (`:50`) and when all providers fail. Impact: outages invisible to monitoring; player silently falls back. Recommendation: distinct `source` value (e.g. `"error"`) or a 502 on total upstream failure so health/logs can alert. Priority: P3. Suggested milestone: P2.2.
- **API-04 (✅ fixed in P2.2) — Inconsistent response envelopes; `tracks` shape varies by branch (`baseUrl` leaks upstream caption URL on watch-page branch).** Evidence: `src/app/api/health/route.ts:19-28` vs `src/app/api/subs/auto-generate/route.ts:49-54` vs `src/app/api/youtube/captions/route.ts:46,81,88`; `baseUrl` added at `captions/route.ts:79`. Impact: clients must branch; contract drift risk. Recommendation: one track shape (always include `baseUrl` or never), document envelopes; small, safe cleanup. Priority: P3. Suggested milestone: P2.2.
- **API-05 — Watch-page caption regex `"captionTracks":(\[.*?\])` is non-greedy and can truncate nested JSON → JSON.parse throws → swallowed to `source:none`.** Evidence: `src/app/api/youtube/captions/route.ts:65` inside try `:58-86`. Impact: missed captions on markup variants, silently. Recommendation: cover with a fixture test (captured HTML variants) before changing the regex; consider the official captions API if breakage recurs. Priority: P3. Suggested milestone: P2.4 (test) / Could do later (provider switch).
- **API-06 (✅ fixed in P2.2) — POST auto-generate echoes raw `animeId` (`animeId: animeId || null`, `:50-51`); string `"123"` vs number `123` both accepted and echoed.** Impact: type instability for consumers. Low. Recommendation: normalize to number-or-null. Priority: INFO. Suggested milestone: P2.2 (trivial, fold into envelope cleanup).
- **API-07 (✅ fixed in P2.2) — Malformed JSON body masked as validation error (`.catch(()=>({}))`, `:10`).** Impact: observability only; acceptable. Recommendation: log a one-line warn on parse failure. Priority: INFO. Suggested milestone: P2.2 (fold in).
- **API-08 (strength) — Every AniList caller degrades gracefully; category allow-lists + `notFound`; watch enforces `episode==="1"`.** Evidence: `src/app/search/page.tsx:25-27`, `src/app/category/[slug]/page.tsx:50-52`, `src/app/anime/[slug]/page.tsx:23-25`, `src/app/watch/[slug]/[episode]/page.tsx:24-26`, subs route `:31-33`; category `:33`; watch `:49`. No action. Priority: INFO.

## Testing Findings

Suite: 9 files / 120 tests / 7.7s, all passing (verified by lane: `npm run test:run` → 9 files, 120 passed). Deterministic, network-free, with explicit determinism assertions. Gaps are all in the same place: the network boundary and production branches.

- **TEST-01 (✅ fixed in P2.2) — API routes have zero tests (144 lines untested = highest-branch logic in the repo).** Evidence: `src/app/api/youtube/captions/route.ts:1-89` (XML `trackRegex` `:34-42`, scrape + `JSON.parse` `:65-73`), `src/app/api/subs/auto-generate/route.ts:1-55` (validation `:11-14,:19-23`, AniList fallback `:31-33`) vs tests/ listing (no api tests). Impact: regex/parse/external-fetch behavior unverified; `capMatch[1]` JSON.parse can throw uncaught on malformed HTML. Recommendation: route-level tests with mocked fetch + HTML fixtures (valid/empty/malformed). Priority: P2. Suggested milestone: P2.4.
- **TEST-02 (✅ resolved in P2.4: fetcher + timeout contract) — Network fetchers untested; suite covers pure mapping only.** Evidence: `src/lib/anilist.ts:33-61` (`gql` throw paths `:40-42`, `getTopAnime`/`searchAnilist`/`getAnimeByIdAni`) vs `tests/anilist.test.ts:1-166` (`toAnime` only). Impact: retry/timeout/error behavior of all live-data paths unknown. Recommendation: mock-server contract tests for `gql` + the three readers (success/HTTP-error/timeout). Priority: P2. Suggested milestone: P2.4.
- **TEST-03 (✅ resolved in P2.4: prod branches incl. IPv6-loopback fix) — Production env branches untested.** Evidence: `tests/env.test.ts:16-46` never sets `NODE_ENV=production` → `src/lib/env.ts:20-24,33-47` warning/fallback-in-prod paths uncovered. Impact: the exact prod-misconfig story (cf. PROD-01) has no regression net. Recommendation: add `NODE_ENV=production` cases to `env.test.ts`. Priority: P2. Suggested milestone: P2.4.
- **TEST-04 (deferred with pinning tests in P2.4) — `videoJsonLd.uploadDate = now()` is non-deterministic by construction.** Evidence: `src/lib/seo.ts:50`; test asserts only `typeof string` (`tests/seo.test.ts:79`). Impact: unstable SEO date per render; untestable. Recommendation: accept a stable date (publish date or catalog date) instead of `now()`; then assert it. Priority: P3. Suggested milestone: P2.4 (fold into SEO fixes).
- **TEST-05 — Module-level env capture bakes at import; HLS on/off switching untestable without a module-reset harness.** Evidence: `src/lib/env.ts:69-70`, `src/lib/data.ts:5`; episodes hardcode `HLS_DEMO` (`src/data/animes.ts:3`). Recommendation: no new harness until HLS duality (ARCH-05) is resolved; test the resolved shape once. Priority: P3. Suggested milestone: P2.4 (after ARCH-05).
- **TEST-06 — Shared-mutable dubMap fixture (try/finally mitigated).** Evidence: `tests/dubMap.test.ts:80-92,104-110,221-233`. Impact: a mid-assertion throw outside try would pollute; none today; per-file modules keep cross-file parallelism safe. Recommendation: clone-on-import if the file grows; no action now. Priority: P3. Suggested milestone: Could do later.
- **TEST-07 (✅ fixed in P2.2) — Health tests call `GET()` directly; never assert the Docker grep contract (`"status":"ok"` substring on serialized bytes).** Evidence: `tests/health.test.ts:5-8` vs `Dockerfile:46`, `docker-compose.yml:13`. Impact: pretty-printed JSON would pass tests yet break healthchecks. Recommendation: one assertion on the serialized body containing `"status":"ok"`. Priority: P3. Suggested milestone: P2.4.
- **TEST-08 (strength) — No flaky or environment-dependent tests found.** All 120 pass offline in 7.7s. No action. Priority: INFO.

## Production Findings

- **PROD-01 — No `NEXT_PUBLIC_*` wired into compose/build → production bakes `localhost` fallbacks.** Evidence: `docker-compose.yml:7-10` (only NODE_ENV/PORT/HOSTNAME), `Dockerfile:17` (build with no `--build-arg`), `src/lib/env.ts:19-26` (missing → localhost fallback), `src/lib/data.ts:5` (`HLS_BASE` baked at import). Impact: canonical/SEO URLs + HLS mode wrong in the prod container unless rebuilt with env; the runtime prod warning (`env.ts:21-23`) never fires for the client-baked value. Recommendation: pass `NEXT_PUBLIC_SITE_URL` (and `NEXT_PUBLIC_HLS_BASE_URL` when real) as build args in the deploy script + document in `.env.example`; add the TEST-03 regression test. Priority: P1. Suggested milestone: P2.1.
- **PROD-02 — Deploy rollback targets a nonexistent image name (silent no-op).** Evidence: `docker-compose.yml:2-3` (no `image:` → default `webanime-webanime`; `docker compose config` confirms no `image:` key); `deploy.yml:43,91` inspects/tags `webanime:latest`. Impact: the `if` guard silently skips, rollback never restores anything, and a failed deploy exits 1 with the broken container live. Recommendation: set explicit `image: webanime:latest` in compose (or retarget the script to the real name) + a post-rollback health re-gate; test by dry-running the tag/inspect lines. Priority: P1. Suggested milestone: P2.1.
- **PROD-03 — `.env` is not in `.dockerignore` → enters the build context.** Evidence: `.dockerignore:9-12` ignores only `.env.*.local`; `Dockerfile:15` does `COPY . .`. Impact: bounded today (runner `:31-35` does not copy it; only public `NEXT_PUBLIC_*` values exist) but any future secret in `.env` ships into image-layer history. Recommendation: add `.env` (keep `.env.example`) to `.dockerignore`; prefer `env_file`/build-args for real values. Priority: P2. Suggested milestone: P2.1.
- **PROD-04 — No log rotation/limits anywhere.** Evidence: full 17-line `docker-compose.yml` (no `logging:`), no daemon config in repo. Impact: json-file logs grow unbounded → VPS disk-fill risk; deploy diagnostics (`deploy.yml:84-85`) assume logs exist. Recommendation: `logging: {driver: json-file, options: {max-size, max-file}}` in compose. Priority: P2. Suggested milestone: P2.1.
- **PROD-05 — CI never builds the Docker image nor runs the data validator.** Evidence: `.github/workflows/ci.yml:29-39` (lint/test/build only); `scripts/validate-data.mjs:1-9` exists but no npm script wires it (`package.json:5-12`). Impact: Dockerfile breakage and data regressions surface only at deploy time. Recommendation: add `docker build` (no push) + `node scripts/validate-data.mjs` (via an npm script) to CI. Priority: P3. Suggested milestone: P2.1.
- **PROD-06 — Deploy concurrency `cancel-in-progress: true` (`deploy.yml:8-10`) can kill an in-flight `up --build` mid-deploy → half-replaced containers; combined with PROD-02 there is no working rollback.** Recommendation: set `cancel-in-progress: false` for the deploy job (keep concurrency group). Priority: P3. Suggested milestone: P2.1.
- **PROD-07 — Runner ships full `node_modules` including devDeps (`Dockerfile:33`); no `npm prune`/standalone output (acknowledged tradeoff `:16`).** Impact: larger image + wider supply surface. Recommendation: `npm prune --omit=dev` in runner (or adopt `output:standalone`) when image size or audit noise justifies it; measure first. Priority: P3. Suggested milestone: Could do later.
- **PROD-08 (strengths, no action):** healthcheck at both layers; `restart: unless-stopped`; env helper fails loud, not silent; error paths log with prefixes (env, both API routes, all four page fallbacks); deploy health gate + diagnostics. Priority: INFO.

## Performance Findings

Measured baseline: data module 155,129 bytes / 104 anime / ~1,248 episode objects; TrailerPlayer 625 lines (heaviest client module); 8 full-array `.filter` passes on home at n=104 (~832 predicate evals — negligible); ~221 static paths; ISR-1h on all upstream reads. Only measurable/justified concerns are reported.

- **PERF-01 — `CategoryPills` + `LegalPlatforms` are marked `use client` with no hooks (pure renders forced into client JS, on every page via Header/Footer; home renders CategoryPills twice).** Evidence: `src/components/CategoryPills.tsx:1-6`, `src/components/LegalPlatforms.tsx:1`. Impact: needless client JS. Recommendation: convert both to server components (29 + 86 lines). Priority: P2. Suggested milestone: P2.4.
- **PERF-02 — Client import couples the 155KB data module to the client bundle: `CategoryPills.tsx:3` imports `categories` from `@/lib/data`, whose top level imports the full `animes` array.** Evidence: `src/lib/data.ts:1,7,9`. Impact: bundler must prove `animes` tree-shakeable; any future `animes` use in that client file ships ~155KB + 1,248 episode objects to the browser. Recommendation: move `categories` (and genre maps after ARCH-04) into a leaf module with no `animes` import. Priority: P2. Suggested milestone: P2.4 (with PERF-01).
- **PERF-03 — Raw `<img>` bypasses the `next/image` optimizer (no avif/webp/resize, layout-shift risk).** Evidence: `src/components/TrailerPlayer.tsx:475`, `src/components/VideoPlayer.tsx:144` — 2 occurrences repo-wide. Impact: unoptimized thumbnails on the most-viewed surface. Recommendation: `next/image` for the TrailerPlayer thumbnail (VideoPlayer is dead — see MAINT-01). Priority: P2. Suggested milestone: P2.4.
- **PERF-04 — TrailerPlayer fetches `/api/youtube/captions` on every mount + fires an opaque `no-cors` timedtext ping on empty tracks; the route's watch-page fallback scrapes full HTML.** Evidence: `src/components/TrailerPlayer.tsx:149,161`; `src/app/api/youtube/captions/route.ts:59-83`. Impact: 1–3 extra requests per trailer view; heavy upstream fetch per unique `v`/hour. Recommendation: cache caption results client-side per `v` (in-memory map) + confirm ISR hit rate server-side before deeper work. Priority: P2. Suggested milestone: P2.4.
- **PERF-05 — Search does a per-query AniList POST with no dedup/rate-limit; query-string pages defeat static cache.** Evidence: `src/app/search/page.tsx:14-28`, `src/lib/anilist.ts:51-55` (perPage=12 live + local O(104) scan). Impact: one upstream POST per unique `?q=`; concurrent users → latency + AniList 429 risk (failure degrades to local-only, so availability holds). Recommendation: short in-memory/dedupe cache on `searchAnilist` keyed by normalized query; revisit only under real 429s. Priority: P2 (perf) / P1 (scalability note). Suggested milestone: P2.4.
- **PERF-06 — Decorative banner still downloads a full image (`alt=""`, `opacity-20 blur-sm scale-105`).** Evidence: `src/app/watch/[slug]/[episode]/page.tsx:77`. Impact: wasted bytes for a blurred backdrop. Recommendation: small blurred placeholder or CSS gradient; trivial. Priority: P3. Suggested milestone: Could do later.
- **PERF-07 (strengths / non-issues, no action):** home's 8 `.filter` passes negligible at n=104 — do NOT "optimize" (INFO); fonts `display:swap` + Thai/Latin subsets; YT IFrame singleton; `optimizePackageImports: lucide-react`; avif/webp configured; dead `VideoPlayer`/`EpisodeList` currently unbundled (keep it that way — see MAINT-01). Priority: INFO.

## Security Findings

- **SEC-01 — `/admin/subs` editor is public: client component, zero auth, zero middleware repo-wide.** Evidence: `src/app/admin/subs/page.tsx:1`; `ls src/middleware*` → no match; auth/session/cookie grep → 0 hits in src. Impact: LIMITED — no server mutation exists (export is manual clipboard copy `:135` into `customSubs.ts`), so blast radius is exposure of an internal tool, not data corruption. Recommendation: EITHER declare `/admin/*` intentionally public (tooling page) and add `noindex` (see SEO-04), OR gate it when a real auth story exists — do NOT bolt on speculative auth now. Priority: P2 (escalate to P1 only if `/admin` must be access-controlled). Suggested milestone: P2.2 (decision + noindex minimum).
- **SEC-02 — No security headers anywhere.** Evidence: `next.config.ts:1-23` (images + experimental only; no `headers()`, CSP, HSTS, X-Frame-Options, Referrer-Policy). Impact: clickjacking/XSS hardening missing; YT iframe embeds rely on player-API defaults. Recommendation: minimal header set (frame-ancestors/deny where safe, `nosniff`, referrer-policy, HSTS when HTTPS is confirmed on the VPS) + verify the YT embed still loads. Priority: P2. Suggested milestone: P2.2.
- **SEC-03 — JSON-LD `</script>` breakout possible in principle via `dangerouslySetInnerHTML`.** Evidence: `src/app/anime/[slug]/page.tsx:54-55`, `src/app/watch/[slug]/[episode]/page.tsx:72-73` with AniList-sourced title/description; `toAnime` strips tags only from description (`anilist.ts:111`); `JSON.stringify` does not escape `<`. Impact: low exploitability (AniList data, no user-input path) but one-line fix. Recommendation: escape `</` as `<\/` in the serialized JSON-LD. Priority: P3. Suggested milestone: P2.2.
- **SEC-04 — `.env` baked into build image via `COPY . .` (secret-hygiene violation, currently harmless).** Evidence: `.dockerignore:1-17` (no bare `.env` entry), `Dockerfile:15`. Same fix as PROD-03. Priority: P3. Suggested milestone: P2.1.
- **SEC-05 (strengths, no action):** no exposed secret values (secret-pattern grep → 1 benign `queue-microtask` lockfile hit); `.gitignore` covers `.env*`; health endpoint uses an allow-listed key set and forbids secret substrings (`tests/health.test.ts:34-55`); SSRF/user-URL risk NEGATIVE — all user-controlled values interpolated into fetches are regex-validated IDs against fixed hosts, `platforms.ts` uses `encodeURIComponent` on fixed-host search URLs; no `exec/spawn/eval/Function/readFile/writeFile` anywhere; search `q` reflected via escaped JSX; category slug allow-listed; Dockerfile runs non-root; compose exposes only 1234 with no secrets. Priority: INFO.

## SEO / Web Quality Findings

- **SEO-01 — Weak per-page SEO: search has title-only, category has NO metadata (13 genre pages share the layout fallback).** Evidence: `src/app/search/page.tsx:5`; no metadata export in `src/app/category/[slug]/page.tsx`. Impact: thin SERP titles/descriptions for indexable URLs that ARE in the sitemap. Recommendation: per-genre title/description (+ search results template). Priority: P2. Suggested milestone: P2.4.
- **SEO-02 — Canonical covers only `/` (`src/app/layout.tsx:50`); anime/watch/category emit no per-URL canonical.** Impact: `?q=`, Thai-slug encoding variants, trailing-slash dupes. Recommendation: per-page canonicals from the same `getSiteUrl()` source (centralize per MAINT-05 first). Priority: P2. Suggested milestone: P2.4.
- **SEO-03 — VideoObject JSON-LD uses unstable `uploadDate: now()`, hardcoded `duration: PT24M` for a ~92s trailer, and `contentUrl/embedUrl` pointing at the watch page, not media.** Evidence: `src/lib/seo.ts:39-55`. Impact: reduced rich-result eligibility + date churn per render (also TEST-04). Recommendation: stable date, measured-or-omitted duration, media URLs only when real (cf. DATA-01). Priority: P2/P3. Suggested milestone: P2.4.
- **SEO-04 — Admin + API surface crawlable: `/admin/subs` has no `noindex`; `robots.ts` allows `/` with no disallow for `/admin/*` or `/api/*`.** Evidence: `src/app/robots.ts:6`, `src/app/admin/subs/page.tsx:1` (no metadata). Impact: internal tool indexable. Recommendation: `noindex` on admin + `disallow: /admin/, /api/` in robots (minimum viable version of the SEC-01 decision). Priority: P2. Suggested milestone: P2.2.
- **SEO-05 — Layout OG has no `images`/global og:image; per-anime OG hotlinks remote `anime.cover` with no width/height.** Evidence: `src/app/layout.tsx:33-39`. Impact: share unfurls depend entirely on AniList CDN. Recommendation: add a local default og:image + dimensions on per-anime OG. Priority: P3. Suggested milestone: Could do later.
- **SEO-06 (strengths / non-issues):** sitemap correct (~223 URLs: 2 + 104 anime + 104 ep1 + 13 cats), correctly excludes phantom `/2..5` episodes (`sitemap.ts:12-13`); Thai-slug `encodeURIComponent` sitemap; custom 404 with recovery links; error boundary with `reset()`; `lastModified: now()` regenerates per hit — minor "always fresh" signal, acceptable (INFO, no action until crawl stats say otherwise).

## Maintainability Findings

- **MAINT-01 — Dead components with zero imports: `VideoPlayer` (230 lines, pulls hls.js) + `EpisodeList` (38 lines).** Evidence: `grep from.*VideoPlayer|EpisodeList` → exit 1; definitions `src/components/VideoPlayer.tsx:7`, `src/components/EpisodeList.tsx:7`. Impact: 268 unmaintained lines; `hls.js` retained in deps for dead code. Recommendation: delete both (recoverable from git) OR wire them with an owner decision — open question from lanes: watch page currently uses TrailerPlayer only. Priority: P2. Suggested milestone: P2.3 (decision) — ties to DATA-01 media-source decision.
- **MAINT-02 — Unused exports (test-only references): `getLatestEpisodes`, `siteUrl`/`hlsBaseUrl` consts, `applyDubMap`/`getDubEntry`/`shouldShowVerifiedDubBadge`.** Evidence: `src/lib/data.ts:47`, `src/lib/env.ts:69-70`, `src/lib/dubMap.ts:51,113,166` vs usage grep. Impact: API bloat. Recommendation: prune or mark intentionally-public; let the bundler/linter confirm. Priority: P3. Suggested milestone: Could do later.
- **MAINT-03 — Naming triples: `HLS_BASE`/`hlsBaseUrl`/`getHlsBaseUrl`, `categories`/`CATEGORY_THAI`, `LegalPlatform`/`PlatformInfo`.** Evidence: `src/lib/data.ts:5`, `src/lib/env.ts:70`, `src/lib/anilist.ts:146`, `src/lib/platforms.ts:24`. Impact: import confusion. Recommendation: unify names during ARCH-04/ARCH-05 refactors; no standalone rename churn. Priority: P3. Suggested milestone: Could do later.
- **MAINT-04 — Misleading/static claims: footer "Core Web Vitals 90+" badges; home "ISR 1 ชม" with no `revalidate` on `/`.** Evidence: `src/components/Footer.tsx` badges; `src/app/page.tsx:57` (no `revalidate` export while search/category have it). Impact: trust/docs drift. Recommendation: either measure and keep, or remove the badges; add or remove the ISR claim consistently. Priority: P3. Suggested milestone: P2.4.
- **MAINT-05 — `getSiteUrl()` called per-request in 5 modules though the value is env-static.** Evidence: `src/app/layout.tsx:23`, `src/app/sitemap.ts:6`, `src/app/robots.ts:5`, `src/app/anime/[slug]/page.tsx:48`, `src/app/watch/[slug]/[episode]/page.tsx:52`. Impact: minor. Recommendation: centralize to a module const (after PROD-01 wires build-time env). Priority: INFO. Suggested milestone: Could do later.
- **MAINT-06 — `.env` present in repo root (values never read by lanes; key names only).** Reminder to keep it untracked and out of the image (see PROD-03/SEC-04). Priority: INFO.

## Scalability Findings

Headroom verdict: the current architecture reasonably handles **more anime to ~1–2k rows, more users, and more concurrent requests** with only the P2 items below. It does NOT handle **more episodes as real streams** (no media supply — DATA-01) or **heavy AniList-dependent traffic** (per-request upstream POSTs). No database/CMS/auth design is proposed — identify-only per constraints.

- **SCALE-01 — Per-request AniList POSTs are the first real bottleneck (search per query, category per genre/hour, unknown-slug fallback).** Evidence: `src/app/search/page.tsx:14-28`, `src/app/category/[slug]/page.tsx:40-53`, `src/app/anime/[slug]/page.tsx:15-27`, `src/lib/anilist.ts:33-44`. Impact: latency + 429 risk scales with traffic × query entropy. Recommendation: query dedupe cache (PERF-05) + timeouts (API-02) now; extend static params/ISR (DATA-05) only on evidence of long-tail demand. Priority: P1 (note) / P2 (work). Suggested milestone: P2.4.
- **SCALE-02 — Build-time `generateStaticParams` growth (~221 paths today) is the second bottleneck.** Evidence: `src/app/sitemap.ts:11-12` + route params. Impact: linear build-time growth with catalog size; fine to ~1–2k, then needs incremental/static-export strategy. Recommendation: monitor build time in CI (PROD-05 wires the build; record its duration); no action until measured pain. Priority: INFO. Suggested milestone: Not needed yet.
- **SCALE-03 — The 155KB TS data module is evaluated per server import; linear scans trivial to ~1–2k items.** Evidence: `src/data/animes.ts` 155,129 bytes; `searchAnimes` O(n). Impact: none measurable today (PERF-07). Recommendation: no action; the DB trigger is writes or catalog >~1k with real search demand (DATA-07). Priority: INFO. Suggested milestone: Not needed yet.
- **SCALE-04 — Concurrent-request behavior is healthy by construction:** stateless routes, ISR-cached upstream reads, `restart: unless-stopped`, health-gated deploys. The unbounded-latency risk is API-02 (timeouts), not architecture. Priority: INFO.

## Recommended P2 Roadmap

Sequenced by dependency (prod integrity → API hardening → data quality → tested quality/perf/SEO). Do NOT implement yet — this audit proposes; owners dispose.

### P2.1 — Production integrity (Must do)

1. Wire `NEXT_PUBLIC_SITE_URL` (+ HLS base when real) as Docker build args in the deploy path; document in `.env.example` (PROD-01, P1).
2. Fix rollback: set explicit `image: webanime:latest` in compose (or retarget script) + post-rollback health re-gate (PROD-02, P1).
3. Add `.env` to `.dockerignore` (PROD-03/SEC-04, P2/P3).
4. Add compose log rotation (`max-size`/`max-file`) (PROD-04, P2).
5. CI: `docker build` (no push) + `validate-data.mjs` via npm script (PROD-05, P3); set deploy `cancel-in-progress: false` (PROD-06, P3).
6. Decide the real media supply before any streaming-scale work (DATA-01, P1 — content decision, gates MAINT-01).

### P2.2 — API hardening + minimal security/SEO gates (Must do / Should do)

> **P2.2 implementation record (2026-09-04, branch `chore/p2-api-reliability`,
> `GROK VERSION: opencode-fallback`).** The API-reliability slice of this
> milestone is DONE: items 1, 2, and 5 below are implemented, tested
> (175 tests green), and validated (`lint` / `test:run` / `build` /
> `docker compose config` all pass). Items 3, 4, and 6 (`/admin` posture,
> security headers, JSON-LD fixes) are explicitly OUT of scope for this slice
> and remain open. Full detail: "P2.2 — API Reliability & Security Record"
> section below. No PR was created; no merge was performed.

1. [x] Server-fetch timeouts via AbortSignal on all three fetch sites + tests (API-02, P2).
2. [x] Rate limit `/api/youtube/captions` at minimum; verify ISR hit rate (API-01, P2).
3. [ ] Decide `/admin` posture (intentionally public vs gated); minimum: `noindex` + robots disallow `/admin/, /api/` (SEC-01/SEO-04, P2).
4. [ ] Minimal security headers that keep the YT embed working (SEC-02, P2).
5. [x] Response-envelope consistency + single track shape (API-04, P3); normalize `animeId` echo (API-06, INFO); warn-log on malformed JSON (API-07, INFO); distinguish upstream failure from empty captions (API-03, P3).
6. [ ] Escape `</` in JSON-LD serialization (SEC-03, P3); omit fabricated `aggregateRating` from JSON-LD (DATA-01→DATA-02, P1).

### P2.3 — Data-layer + architecture cleanup (Should do)

1. Shared `resolveAnime` helper (ARCH-01, P2); home through `data.ts` selectors (ARCH-02, P2); single genre source (ARCH-04, P2); validated-only HLS config (ARCH-05, P2).
2. `searchAnimes` case normalization + test (DATA-03, P2).
3. Decide: delete vs wire `VideoPlayer`/`EpisodeList` (MAINT-01, P2, gated by P2.1 media decision); drop or justify `trailerDubYoutubeId` (DATA-04, P3); unify related-items helper (ARCH-03, P3).

### P2.4 — Tested quality, performance, SEO (Should do)

1. API route tests with mocked fetch + HTML fixtures (TEST-01, P2); fetcher contract tests incl. timeout (TEST-02, P2); `NODE_ENV=production` env tests (TEST-03, P2); serialized-health-contract assertion (TEST-07, P3).
2. Server-ify `CategoryPills`/`LegalPlatforms` + decouple `categories` leaf module (PERF-01/PERF-02, P2); `next/image` trailer thumbnails (PERF-03, P2); caption client cache (PERF-04, P2); search dedupe cache (PERF-05/SCALE-01, P2).
3. Per-genre + search metadata, per-page canonicals (SEO-01/SEO-02, P2); VideoObject fixes incl. stable date (SEO-03/TEST-04, P2/P3); footer claim verification (MAINT-04, P3).

### Could do later

- TrailerPlayer concern-split on next touch (ARCH-07); platform shim removal plan (ARCH-06); slug-collision hardening on observed collision (DATA-06); long-tail static params/ISR (DATA-05); prod OG image + dimensions (SEO-05); decorative-banner asset trim (PERF-06); `npm prune`/standalone image slimming after measurement (PROD-07); unused-export pruning + naming unification inside other refactors (MAINT-02/MAINT-03); dubMap fixture clone-on-import if the file grows (TEST-06).

### Not needed yet

- Database / CMS / auth system (DATA-07, SCALE-02/03 — triggers defined: writes, catalog >~1k, measured build/search pain).
- Blue/green deploys, CDN migration (no real streams — DATA-01), official YouTube captions API migration (until scrape breaks twice).
- Any speculative security mechanism beyond P2.2 headers/noindex (posture verified good: SEC-05).

---

## P2.2 — API Reliability & Security Record (implemented 2026-09-04)

Branch: `chore/p2-api-reliability`. Scope: the 11 P2.2 sub-tasks (route
inventory, fetch timeouts, rate limiting, captions failure semantics, response
contract, input validation, malformed-JSON observability, API-layer security
review, deterministic tests, docs, validation). SEC-01/SEC-02/SEC-03,
DATA-02, and API-05 regex work remain open (see checkboxes above).

### 1. Routes audited (complete — 3 routes, matches the audit inventory)

- `GET /api/health` (`src/app/api/health/route.ts`) — infallible, no external
  calls, no secrets; intentionally NOT rate limited (Docker healthchecks).
- `POST /api/subs/auto-generate` (`src/app/api/subs/auto-generate/route.ts`) —
  `videoId` regex + numeric `animeId`, best-effort AniList enrichment.
- `GET /api/youtube/captions?v=` (`src/app/api/youtube/captions/route.ts`) —
  1 inbound request fans out to up to 3 YouTube outbound fetches (2 timedtext
  hosts + 1 watch-page scrape), ISR 1h.
- External fetch sites found: AniList GraphQL (`src/lib/anilist.ts:34`);
  timedtext list ×2 + watch page (`captions/route.ts`). All now go through
  `fetchWithTimeout`. The client-side `no-cors` timedtext ping in
  `TrailerPlayer.tsx:161` is a browser fire-and-forget probe, not a server
  dependency — left untouched.

### 2. Timeouts (API-02 ✅, TEST-02 partial ✅)

New `src/lib/fetch-timeout.ts`: `fetchWithTimeout(url, init, ms)` with
AbortSignal, `UpstreamTimeoutError`, and a one-line server log carrying host +
budget only (no secrets, no stack, no body). Centralized budgets
`FETCH_TIMEOUTS_MS = { anilist: 9000, youtubeTimedtext: 10000, youtubeWatch: 12000 }`
— inside the audit's 8–10s AniList / 10–15s YouTube bands (AniList p95 ~1–3s,
9s bounds worker hold with headroom; watch-page HTML is the largest payload
so it gets the largest budget). `gql()` in `anilist.ts` uses the AniList
budget, so page-level callers (search/category/anime/watch) inherit it; both
API routes use the YouTube budgets. Best-effort callers catch and degrade as
before, now with bounded latency.

### 3. Rate limiting (API-01 ✅)

New `src/lib/rate-limit.ts` (in-memory only, no Redis): per-IP fairness bucket
+ global backstop bucket on captions (30/60s per IP, 300/60s global) and
auto-generate (20/60s per IP, 200/60s global); 429 + numeric `Retry-After`.
Client ID = first syntactically valid IP token in `X-Forwarded-For`, else a
shared `direct` bucket; only the derived key is stored (no raw header, no
excess PII). Map is bounded (2000 keys) with lazy expiry + oldest-first
eviction. `/api/health` is never limited.

> "Rate limiting is in-memory, single-container only — it is NOT distributed,
> does not survive restarts, and must not be relied on across replicas. The
> per-IP bucket is best-effort fairness (X-Forwarded-For is client-controlled
> with no trusted proxy in front); the global bucket is the real backstop
> against upstream amplification."

### 4. Captions failure semantics (API-03 ✅) + contract (API-04 ✅)

`source` is now an enum — `timedtext | watch | none | error` — instead of the
raw upstream URL (previously the timedtext branch echoed the full provider
URL). `none` (upstream affirmatively reports no captions, HTTP 200) is now
distinguishable from `error` (all providers failed → HTTP 502 with
`tracks: []` + `error: { code: "upstream_error" }`). Malformed watch-page
caption JSON counts as failure, never as empty (old code swallowed it to
`source: "none"`). Track shape is a single
`{ lang, name, kind, isAuto }` — `baseUrl` (upstream caption URL) is no longer
leaked on the watch branch. TrailerPlayer was audited first: it reads
`j.tracks || []` and treats any non-200 the same as empty, and the 502 body
still carries `tracks: []`, so **no consumer change was required**.

### 5. auto-generate contract (API-06 ✅, API-07 ✅)

- `animeId` echo normalized to number-or-null (`"21"` → `21`, absent → `null`,
  floats floored to the AniList Int contract, `0`/`-3`/`NaN`/`Infinity`/
  non-safe-integers/wrong types → 400 `invalid_anime_id`).
- Malformed JSON bodies still return 400 (now `malformed_json`, still 4xx-safe
  for clients) and emit a one-line `console.warn` without logging body content
  or parser detail.
- All 4xx/429 bodies share `{ error: { code, message } }`; oversized bodies
  (>32KB `content-length`) get 413. Unexpected extra fields/query params are
  ignored (no overvalidation).

### 6. Security review (API-layer, code-supported only)

- SSRF: NEGATIVE — `v`/`videoId` are regex-validated
  (`^[a-zA-Z0-9_-]{6,20}$`) and interpolated only into fixed YouTube hosts;
  AniList posts to one fixed host. No user-controlled upstream URLs, no
  `exec/spawn/eval/Function`, no `fs` access in the API layer.
- Header injection: NEGATIVE — the only user-influenced response header is
  numeric `Retry-After`; no user data is reflected into headers.
- Oversized: watch-page buffers are guarded by a 2MB `content-length`
  pre-check (failure, not crash); auto-generate bodies capped at 32KB with 413.
  Redirects follow `fetch` defaults to same-ecosystem hosts only; no open
  redirect surface (no `Location` derived from input).
- Secrets/logging: no secrets in the API layer; all new error logs are
  one-line `name`-only (no stacks, no HTML bodies, no request payloads).
- No speculative vulns claimed; SEC-01/SEC-02/SEC-03 fixes are out of scope
  for this slice (see open checkboxes above).

### 7. Tests (TEST-01 ✅, TEST-02 partial ✅, TEST-07 ✅)

36 new deterministic cases, all network-mocked (`vi.stubGlobal(fetch)`), no
real AniList/YouTube/VPS traffic, no sleep-flaky waits (timeout tests use a
never-resolving mock + 25ms real budget; limiter tests inject `now`):
`tests/api-timeout.test.ts` (6: abort→`UpstreamTimeoutError`, host/budget
fields, success passthrough, error passthrough, budget-band assertion),
`tests/api-ratelimit.test.ts` (8: allow/deny/`Retry-After`, window reset, key
independence, bounded eviction, expiry purge, XFF parsing incl. garbage/IPv6),
`tests/api-captions.test.ts` (13: invalid/oversized/extra-param inputs,
timedtext OK + exact track shape + no `baseUrl`, watch OK + stripped `baseUrl`,
`none` ×2, 502 on all-fail/throw/timeout (no stack/HTML leak), malformed watch
JSON → 502, 429 + `Retry-After`, under-limit allow),
`tests/api-autogenerate.test.ts` (9: valid + numeric echo, no-animeId skips
fetch, bad videoId/animeId matrices, malformed JSON + warn, AniList
HTTP-fail/throw fallback, 413, 429). `tests/health.test.ts` gains the
serialized `"status":"ok"` grep-contract assertion (TEST-07). Suite: 14 files /
175 tests, all passing offline.

---

*Validation appendix: `npm run lint`, `npm run test:run`, `npm run build`, `docker compose config` — results in the session record. No application behavior was modified for this audit; the only tree additions are `docs/LEDGER.md` and this report.*

---

## P2.3 — Architecture & Data Boundary Cleanup Record (implemented 2026-09-04)

Branch: `chore/p2-architecture-data-cleanup` (branched from working tree carrying
uncommitted P2.2 `chore/p2-api-reliability` work — no stash/reset, no loss).
Scope: ARCH-01/02/03/04/05 + DATA-03 + DATA-04 verdict; audits only for
ARCH-06/07/08 + DATA-05/06/07 + VideoPlayer/EpisodeList dead-code decision.
TrailerPlayer (625 lines) untouched. Port 1234 unchanged. Catalog unchanged
(104 records). No database/CMS/auth/Redis/microservices/K8s/new APIs.
`GROK VERSION: opencode-fallback` (grok CLI missing; implemented directly).

### 1. Resolved

- **ARCH-01 ✅ — shared `resolveAnime`.** New `src/lib/resolve-anime.ts`
  (`resolveAnime(slug, logTag)`): local-first, numeric-prefix AniList fallback,
  non-numeric/≤0 → null without fetch, throw → log + null. Both routes keep
  thin wrappers preserving `[anime]`/`[watch]` log prefixes, return types, SEO
  (`generateMetadata` null → `{}`), and `notFound()` flow. Callers keep their
  counts; no behavior change.
- **ARCH-02 ✅ — home through `data.ts` selectors.** New `getWatchableAnimes`,
  `getUpcomingAnimes`, `getAnimesByStatus`, `selectHomeSections` in
  `src/lib/data.ts`; `src/app/page.tsx` no longer filters `animes[]` inline.
  Old-vs-new equivalence asserted in tests (same ids, same order, same counts).
- **ARCH-03 ✅ — single `getRelated(anime, count)`.** Catalog order excluding
  current, deterministic, `Math.max(0, floor(count))` guard. Anime page keeps 6,
  watch page keeps 4 (never forced). Fewer-available/0/negative covered.
- **ARCH-04 ✅ — one canonical genre table.** New `src/lib/genres.ts`
  (`categories` tuple + `GENRE_TABLE` + `thaiToAnilistGenre` +
  `getAnilistGenreForThai`/`isValidCategory`/`categoryUrl`/`CATEGORY_THAI`).
  `src/lib/data.ts` re-exports `categories`; `src/lib/anilist.ts` re-exports
  `categories as CATEGORY_THAI`; `src/app/category/[slug]/page.tsx` drops its
  local `thaiToEn` copy. Exactly the pre-existing 13 Thai labels + 12 mappings;
  no removals/inventions. The richer `genreMap` in `anilist.ts` (live EN→TH for
  `toAnime`, incl. Mystery/Mecha/etc.) stays separate by design.
- **ARCH-05 ✅ — validated-only HLS config.** New `resolveHlsUrl()` +
  `HLS_DEMO_FALLBACK_URL` in `src/lib/env.ts` (pure, same precedence:
  validated base + slug/episode → per-episode → demo; invalid base falls
  through, never builds a broken URL). `VideoPlayer.tsx` now uses
  `getHlsBaseUrl()` + `resolveHlsUrl()`; raw `HLS_BASE` in `data.ts` kept only
  as `@deprecated` (zero consumers in `src/`). No secret exposure.
- **DATA-03 ✅ — search case normalization.** `searchAnimes` genre branch now
  `g.toLowerCase().includes(lower)` (was `g.includes(q)`). Title branches were
  already lowercased. Regression tests: `ecchi/Ecchi/ECCHI`,
  `psychological` variants, mixed-case titles.
- **DATA-04 ✅ — `trailerDubYoutubeId` verdict: KEEP with reason (not removed).**
  All 104 rows keep `""`; no IDs invented. Type field marked `@deprecated`,
  gate stays `resolveTrailerDub` (ignores the row field; empty map =
  unverified). Removal condition documented (CMS/serialization check first).

### 2. Audited, explicitly DEFERRED (not resolved, not claimed)

- **ARCH-06 (deferred) — platform compat shims kept.** `available`,
  `searchUrl()`, `LegalPlatform` alias, `getAvailablePlatforms()` all have zero
  `src/` consumers outside their definitions (only tests assert
  `available === verified`, `searchUrl() === url`, alias equality).
  Verdict per shim + removal condition documented in `platforms.ts` header.
  No deletion in this slice (would break the test contract for zero benefit).
- **ARCH-07 (deferred) — TrailerPlayer untouched.** 625-line file not
  rewritten/split; P2.3 required no touch to its sections. Split only on next
  genuine touch (hooks per concern).
- **ARCH-08 (deferred) — port/canonical config unchanged.** Port 1234,
  `Dockerfile`/`compose`/`env.ts`/`.env.example` mapping left as-is; no safe
  low-risk single-source win in this slice. Documented as deferred debt.
- **VideoPlayer/EpisodeList dead-code (deferred, gated by media decision).**
  Both still have zero route imports. Not deleted/wired in P2.3: the correct
  action depends on the DATA-01 real-media-supply decision (licensed embeds vs
  CDN). `VideoPlayer` received only the validated-HLS consumer fix, no redesign.
- **DATA-05/06/07 (deferred, no change).** No ISR expansion for long-tail slugs,
  no slug-collision redesign (no observed collision), no database/CMS migration
  (104 rows, file catalog still correct).

### 3. Tests (27 new, deterministic, network-free)

`tests/p23-architecture.test.ts` (27: catalog 104 invariant; resolveAnime local
hit without fetch / numeric fallback with mocked fetch / non-numeric+empty+zero
without fetch / throw + non-ok → null with log; home old-vs-new equivalence +
bundle; related exclusion/determinism/6-vs-4/fewer/0-negative; canonical 13
labels + 12 mappings + slugs/URLs + unknown handling; search ecchi +
psychological + Thai/title case matrices; HLS precedence + invalid-base
fall-through + per-episode + demo fallback; shims alias equality; dub keep
verdict + gate-ignores-field). Suite: 15 files / 202 tests, all passing offline.
No real AniList/YouTube/VPS/network (`vi.stubGlobal(fetch)` only).

### 4. Validation (raw)

- `npm run lint` → pass (no output, exit 0).
- `npm run test:run` → 15 files / 202 tests passed (~8s).
- `npm run build` → pass (230 static pages; only expected localhost-baked
  `[env]` warnings for unset prod origin in local build).
- `docker compose config` → exit 0 (renders `webanime:latest`, `1234:1234`).
- `docker build -t webanime:p2.3-validate .` → success
  (`writing image sha256:a146… done`, `naming to docker.io/library/webanime:p2.3-validate done`).
- Catalog: `grep -c 'trailerDubYoutubeId: ""'` = 104 before and after;
  `grep -c 'slug:'` = 104. No metadata/episodes/URLs/dub invented.
- Behavior preservation: home sections, anime detail, watch (ep 1 only, else
  404), category, search, AniList fallback, related counts (6 vs 4), HLS
  precedence, platform discovery, dub gate — all preserved (equivalence tests +
  full suite green). TrailerPlayer, Dockerfile port, compose port, `.env.example`,
  `src/data/animes.ts` untouched by P2.3.
- Git safety: branch `chore/p2-architecture-data-cleanup` only. NO PR created.
  NO merge performed. No commit/push to main; no force-push; production VPS untouched.

---

## P2.4 — API + Network Test Coverage Record (implemented 2026-09-04)

Branch: `chore/p2-api-network-tests` (branched from working tree carrying
uncommitted P2.1–P2.3 work — no stash/reset, no loss; no commit, no push, no PR).
Scope: TEST-02/TEST-03 resolved, TEST-04 deferred-with-pinning, plus route,
contract, regression, and determinism coverage. No API redesign, no new
infrastructure, no new production dependencies.
`GROK VERSION: opencode-fallback` (grok CLI missing; implemented directly).

Route inventory (verified by glob + build output — exactly 3, no assumption):
`GET /api/health`, `POST /api/subs/auto-generate`, `GET /api/youtube/captions`.
Every route has route-level tests.

### 1. Resolved

- **TEST-02 ✅ — fetcher contract tests.** New
  `tests/api-anilist-fetchers.test.ts` (12): the REAL `getTopAnime` /
  `searchAnilist` / `getAnimeByIdAni` with the network boundary (global fetch)
  mocked per-test — success (+POST-to-AniList assertion), HTTP failure,
  GraphQL `errors` field, network rejection unwrapped, `UpstreamTimeoutError`
  propagation, blank-search short-circuit (no fetch), malformed payload
  rejection. No implementation copied into tests.
- **TEST-03 ✅ — production env branches.** New `tests/api-env-prod.test.ts`
  (11): prod garbage/unsupported-protocol → loud fallback; prod loopback
  `127.0.0.1`/`0.0.0.0`/`[::1]` flagged; non-prod invalid stays quiet; HLS
  invalid warns loudly + whitespace trim; `isProductionPublicConfigValid`
  false for garbage prod URLs. `process.env` saved/restored per test; no
  machine-`.env` dependence.
- **TEST-01 hardening ✅ — route edge variants.** New
  `tests/api-captions-extended.test.ts` (10): second-timedtext-host fallback,
  unrecognized-XML fall-through, short-body failure, watch malformed-entry
  filtering, valid-JSON-wrong-shape → 200 none (documents the regex-gated
  changed-markup semantics), oversized watch pre-check, watch 404 → stable
  502 contract, raw `AbortError` → 502 without leak, global-bucket 429 +
  `Retry-After`, health never rate-limited. New
  `tests/api-autogenerate-extended.test.ts` (9): empty body, extra-field
  tolerance, videoId trim, timeout/GraphQL-errors/malformed-JSON/upstream-429
  → 200 fallback (upstream 429 never propagates as our 429), deterministic
  cue geometry (4 cues, `i*5`/`i*5+4.5`) + stable envelope keys + repeat-call
  byte equality, no-leak assertions incl. one-line numeric-id server log.
- **Contract units ✅.** New `tests/api-contract.test.ts` (10):
  `VIDEO_ID_RE` boundaries, `normalizeVideoId` types/trim, `parseAnimeId`
  absent→null / floor-to-Int / full rejection matrix, `errorBody` envelope
  exactness.
- **P2.1/P2.2/P2.3 regression ✅ (no duplication).** New
  `tests/api-p24-regression.test.ts` (8): health version/commit branches
  (APP_VERSION vs sha, dedup rule, `0.1.0` default); captions validates
  BEFORE rate-limit (bad input → 400 even with exhausted buckets);
  auto-generate global-bucket 429; shared envelope exactness across both
  routes; resolver `UpstreamTimeoutError` → null, default log tag,
  null-Media → null silently.

### 2. Prod code changes (one minimal fix + why)

- **`src/lib/env.ts` — IPv6-loopback normalization (bug fix, not redesign).**
  P2.4 tests proved `http://[::1]:1234` slipped both prod checks: WHATWG URL
  keeps brackets in `hostname` (`"[::1]"`) while the loopback set stores bare
  `"::1"`, so an IPv6-loopback bake was neither flagged nor reported
  production-unready. Added pure `isLoopbackHostname()` (bracket-strip +
  lowercase) used by both `isPublicOriginProductionReady` and `getSiteUrl`.
  Zero behavior change for every previously-handled input; no DI, no rewrite.

### 3. Deferred, explicitly (not resolved, not claimed)

- **TEST-04 (deferred) — `videoJsonLd.uploadDate = now()`.** Freezing it would
  invent a publication date the product does not have (catalog has no per-row
  dates; DATA-01 media reality gap owns that decision). Pinned instead by
  `tests/api-seo-determinism.test.ts` (3): all other fields byte-identical
  across calls, `uploadDate` always valid ISO-8601, no dates in episode URLs.
  Resolve when the product decides a real date source.
- **TEST-05 (still deferred) — module-level env capture / HLS duality harness.**
  Unchanged from audit; ARCH-05 `resolveHlsUrl` precedence already covered.
- **TEST-06 (no action) — dubMap fixture.** Unchanged; no growth observed.
- **Coverage:** 22 files / 265 tests passing, all deterministic and
  network-free. No 100% claim (unmeasured; no heavy coverage system added per
  constraints). Known-remaining gaps: TrailerPlayer caption-consumer E2E (needs
  a browser, out of scope), multi-replica rate-limit (single-container by
  design), long-tail ISR/DB decisions (DATA-05/07 owners).

### 4. Validation (raw)

- `npm run lint` → pass (exit 0, no output after unused-var fix).
- `npm run test:run` → 22 files / 265 tests passed, run TWICE with identical
  counts (06:36, 06:37 UTC) confirming determinism/isolation.
- `npm run build` → pass (all 3 API routes in route table; one TS error found
  and fixed during the lane: test-only `as [string, RequestInit]` cast needed
  `as unknown` first).
- `docker compose config` → exit 0 (renders `webanime:latest`, `1234:1234`).
- `docker build -t webanime:p24-test .` → success
  (`writing image sha256:5eef3c… done`, `naming to docker.io/library/webanime:p24-test done`).
- Git safety: branch `chore/p2-api-network-tests` only. NO PR created.
  NO merge performed. No commit/push to main; no force-push; production VPS untouched.

---

## P2.5 — SEO + Data Integrity Record (implemented 2026-09-04)

Branch: `chore/p2-seo-data-integrity` (already checked out; stayed on it —
no stash/reset, no loss; no commit, no push, no PR, no merge).
Scope: all 19 P2.5 tasks — audit every SEO output with a FIELD→SOURCE→TRUST
map, remove fabricated/inferred structured data (never invent replacements),
fix non-deterministic dates, add deterministic regression tests.
`GROK VERSION: opencode-fallback` (grok CLI missing; implemented directly).
TrailerPlayer untouched (read-only check). No catalog expansion, no scraping,
no migration/CMS/analytics, no data-architecture or slug-system redesign, no
large SEO framework (existing `src/lib/seo.ts` approach reused).

### 1. Audited files (SEO output surface)

`src/lib/seo.ts` (3 JSON-LD builders), `src/app/anime/[slug]/page.tsx`
(`generateMetadata` + TVSeries/Breadcrumb JSON-LD), `src/app/watch/[slug]/[episode]/page.tsx`
(`generateMetadata` + VideoObject/Breadcrumb JSON-LD), `src/app/category/[slug]/page.tsx`
(no metadata at all), `src/app/search/page.tsx` (static title only, no
entity/JSON-LD), `src/app/layout.tsx` (site metadata + `canonical: "/"`),
`sitemap.ts`, `robots.ts`, `src/lib/anilist.ts` (`toAnime` mapper),
`src/lib/data.ts` + `src/data/animes.ts` (104 rows), `src/lib/env.ts`
(P2.1 origin config), `src/lib/resolve-anime.ts`, `src/lib/genres.ts`,
`src/components/VideoPlayer.tsx` (read-only: validated-HLS consumer, no SEO
role — no change).

### 2. Fabricated / inferred fields found → removed or corrected

| # | field (where) | verdict | action |
|---|---|---|---|
| 1 | `videoJsonLd.uploadDate = now()` (`seo.ts:50`) | non-deterministic + invented | REMOVED (resolves P2.4 TEST-04 deferral — omission, not freezing) |
| 2 | `aggregateRating.ratingCount = floor(views/100)` (`seo.ts:17`) | FABRICATED (views are static editorial numbers / `toAnime` estimates, not measured) | whole `aggregateRating` REMOVED (bare `ratingValue` without a count still misleads) |
| 3 | `datePublished = ${year}-01-01` (`seo.ts:21`) | FABRICATED month/day | REMOVED (year-only truth retained in page content, not in schema) |
| 4 | `numberOfSeasons: 1` (`seo.ts:12`) | hardcoded guess (false for long series) | REMOVED |
| 5 | `videoJsonLd.duration = "PT24M"` (`seo.ts:51`) | hardcoded, contradicted watch page (`"01:32"` trailer) | REMOVED |
| 6 | `sitemap lastModified = now()` (`sitemap.ts:7`) | non-deterministic + untrustworthy (claimed every URL changed at build) | REMOVED (entries carry no `lastModified`; valid per spec) |
| 7 | layout `canonical: "/"` inherited by entity pages | every anime/watch page canonicalized to the homepage | CORRECTED — absolute per-page canonicals added (anime, watch, category) |
| 8 | category pages: no metadata at all | title/canonical fell back to layout defaults | CORRECTED — minimal same-entity `generateMetadata` added |
| 9 | `toAnime` defaults (`views` formula, `score→8.0`, `year→2024`, `episodes→12`, `genres→["แอคชั่น"]`, `updatedAt` fake dates, `views - i*17000`) | FABRICATED/INFERENCE at the data layer | DOCUMENTED in TRUST map + code header; no longer reach JSON-LD (consumers removed). Data-layer values left untouched (true values unknown; never invent). |
| 10 | unreleased rows (ids 178788/171627/153800/172463): `rating 8.8`, `views ~6M`, `episodesTotal 1` | placeholder (unmeasurable pre-release) | DOCUMENTED (guard D1); excluded from structured data by removals above |

Kept (DIRECT or SAFE-TRANSFORM): TVSeries name/alternateName (deduped, blanks
dropped)/description/image/genre/`numberOfEpisodes` (build-time snapshot —
STALE, may drift from live AniList)/`productionCompany` (omitted when
empty/`"Unknown"`)/absolute url; VideoObject name/description/thumbnailUrl
(omitted unless absolute)/contentUrl/embedUrl; BreadcrumbList; robots
(prod-host sitemap URL). `numberOfEpisodes` vs local demo-list mismatch
(65/104) is by design — the 12-row demo lists are placeholders, not totals;
guard pins `episodes.length <= episodesTotal` (0 violations) and unreleased →
`[]`. Intentional rich-result tradeoff: eligibility sacrificed for
truthfulness; re-add fields only with real sources (vote counts, per-title
dates, runtimes, season counts).

### 3. Canonical / JSON-LD / sitemap-robots results

- Canonical: new `buildCanonicalUrl(origin, path)` (`seo.ts`) — absolute, no
  dup slashes, no query/hash, path encoded; anime/watch/category
  `generateMetadata` emit it (overriding layout `"/"`). Search keeps the
  layout default (no entity, no JSON-LD — documented, not expanded).
- JSON-LD: valid `@context/@type`, absolute URLs where schema requires,
  `JSON.parse(JSON.stringify(ld))` round-trip asserted (no
  undefined/NaN/invalid dates). No `localhost` in code paths; prod host flows
  from `getSiteUrl()` (P2.1 config).
- Sitemap: deterministic (byte-identical across calls), `2 + 104×2 + 13 = 223`
  entries — `/`, `/search`, local anime + watch`/1` only (never /2..5), 13
  canonical categories. No API/internal/admin, no dup, no query, no invented
  slugs. Robots sitemap URL absolute on the configured host.

### 4. Tests (19 new + 2 rewritten, deterministic, network-free)

- Rewritten `tests/seo.test.ts` (honest contract: omission assertions, dedupe,
  placeholder-studio, round-trip, canonical builder) and
  `tests/api-seo-determinism.test.ts` (full byte-equality, no `uploadDate` key).
- New `tests/api-seo-sitemap.test.ts` (9): sitemap determinism + prod host +
  exact public-route scope + no `lastModified`; robots absolute; canonical ↔
  sitemap agreement (prod host pinned via save/restore, no machine-.env dependence).
- New `tests/api-data-quality-guard.test.ts` (6): unique ids/slugs, no empty
  fields, slug shape with ONE documented legacy exception
  (`112151-kimetsu-no-yaiba-mugen-ressha-`, trailing `-`; URL frozen),
  year/episodesTotal/rating/views ranges, `episodes.length <= episodesTotal`,
  unreleased → `[]`, absolute cover/banner/thumbnail/HLS, trailer-id shape.
- Suite: 22 files / 265 tests → **24 files / 284 tests**, all passing offline.
  SEO/data-integrity files (4 files / 26 tests) run **3× with identical counts**.

### 5. Validation (raw)

- `npm run lint` → pass (exit 0, no output).
- `npm run test:run` → 24 files / 284 tests passed (baseline before: 22/265).
- SEO focus ×3 → 4 files / 26 tests passed each run.
- `npm run build` → pass (104 anime + 104 watch/1 + 13 category static paths;
  only expected localhost-baked `[env]` warnings for unset prod origin in local build).
- `docker compose config` → exit 0. `docker build -t webanime:p25-seo-check .` →
  success (`writing image sha256:0fc0663e… done`).
- Grep proof: no `new Date()`/`Date.now()` in `seo.ts`/`sitemap.ts`/`robots.ts`
  code; no `viewCount`/`interactionCount`/`watchCount`/`playCount`/`ratingCount`
  in `src/` (outside documenting comments); no `localhost` in SEO URL code
  paths. Compose still bakes `NEXT_PUBLIC_SITE_URL=http://localhost:1234` —
  pre-existing P1-a, unchanged by P2.5 (no Docker behavior change); all SEO
  URLs derive from `getSiteUrl()`, so they inherit the P1-a fix automatically.
- Git safety: branch `chore/p2-seo-data-integrity` only. NO PR created.
  NO merge performed. No commit/push of any kind; no force-push; NO production
  VPS was modified. P2.6 NOT started.

### 6. Deferred, explicitly (not resolved, not claimed)

- **Slug-collision redesign** (one slug→one anime holds today: 104 unique; the
  trailing-`-` legacy slug + `toAnime` `slice(0,30)` truncation risk stay
  documented, never breaking existing URLs).
- **ISR/static-params long-tail + DB/CMS migration** (file catalog still
  correct at 104 rows; live AniList extras intentionally excluded from sitemap).
- **Catalog expansion, real media supply (DATA-01), unreleased-row
  placeholders (D1), demo HLS/episode metadata (D3)** — content reality gaps,
  product decisions required.
- **P1-a localhost bake + rollback no-op** — owned by production-integrity work.
- **Search-page entity metadata** — no entity/JSON-LD there by design.

---

## P2.6 — Performance + Scalability Record (implemented 2026-09-04)

Branch: `chore/p2-performance-scalability` (branched from dirty
`chore/p2-seo-data-integrity` working tree via `git checkout -b` — carries
uncommitted changes, no stash/reset/commit). No database/Redis/K8s/CMS/queue/
CDN/microservices. No new external deps. TrailerPlayer/VideoPlayer/catalog/UI
not rewritten. No server→client conversions. AniList graceful degradation kept.
No ISR/revalidate/cache-semantic changes. Port 1234, non-root, healthcheck,
prod startup, P2.1 rollback all preserved.
`GROK VERSION: opencode-fallback` (grok CLI missing; implemented directly).
ROUTING: class=standard; phases=explore,implement,verify;
reason=small evidence-backed slice, no external research needed, no device
(no visible-UI acceptance change), self-critic lens applied instead of fan-out.

### 1. Baseline (measured, pre-change — no invented numbers)

- `npm run lint` → pass (exit 0). `npm run test:run` → 24 files / 284 tests
  passed, 14.43s. `npm run build` → 12s wall, 230/230 static pages.
- Route table (build output, identical pre/post): `○ /`, `○ /_not-found`,
  `○ /admin/subs`, `● /anime/[slug]` ×104 SSG, `ƒ` 3 dynamic APIs
  (`/api/health`, `/api/subs/auto-generate`, `/api/youtube/captions`),
  `● /category/[slug]` ×13 SSG, `○ /robots.txt`, `ƒ /search` (dynamic),
  `○ /sitemap.xml`, `● /watch/[slug]/[episode]` ×104 SSG (episode 1 only).
  Static-gen 5.6s pre / 5.8s post (noise). Only warnings: pre-existing P1-a
  localhost-baked `[env]` lines for unset prod origin in local build.
- Bundle/client-payload notes: fonts already optimal (`next/font/google`
  Kanit+Outfit, `display:swap`, `src/app/layout.tsx:8-20`); images already
  `next/image` with `sizes` (+`priority` on hero/anime banner) in
  `AnimeCard`/`Hero`/anime/watch pages; `optimizePackageImports:
  ["lucide-react"]` already set. Client JS shipped unnecessarily: only
  `CategoryPills` + `LegalPlatforms` (`"use client"` with zero hooks — fixed
  below). `VideoPlayer` (233 lines) + `EpisodeList` still zero-route-import
  dead code (unchanged, see deferred).
- Large files: `src/data/animes.ts` 155,129 B (104 records, static import);
  `src/components/TrailerPlayer.tsx` 625 lines / 32K; `public/` 20K (5 svg).
- External calls (all bounded pre-change): AniList GraphQL 9s timeout + ISR
  1h (`fetch-timeout.ts:18-25`, `anilist.ts:43`); captions timedtext 10s ×2
  hosts + watch scrape 12s + 2MB `content-length` pre-check
  (`captions/route.ts`, `MAX_WATCH_BYTES`); rate limits captions 30/min/IP +
  300 global, autogen 20 + 200 (`rate-limit.ts:35-40`, bounded 2000 buckets).
- Docker notes: 4-stage `node:22-alpine`, non-root `nextjs`, port 1234,
  wget+grep healthcheck; `.dockerignore` already excludes `node_modules`,
  `.next`, `.git`, env locals, logs.

### 2. Bottlenecks (evidence-ranked; only cheap ones fixed)

1. (fixed) Client caption fan-out: `TrailerPlayer` caption effect deps
   `[activeId, playing]` re-fetched `/api/youtube/captions` on every
   play/pause toggle (each fanning to ≤3 YouTube upstream fetches), plus a
   fire-and-forget no-cors timedtext fetch with discarded opaque response.
2. (fixed) No route-level captions result cache: identical `?v=` repeats
   re-ran all upstream providers (only Next fetch-cache + rate limiter stood
   in the way).
3. (fixed) Pure components shipped as client JS: `CategoryPills`,
   `LegalPlatforms` marked `"use client"` with no hooks/browser APIs.
4. (fixed, hygiene) Home page fanned 7 selector calls over the same 104 rows
   instead of the existing `selectHomeSections()` bundle (identical passes).
5. (fixed, bytes) `X-Powered-By` header on every response; `npm ci` ran
   audit/fund lookups per docker layer rebuild.
6. (not a bottleneck, documented) In-memory `animes[]` filter/sort per render
   (~104 rows, server-side, mostly build-time static prerender): microseconds,
   no memoization added (speculative at this scale).

### 3. Optimizations (file:line + why)

- `src/lib/captions-cache.ts` (new, 100 lines): bounded TTL cache —
  `{ maxEntries: 200 (FIFO evict), ttlMs: 3_600_000 (matches 1h caption
  freshness), keyFn: validated videoId only, single-container-note: module
  Map, not distributed, lost on restart — same constraint as rate-limit.ts }`.
  Stores only `timedtext|watch|none`; `error`/4xx/429 never stored.
- `src/app/api/youtube/captions/route.ts:4,125,170,209,230`: lookup AFTER
  both rate-limit checks (429 contract unchanged — hits still cost budget);
  store on each of the 3 success returns. Same body shape; 502 path untouched.
- `src/components/TrailerPlayer.tsx:138-173`: caption effect deps
  `[activeId, playing]` → `[activeId]` (fetch once per video); removed the
  no-cors fire-and-forget + stale `playing` guards (empty/error now always
  clears stale tracks for the new video — success-path output identical).
  Player-lifecycle effect (`:228`, recreates YT player on `playing`) untouched
  — redesign risk, deferred below.
- `src/components/CategoryPills.tsx:1-4`, `LegalPlatforms.tsx:1-6`: dropped
  `"use client"` (both pure: no hooks, no window/document; consumers are all
  server pages). Less client JS on `/`, `/category/*`, `/anime/*`, `/watch/*`.
- `src/app/page.tsx:1-16`: 7 inline selector calls → one
  `selectHomeSections()` call (same ids/order/slices/counts; equivalence
  covered by P2.3 tests + P2.6 bundle test). Server component preserved.
- `next.config.ts:5`: `poweredByHeader: false` (header bytes + hygiene).
- `Dockerfile:6-10`: `npm ci --no-audit --no-fund` (identical node_modules).
- Tests reset isolation: `tests/api-captions.test.ts`,
  `tests/api-captions-extended.test.ts`, `tests/api-p24-regression.test.ts`
  `beforeEach` now also `resetCaptionsCache()` (new shared route-cache state).

### 4. Data-access changes

Single call-site consolidation only (`page.tsx` → `selectHomeSections()`).
No helper semantics changed; no memoization (see bottleneck 6). Catalog
untouched (104 records; `counts.total === 104` asserted in P2.6 test).

### 5. Server/client findings

`use client` audit (grep): `admin/subs` (justified: editor state),
`error.tsx` (required), `Header` (justified: state+router), `VideoPlayer`
(dead), `TrailerPlayer` (justified: YT API/DOM), `CategoryPills` +
`LegalPlatforms` (unjustified → converted to server, verified by
`renderToString` tests + full static build). No server→client conversions.
No global client state. No full-catalog leak: only per-route slices/1 record
flow to client components (`AnimeCard` props per card, `TrailerPlayer` ids);
`animes[]` never imported by any `"use client"` module (grep-verified).

### 6. Image/asset findings (no change — already optimal)

`next/image` + `sizes` everywhere rendered (cards/hero/detail); `priority`
only on LCP banners; `formats: [avif, webp]` + 9-host `remotePatterns`
already set. `VideoPlayer` raw `<img>` poster lives in dead code (zero route
imports) — touching it buys nothing. TrailerPlayer thumbnail is a single
per-page YouTube-CDN `<img>` (already-optimized origin) — `next/image`
conversion adds optimizer hops for no measured gain. Fonts: `next/font`
+ `display:swap`, no render-blocking `<link>`. `public/` 20K, no new assets.

### 7. Captions amplification findings

Upstream-max-per-request still bounded: ≤2 timedtext + ≤1 watch fetch, each
with 10s/10s/12s abort timeouts + 2MB watch pre-check (unchanged). Added:
route-level TTL cache (repeat `?v=` serves zero upstream fetches; failures
always re-fetch) + client once-per-video fetching (play/pause no longer
refetches). Rate limits unchanged and still evaluated before cache lookup
(`31st same-IP → 429` asserted in test). `Retry-After` preserved.

### 8. AniList findings (no change — already efficient)

`perPage` bounded at every call site (100 top / 24 genre / 24 search /
12 search-page / 1 by-id), 9s abort timeout, `revalidate: 3600` on GraphQL
fetch, graceful degradation on all 5 call sites kept. `toAnime` mapping is
pure per-record CPU (negligible). No batching/dedup layer added — request
volume (category/search pages, ISR 1h) does not justify one at 104 rows.

### 9. Build findings

Post-change `npm run build` → 14s wall (compile 2.6s, TS 4.0s, static-gen
5.8s), 230/230 pages, route table byte-identical to baseline; no new
warnings (only pre-existing P1-a localhost lines). `ƒ /search` stays dynamic
(query-dependent — correct). No ISR/revalidate value changed anywhere.

### 10. Docker findings

`docker compose config` → exit 0 (renders `webanime:latest`, `1234:1234`).
`npm ci` flags are the only Dockerfile change (faster layer rebuilds, same
`node_modules`). Non-root `nextjs`, healthcheck grep contract, port 1234,
prod `next start`, `.dockerignore` coverage all preserved. `docker build`
validation in §13.

### 11. Database decision (reaffirmed: NO database)

104 static rows / 155KB imported synchronously: filter/sort/render is
sub-millisecond server-side and mostly build-time (static prerender). A
database (or Redis/CMS/queue) adds ops, backup, migration, and failure modes
for zero measured gain. Revisit only at the scaling triggers below —
and then Postgres/SQLite for the catalog first, cache (not DB) for captions.
No `db/`, schema, migration, or driver added.

### 12. Scaling triggers 100→500→1k→10k records

- ~500 rows (`animes.ts` ≈ 750KB): still file-catalog; watch `build`
  static-gen time + `animes.ts` parse cost; split `data.ts` selectors only if
  build regresses (measured, not before).
- ~1k rows: static params (1k anime + 1k watch + categories) lengthen every
  build; consider `dynamicParams` + ISR for long-tail slugs (needs per-row
  `updatedAt` first — catalog has none today); move captions cache behind an
  explicit eviction metric (log `captionsCacheSize()` on 502s).
- ~10k rows / multi-replica: file catalog ends → Postgres (catalog) +
  search index (exact bottleneck TBD by measurement: build time vs query
  latency); rate-limit + captions cache must move to a shared store (Redis)
  because module Maps are per-container; add CDN in front of `/_next/static`
  + images; YouTube scrape fallback likely needs replacing (ToS/rate risk
  grows with traffic) before any other scale work.

### 13. Tests added (11 new, deterministic, network-free, no timing asserts)

`tests/p26-performance.test.ts` (11): cache miss/shape-constants;
hit-equality for `timedtext|watch|none`; `error` never stored; TTL
fresh-before/stale-at with explicit injected `now` (no sleeps); oldest-first
eviction at 200; route second-hit = zero extra fetches + byte-equal body;
all-fail re-fetches (uncached 502s); 31 same-IP requests → 30×200 + 429
(cache does not bypass rate limit); `selectHomeSections` bundle values +
count consistency (104 total); `renderToString` CategoryPills/LegalPlatforms
(server-boundary net). Suite: 24 files/284 → **25 files/295**, all passing.

### 14. Validation (raw)

- `git branch --show-current` → `chore/p2-performance-scalability`.
- `npm run lint` → pass (exit 0, no output) pre and post.
- `npm run test:run` → 25 files / 295 tests passed, 15.28s (baseline 24/284).
- `npm run build` → pass, 14s wall (baseline 12s; static-gen 5.8s vs 5.6s —
  noise), 230/230 pages, identical route table, no new warnings.
- `docker compose config` → exit 0 (renders `webanime:latest`, `1234:1234`).
  `docker build -t webanime:p2.6-validate .` → success
  (`writing image sha256:a3723cd3… done`,
  `naming to docker.io/library/webanime:p2.6-validate done`).
- Final `git status --short` shows only intended files; main untouched; NO
  commit/push/PR/merge performed.
