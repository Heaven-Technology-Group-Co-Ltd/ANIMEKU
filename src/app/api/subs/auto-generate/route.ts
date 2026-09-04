import { NextRequest, NextResponse } from "next/server";
import { getAnimeByIdAni, toAnime } from "@/lib/anilist";
import { checkRateLimit, clientIdFromHeaders, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { errorBody, normalizeVideoId, parseAnimeId } from "@/lib/api-contract";

export const dynamic = "force-dynamic";

/** Generous cap for a { videoId, animeId } JSON body; larger bodies get 413. */
const MAX_BODY_BYTES = 32_768;

// POST /api/subs/auto-generate { videoId, animeId }
// Auto-generates Thai custom subs (demo: from title/description + timed cues)
// In production, replace with Whisper transcription of audio.
//
// Contract (P2.2): stable { error: { code, message } } envelope on 4xx/429;
// animeId is normalized to number-or-null in the response (API-06); malformed
// JSON bodies keep safe client behavior (400) and add a one-line server warn
// for observability without logging body content (API-07).
export async function POST(req: NextRequest) {
  const clientId = clientIdFromHeaders(req.headers);
  const perIp = checkRateLimit(
    `autogen:${clientId}`,
    RATE_LIMIT_PRESETS.autoGeneratePerIp.limit,
    RATE_LIMIT_PRESETS.autoGeneratePerIp.windowMs,
  );
  if (!perIp.allowed) {
    return NextResponse.json(errorBody("rate_limited", "too many requests"), {
      status: 429,
      headers: { "Retry-After": String(perIp.retryAfterSec) },
    });
  }
  const global = checkRateLimit(
    "autogen:global",
    RATE_LIMIT_PRESETS.autoGenerateGlobal.limit,
    RATE_LIMIT_PRESETS.autoGenerateGlobal.windowMs,
  );
  if (!global.allowed) {
    return NextResponse.json(errorBody("rate_limited", "too many requests"), {
      status: 429,
      headers: { "Retry-After": String(global.retryAfterSec) },
    });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json(errorBody("invalid_request", "request body too large"), {
      status: 413,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Safe client behavior (still 4xx) + server observability. Never log the
    // body itself (unbounded, client-controlled) and never leak parser detail.
    console.warn("[subs/auto-generate] malformed JSON body");
    return NextResponse.json(errorBody("malformed_json", "malformed JSON body"), {
      status: 400,
    });
  }

  const fields = (body ?? {}) as Record<string, unknown>;
  const vid = normalizeVideoId(fields.videoId);
  if (!vid) {
    return NextResponse.json(errorBody("invalid_video_id", "invalid videoId"), { status: 400 });
  }

  // Try to get anime info for context (best-effort; failures degrade to vid).
  let title = vid;
  let desc = "";
  const parsedAnimeId = parseAnimeId(fields.animeId);
  if (!parsedAnimeId.ok) {
    return NextResponse.json(errorBody("invalid_anime_id", "invalid animeId"), { status: 400 });
  }
  const numId = parsedAnimeId.value;
  if (numId !== null) {
    try {
      const ani = await getAnimeByIdAni(numId);
      if (ani) {
        const a = toAnime(ani);
        title = a.titleTh || a.titleEn;
        desc = a.description.slice(0, 120);
      }
    } catch (err) {
      // One line, numeric id only. No stack, no upstream payload.
      console.error(
        `[subs/auto-generate] AniList lookup failed animeId=${numId} reason=${err instanceof Error ? err.name : "unknown"}`,
      );
    }
  }

  // Generate timed cues (approx 30s trailer, 4s per cue)
  const lines = [
    `${title} — ตัวอย่างแนะนำ`,
    desc ? desc.slice(0, 40) : "อนิเมะแนะนำโดย ANIMEKU",
    "ซับไทย auto-generated — สร้างจากบทบรรยายจริง",
    "ดูถูกลิขสิทธิ์ได้ที่ Crunchyroll / Bilibili / Netflix",
  ];
  const cues = lines.map((text, i) => ({
    start: i * 5,
    end: i * 5 + 4.5,
    text,
  }));

  return NextResponse.json({
    videoId: vid,
    animeId: numId,
    cues,
    note: "demo auto-generate from anime metadata — replace with Whisper transcription for production",
  });
}
