/**
 * Lightweight production-safe env helper.
 * - Validates NEXT_PUBLIC_SITE_URL is absolute (http/https) in production
 * - Allows localhost for development
 * - Warns (no silent fallback) when production uses localhost/missing/invalid
 * - Keeps NEXT_PUBLIC_HLS_BASE_URL optional
 * - No extra dependencies, works at build-time and runtime
 */

const FALLBACK_SITE_URL = "http://localhost:1234";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

/**
 * P2.4: WHATWG URL keeps IPv6 brackets in `hostname` ("[::1]") while the
 * loopback set stores the bare form ("::1"). Normalize before lookup so an
 * IPv6-loopback bake is flagged exactly like 127.0.0.1. Pure, no behavior
 * change for any currently-handled input.
 */
function isLoopbackHostname(hostname: string): boolean {
  const bare = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return LOOPBACK_HOSTNAMES.has(bare);
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Pure check: does `raw` resolve to a non-loopback absolute http(s) origin?
 * Used by production-readiness assertions without triggering console output.
 */
export function isPublicOriginProductionReady(raw: string | undefined): boolean {
  const value = raw?.trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    return !isLoopbackHostname(url.hostname);
  } catch {
    return false;
  }
}

/**
 * True when running production AND the baked NEXT_PUBLIC_SITE_URL is a real
 * (non-loopback) origin. False covers: missing, invalid, or localhost-baked.
 * Local dev (NODE_ENV != production) intentionally returns false — the
 * localhost fallback is valid there, not a misconfiguration.
 */
export function isProductionPublicConfigValid(): boolean {
  return isProd() && isPublicOriginProductionReady(process.env.NEXT_PUBLIC_SITE_URL);
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!raw) {
    if (isProd()) {
      console.error(
        "[env] NEXT_PUBLIC_SITE_URL is missing in production — set it to your canonical origin (e.g. https://animeku.example.com). Falling back to localhost for build/runtime."
      );
    }
    return FALLBACK_SITE_URL;
  }

  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error(`unsupported protocol ${url.protocol}`);
    }
    if (isProd() && isLoopbackHostname(url.hostname)) {
      console.error(
        `[env] NEXT_PUBLIC_SITE_URL is "${raw}" but hostname is localhost/loopback in production — expected absolute production origin.`
      );
    }
    // Return canonical origin (no path/query/hash, no trailing slash)
    return url.origin;
  } catch {
    if (isProd()) {
      console.error(
        `[env] NEXT_PUBLIC_SITE_URL invalid: "${raw}" — expected absolute URL like https://animeku.example.com`
      );
    }
    return FALLBACK_SITE_URL;
  }
}

/**
 * Optional HLS base. Returns "" when not configured.
 * When configured, must be absolute http/https URL. Invalid values are ignored with a warning.
 */
export function getHlsBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_HLS_BASE_URL?.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    // Keep origin + pathname without trailing slash, e.g. https://bucket.r2.dev/hls
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    console.warn(`[env] NEXT_PUBLIC_HLS_BASE_URL invalid: "${raw}" — expected absolute URL, ignoring.`);
    return "";
  }
}

/**
 * P2.3 ARCH-05: single validated HLS URL resolver (pure, no secrets).
 * Precedence (unchanged from VideoPlayer): validated env base + slug/episode
 * → per-episode `hlsUrl` → demo fallback. An invalid/empty base never reaches
 * the player — it falls through instead of building a broken URL.
 */
export const HLS_DEMO_FALLBACK_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export function resolveHlsUrl(opts: {
  hlsBase?: string;
  animeSlug?: string;
  episodeNumber?: number;
  hlsUrl?: string;
}): string {
  const base = (opts.hlsBase ?? "").trim();
  if (base && opts.animeSlug && opts.episodeNumber) {
    return `${base}/${opts.animeSlug}/ep-${opts.episodeNumber}/master.m3u8`;
  }
  if (opts.hlsUrl) return opts.hlsUrl;
  return HLS_DEMO_FALLBACK_URL;
}

// Convenience constants for server components where import-time evaluation is fine
export const siteUrl = getSiteUrl();
export const hlsBaseUrl = getHlsBaseUrl();
