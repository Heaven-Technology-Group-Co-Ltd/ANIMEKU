// Centralized server-fetch timeouts (P2.2 API-02).
//
// Every server-side external fetch (AniList GraphQL, YouTube timedtext list,
// YouTube watch-page scrape) must go through `fetchWithTimeout` so a hung
// upstream can never hold a server worker indefinitely. Callers that are
// best-effort (captions providers, auto-generate AniList enrichment) catch the
// resulting `UpstreamTimeoutError` and degrade gracefully.
//
// Chosen values (within the audit's 8-10s AniList / 10-15s YouTube guidance):
// - AniList GraphQL p95 is ~1-3s; 9s leaves ample headroom for cold starts
//   while bounding worker hold time.
// - timedtext list responses are tiny XML; 10s is generous.
// - watch-page scrapes pull full HTML (~0.5-1MB); 12s covers slow origins.
// Worst case per inbound /api/youtube/captions request is therefore bounded at
// ~10+10+12 = 32s of upstream wait, and the ISR cache (revalidate 3600) plus
// the per-IP rate limiter keep that path from being exercised repeatedly.

export const FETCH_TIMEOUTS_MS = {
  /** AniList GraphQL (src/lib/anilist.ts). */
  anilist: 9_000,
  /** YouTube timedtext list API (src/app/api/youtube/captions/route.ts). */
  youtubeTimedtext: 10_000,
  /** YouTube watch-page scrape fallback (same route). */
  youtubeWatch: 12_000,
} as const;

export class UpstreamTimeoutError extends Error {
  readonly timeoutMs: number;
  readonly host: string;

  constructor(timeoutMs: number, host: string) {
    super(`upstream fetch timed out after ${timeoutMs}ms (host=${host})`);
    this.name = "UpstreamTimeoutError";
    this.timeoutMs = timeoutMs;
    this.host = host;
  }
}

/** Host portion of a URL for one-line server logs. Never logs paths/queries. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

/**
 * fetch with an AbortSignal timeout. On timeout the request is aborted and an
 * `UpstreamTimeoutError` is thrown after a single-line server log (host +
 * budget only — no secrets, no stack, no response body). Non-timeout errors
 * propagate unchanged so callers can distinguish them.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      console.error(`[fetch-timeout] aborted host=${hostOf(url)} timeoutMs=${timeoutMs}`);
      throw new UpstreamTimeoutError(timeoutMs, hostOf(url));
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
