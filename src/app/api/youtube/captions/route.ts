import { NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout, FETCH_TIMEOUTS_MS } from "@/lib/fetch-timeout";
import { checkRateLimit, clientIdFromHeaders, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { getCaptionsCache, setCaptionsCache } from "@/lib/captions-cache";
import {
  errorBody,
  normalizeVideoId,
  type CaptionTrack,
  type CaptionsSource,
} from "@/lib/api-contract";

export const revalidate = 3600; // cache 1h

// GET /api/youtube/captions?v=VIDEO_ID
// -> 200 { videoId, tracks: CaptionTrack[], source: "timedtext"|"watch"|"none" }
// -> 400 { error } on invalid v
// -> 429 { error } + Retry-After when the per-IP or global budget is exceeded
// -> 502 { videoId, tracks: [], source: "error", error } when every provider
//    failed (timeouts, non-2xx, malformed watch HTML). "none" (upstream says
//    no captions) stays 200 so emptiness is distinguishable from failure.
// Track shape intentionally omits baseUrl (P2.2 API-04): never leak upstream
// caption URLs to clients. /api/health is never rate limited; this route is.

const TIMEDTEXT_HOSTS = ["https://www.youtube.com/api/timedtext", "https://video.google.com/timedtext"];

/** Refuse to buffer watch pages larger than this (content-length pre-check). */
const MAX_WATCH_BYTES = 2_000_000;

function parseTimedTextTracks(xml: string): CaptionTrack[] {
  const tracks: CaptionTrack[] = [];
  const trackRegex = /<track[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = trackRegex.exec(xml)) !== null) {
    const tag = m[0];
    const lang =
      tag.match(/lang_code="([^"]+)"/)?.[1] || tag.match(/lang="([^"]+)"/)?.[1] || "";
    const name = tag.match(/name="([^"]*)"/)?.[1] || lang;
    const kind = tag.match(/kind="([^"]*)"/)?.[1] || "";
    if (lang) tracks.push({ lang, name: name || lang, kind, isAuto: kind === "asr" });
  }
  return tracks;
}

type WatchCaptionTrack = {
  languageCode?: string;
  name?: { simpleText?: string };
  kind?: string;
};

/**
 * Extract captionTracks JSON from watch-page HTML. Returns null when the page
 * carries no caption data; THROWS on structurally malformed JSON so the caller
 * records an upstream failure (not an empty result).
 */
function parseWatchTracks(html: string): CaptionTrack[] | null {
  const capMatch = html.match(/"captionTracks":(\[.*?\])/);
  if (!capMatch) return null;
  const arr = JSON.parse(capMatch[1]) as WatchCaptionTrack[];
  if (!Array.isArray(arr)) throw new Error("captionTracks is not an array");
  return arr
    .filter((c) => typeof c.languageCode === "string" && c.languageCode.length > 0)
    .map((c) => ({
      lang: c.languageCode as string,
      name: c.name?.simpleText || (c.languageCode as string),
      kind: typeof c.kind === "string" ? c.kind : "",
      isAuto: c.kind === "asr",
    }));
}

function tooLarge(res: Response, maxBytes: number): boolean {
  const len = res.headers.get("content-length");
  if (!len) return false;
  const n = Number(len);
  return Number.isFinite(n) && n > maxBytes;
}

function logFailure(stage: string, v: string, reason: string): void {
  // One line, validated videoId only. Never log HTML, stacks, or secrets.
  console.error(`[captions] ${stage} failed v=${v} reason=${reason}`);
}

function reasonOf(err: unknown): string {
  return err instanceof Error ? err.name : "unknown";
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("v");
  const v = normalizeVideoId(raw?.trim());
  if (!v) {
    return NextResponse.json(errorBody("invalid_video_id", "missing or invalid v"), {
      status: 400,
    });
  }

  // Rate limit: per-IP fairness first, global backstop second. Health-style
  // fast paths do not exist here — every allowed request may cost upstream.
  const clientId = clientIdFromHeaders(req.headers);
  const perIp = checkRateLimit(
    `captions:${clientId}`,
    RATE_LIMIT_PRESETS.captionsPerIp.limit,
    RATE_LIMIT_PRESETS.captionsPerIp.windowMs,
  );
  if (!perIp.allowed) {
    return NextResponse.json(errorBody("rate_limited", "too many requests"), {
      status: 429,
      headers: { "Retry-After": String(perIp.retryAfterSec) },
    });
  }
  const global = checkRateLimit(
    "captions:global",
    RATE_LIMIT_PRESETS.captionsGlobal.limit,
    RATE_LIMIT_PRESETS.captionsGlobal.windowMs,
  );
  if (!global.allowed) {
    return NextResponse.json(errorBody("rate_limited", "too many requests"), {
      status: 429,
      headers: { "Retry-After": String(global.retryAfterSec) },
    });
  }

  // P2.6: bounded TTL cache lookup AFTER rate limiting, so the 429 contract
  // is unchanged (a cached hit still costs rate budget). Only cacheable
  // successes ("timedtext"/"watch"/"none") are ever stored — "error" (502),
  // 4xx, and 429 bypass the cache. Same body shape as a fresh fetch.
  const cached = getCaptionsCache(v);
  if (cached) {
    const body: { videoId: string; tracks: CaptionTrack[]; source: CaptionsSource } = {
      videoId: v,
      tracks: cached.tracks,
      source: cached.source,
    };
    return NextResponse.json(body);
  }

  // SSRF note: `v` is regex-validated and interpolated only into two fixed
  // YouTube hosts below. No user-controlled upstream URLs exist on this route.
  let sawAffirmativeEmpty = false;

  // 1) Timedtext list APIs (no key needed).
  for (const host of TIMEDTEXT_HOSTS) {
    const url = `${host}?type=list&v=${v}`;
    try {
      const res = await fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9,th;q=0.8",
          },
          next: { revalidate: 3600 },
        },
        FETCH_TIMEOUTS_MS.youtubeTimedtext,
      );
      if (!res.ok) {
        logFailure("timedtext", v, `http-${res.status}`);
        continue;
      }
      const xml = await res.text();
      if (!xml || xml.length < 10) {
        logFailure("timedtext", v, "short-body");
        continue;
      }
      const tracks = parseTimedTextTracks(xml);
      if (tracks.length > 0) {
        const body: { videoId: string; tracks: CaptionTrack[]; source: CaptionsSource } = {
          videoId: v,
          tracks,
          source: "timedtext",
        };
        setCaptionsCache(v, tracks, "timedtext");
        return NextResponse.json(body);
      }
      // Upstream affirmatively answered with an (empty) transcript list.
      if (xml.includes("<transcript_list")) {
        sawAffirmativeEmpty = true;
        break;
      }
      logFailure("timedtext", v, "unrecognized-xml");
    } catch (err) {
      logFailure("timedtext", v, reasonOf(err));
    }
  }

  // 2) Fallback: scrape watch page for captionTracks JSON.
  if (!sawAffirmativeEmpty) {
    try {
      const watchRes = await fetchWithTimeout(
        `https://www.youtube.com/watch?v=${v}`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 3600 },
        },
        FETCH_TIMEOUTS_MS.youtubeWatch,
      );
      if (!watchRes.ok) {
        logFailure("watch", v, `http-${watchRes.status}`);
      } else if (tooLarge(watchRes, MAX_WATCH_BYTES)) {
        logFailure("watch", v, "oversized");
      } else {
        const html = await watchRes.text();
        try {
          const tracks = parseWatchTracks(html);
          if (tracks && tracks.length > 0) {
            const body: { videoId: string; tracks: CaptionTrack[]; source: CaptionsSource } = {
              videoId: v,
              tracks,
              source: "watch",
            };
            setCaptionsCache(v, tracks, "watch");
            return NextResponse.json(body);
          }
          // Watch page fetched fine but carries no caption data.
          sawAffirmativeEmpty = true;
        } catch (err) {
          // Malformed caption JSON is an upstream failure, never "empty".
          logFailure("watch", v, `bad-caption-json:${reasonOf(err)}`);
        }
      }
    } catch (err) {
      logFailure("watch", v, reasonOf(err));
    }
  }

  if (sawAffirmativeEmpty) {
    const body: { videoId: string; tracks: CaptionTrack[]; source: CaptionsSource } = {
      videoId: v,
      tracks: [],
      source: "none",
    };
    setCaptionsCache(v, [], "none");
    return NextResponse.json(body);
  }

  // Every provider failed: 502 keeps failure distinguishable from "no
  // captions". tracks:[] is included so TrailerPlayer (which reads
  // j.tracks || []) behaves exactly as before with no consumer change.
  const body: {
    videoId: string;
    tracks: CaptionTrack[];
    source: CaptionsSource;
    error: { code: "upstream_error"; message: string };
  } = {
    videoId: v,
    tracks: [],
    source: "error",
    ...errorBody("upstream_error", "caption providers unavailable"),
  };
  return NextResponse.json(body, { status: 502 });
}
