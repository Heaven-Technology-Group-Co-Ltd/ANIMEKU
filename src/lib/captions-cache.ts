// Bounded TTL in-memory cache for /api/youtube/captions (P2.6).
//
// Shape: { maxEntries, ttlMs, keyFn, single-container-note }.
// - maxEntries: upper bound on stored videoIds (FIFO eviction past this).
// - ttlMs: entry freshness window; stale entries are treated as misses.
// - keyFn: identity is the validated YouTube videoId (`v` AFTER
//   `normalizeVideoId`, never raw query input).
// - single-container-note: module-level Map only; NOT distributed across
//   replicas and lost on restart — same constraint as `rate-limit.ts` and
//   matching the single-service compose architecture (no Redis by design).
//
// Correctness contract (identical output):
// - Only cacheable successes are stored: source "timedtext" | "watch" | "none"
//   (upstream affirmatively answered). "error" (502), 4xx, and 429 are NEVER
//   stored, so failures stay distinguishable and rate limits keep working.
// - Lookup happens AFTER the per-IP + global rate-limit checks in the route,
//   so the 429 contract is unchanged (a cached hit still costs rate budget).
// - `now` is injectable (defaults to Date.now) so tests assert TTL/eviction
//   with explicit timestamps — no fake timers, no timing asserts.

import type { CaptionTrack, CaptionsSource } from "./api-contract";

export type CacheableCaptionsSource = Extract<CaptionsSource, "timedtext" | "watch" | "none">;

export type CaptionsCacheEntry = {
  tracks: CaptionTrack[];
  source: CacheableCaptionsSource;
  storedAt: number;
};

/** Upper bound on tracked videoIds; oldest entries are evicted past this. */
export const CAPTIONS_CACHE_MAX_ENTRIES = 200;

/** Freshness window: matches the route/ISR 1h caption freshness. */
export const CAPTIONS_CACHE_TTL_MS = 3_600_000;

const store = new Map<string, CaptionsCacheEntry>();

/** Cache key: the already-validated videoId (never raw user input). */
export function captionsCacheKey(videoId: string): string {
  return videoId;
}

function evictOldest(): void {
  const oldest = store.keys().next();
  if (!oldest.done) store.delete(oldest.value);
}

function isFresh(entry: CaptionsCacheEntry, now: number): boolean {
  return now - entry.storedAt < CAPTIONS_CACHE_TTL_MS;
}

/**
 * Lookup a cached caption result. Stale entries are deleted and reported as
 * misses. Pure w.r.t. callers (Map mutation is expiry cleanup only).
 */
export function getCaptionsCache(
  videoId: string,
  now: number = Date.now(),
): { tracks: CaptionTrack[]; source: CacheableCaptionsSource } | null {
  const entry = store.get(captionsCacheKey(videoId));
  if (!entry) return null;
  if (!isFresh(entry, now)) {
    store.delete(videoId);
    return null;
  }
  return { tracks: entry.tracks, source: entry.source };
}

/**
 * Store a cacheable success. Non-cacheable sources ("error") are ignored so
 * upstream failures are never served from cache.
 */
export function setCaptionsCache(
  videoId: string,
  tracks: CaptionTrack[],
  source: CaptionsSource,
  now: number = Date.now(),
): void {
  if (source !== "timedtext" && source !== "watch" && source !== "none") return;
  if (!store.has(videoId) && store.size >= CAPTIONS_CACHE_MAX_ENTRIES) {
    evictOldest();
  }
  store.set(captionsCacheKey(videoId), { tracks, source, storedAt: now });
}

/** Test-only reset for deterministic route tests. Not used by routes. */
export function resetCaptionsCache(): void {
  store.clear();
}

/** Current entry count (observability/tests). */
export function captionsCacheSize(): number {
  return store.size;
}
