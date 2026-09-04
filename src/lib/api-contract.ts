// Shared API contract helpers (P2.2 API-04 / API-06 / API-07).
//
// Stable shapes used by /api/youtube/captions and /api/subs/auto-generate:
// - error envelope:  { error: { code, message } }  (machine-readable `code`)
// - caption track:   { lang, name, kind, isAuto }  (no `baseUrl` — the watch
//   branch previously leaked the upstream caption URL; never expose it)
// - captions source: "timedtext" | "watch" | "none" | "error"
//   ("none" = upstream affirmatively reports no captions, HTTP 200;
//    "error" = all providers failed, HTTP 502 with tracks:[] so existing
//    consumers keep working.)

export const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{6,20}$/;

export type CaptionsSource = "timedtext" | "watch" | "none" | "error";

export type CaptionTrack = {
  lang: string;
  name: string;
  kind: string;
  isAuto: boolean;
};

export type ApiErrorCode =
  | "invalid_video_id"
  | "invalid_anime_id"
  | "malformed_json"
  | "invalid_request"
  | "rate_limited"
  | "upstream_error";

export function errorBody<T extends ApiErrorCode>(
  code: T,
  message: string,
): {
  error: { code: T; message: string };
} {
  return { error: { code, message } };
}

export function normalizeVideoId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return VIDEO_ID_RE.test(trimmed) ? trimmed : null;
}

export type AnimeIdParse = { ok: true; value: number | null } | { ok: false };

/**
 * Absent/empty -> { ok:true, value:null }. Finite positive numbers (or numeric
 * strings) are floored to a safe integer for the AniList Int contract.
 * Anything else (NaN, Infinity, <=0, non-safe-integer, wrong type) -> !ok.
 */
export function parseAnimeId(value: unknown): AnimeIdParse {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value === "string" && value.trim() === "") return { ok: true, value: null };
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : NaN;
  if (!Number.isFinite(num)) return { ok: false };
  const int = Math.floor(num);
  if (int <= 0 || !Number.isSafeInteger(int)) return { ok: false };
  return { ok: true, value: int };
}
