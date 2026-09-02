/**
 * Lightweight production-safe env helper.
 * - Validates NEXT_PUBLIC_SITE_URL is absolute (http/https) in production
 * - Allows localhost for development
 * - Warns (no silent fallback) when production uses localhost/missing/invalid
 * - Keeps NEXT_PUBLIC_HLS_BASE_URL optional
 * - No extra dependencies, works at build-time and runtime
 */

const FALLBACK_SITE_URL = "http://localhost:1234";

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
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
    if (isProd() && ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname)) {
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

// Convenience constants for server components where import-time evaluation is fine
export const siteUrl = getSiteUrl();
export const hlsBaseUrl = getHlsBaseUrl();
