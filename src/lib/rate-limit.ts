// In-memory per-client + global rate limiter (P2.2 API-01).
//
// Single-container only: state lives in a module-level Map, so it is NOT
// distributed across replicas and does not survive restarts. This matches the
// architecture (one Docker service, no Redis by design) and is documented as
// such in docs/p2-architecture-audit.md. Do not rely on it across replicas.
//
// Design notes:
// - Client identity comes from the first syntactically valid IP token in
//   `X-Forwarded-For`, falling back to a shared "direct" bucket. The header is
//   client-controlled when there is no trusted proxy in front (our compose
//   setup exposes port 1234 directly), so per-IP buckets are best-effort UX
//   fairness only — the GLOBAL bucket is the real backstop against upstream
//   amplification (1 inbound captions request can fan out to 3 YouTube
//   fetches). We never store the raw header, only the derived bucket key.
// - The map is bounded (MAX_KEYS) with lazy expiry cleanup on every check and
//   oldest-first eviction when full, so unbounded key rotation cannot grow
//   memory without limit.
// - `/api/health` is intentionally NEVER rate limited (Docker healthchecks).

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds the client should wait before retrying (0 when allowed). */
  retryAfterSec: number;
  remaining: number;
};

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

/** Upper bound on tracked buckets; oldest entries are evicted past this. */
const maxKeys = 2000;

export const RATE_LIMIT_PRESETS = {
  captionsPerIp: { limit: 30, windowMs: 60_000 },
  captionsGlobal: { limit: 300, windowMs: 60_000 },
  autoGeneratePerIp: { limit: 20, windowMs: 60_000 },
  autoGenerateGlobal: { limit: 200, windowMs: 60_000 },
} as const;

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]{2,45}$/;

/**
 * Derive a rate-limit bucket key from request headers. Takes the first
 * syntactically valid IP token in X-Forwarded-For (never trusted blindly —
 * see module doc) and falls back to a shared bucket when absent/invalid.
 * No excess PII is stored: only the bucket key string.
 */
export function clientIdFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    for (const part of xff.split(",")) {
      const cand = part.trim();
      if (!cand || cand.length > 45) continue;
      if (IPV4_RE.test(cand) || (cand.includes(":") && IPV6_RE.test(cand))) {
        return `ip:${cand}`;
      }
    }
  }
  return "ip:direct";
}

function purgeExpired(now: number): void {
  for (const [key, bucket] of store) {
    if (now >= bucket.resetAt) store.delete(key);
  }
}

function evictOldest(): void {
  const oldest = store.keys().next();
  if (!oldest.done) store.delete(oldest.value);
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const current = store.get(key);
  if (!current || now >= current.resetAt) {
    if (!store.has(key) && store.size >= maxKeys) {
      purgeExpired(now);
      if (store.size >= maxKeys) evictOldest();
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0, remaining: limit - 1 };
  }
  if (current.count < limit) {
    current.count += 1;
    return { allowed: true, retryAfterSec: 0, remaining: limit - current.count };
  }
  return {
    allowed: false,
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    remaining: 0,
  };
}

/** Test-only reset for deterministic route tests. Not used by routes. */
export function resetRateLimitStore(): void {
  store.clear();
}

/** Current bucket count (observability/tests). */
export function rateLimitStoreSize(): number {
  return store.size;
}
