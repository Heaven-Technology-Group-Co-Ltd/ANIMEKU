# Pre-domain deployment (ANIMEKU)

ANIMEKU can deploy safely **before** a real public domain is configured, without
letting `localhost` silently become the canonical production URL.

## Modes

| Mode | How | `NEXT_PUBLIC_SITE_URL` |
|---|---|---|
| Real production (default) | `PRE_DOMAIN_DEPLOY` unset, empty, or anything but exact `"1"` | Must be a real absolute `http(s)` origin. `localhost` / loopback / local hostnames (`127.0.0.1`, full `127/8`, `0.0.0.0`, `::1`, `*.localhost`, `*.local`) are **rejected**; empty/invalid values **fail closed**. |
| Pre-domain (explicit) | `PRE_DOMAIN_DEPLOY=1` (exact `"1"` only) | Permits **only** the temporary URL `http://localhost:1234`. Every other loopback/local value is still rejected; real origins keep passing. |

`"true"`, `"yes"`, `"0"`, `"2"` and friends do **not** enable pre-domain mode —
they fail closed to real production.

## Why this shape

- `NEXT_PUBLIC_SITE_URL` is a **build-time** value baked into client JS at
  `docker build` (see `Dockerfile` + `docker-compose.yml` build args). A wrong
  bake can only be fixed by rebuilding with `--build`.
- The VPS host has **no `node` binary**, so validation lives in
  `scripts/check-production-site-url.sh` — POSIX `sh` + `sed` + `tr` only, no
  host Node required. (Inside the Docker build/container, Node is guaranteed;
  the app-level validator `assertProductionPublicConfig` in `src/lib/env.ts`
  keeps enforcing the same rule there.)
- The gate **never falls back to localhost silently**: a missing URL aborts the
  deploy in both modes.

## Operating

- **Deploy log shows the mode** on every run (`site-url gate: mode=...`), from
  both the gate script and the deploy workflow.
- **Going live:** set `NEXT_PUBLIC_SITE_URL=https://your-domain` in the VPS
  `.env`, unset (or `0`) `PRE_DOMAIN_DEPLOY`, redeploy (`docker compose up -d
  --build`). Do this from `main` — never from a feature branch, never by
  hand-editing the VPS.
- **Unchanged:** `/api/health` checks, rollback to `webanime:rollback` (without
  `--build`, with explicit result reporting), dirty-tree protection (only
  `docs/LEDGER.md` drift tolerated, backed up and restored), and
  `NEXT_PUBLIC_*` build-time forwarding.

## Verification

```sh
npm run lint && npm run test:run && npm run build
docker compose config
docker build .
git diff --check
PRE_DOMAIN_DEPLOY=1 NEXT_PUBLIC_SITE_URL=http://localhost:1234 \
  sh scripts/check-production-site-url.sh
```
