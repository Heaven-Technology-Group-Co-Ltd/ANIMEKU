import { NextRequest, NextResponse } from "next/server";
import { getAnimeByIdAni, toAnime } from "@/lib/anilist";

export const dynamic = "force-dynamic";

// POST /api/subs/auto-generate { videoId, animeId }
// Auto-generates Thai custom subs (demo: from title/description + timed cues)
// In production, replace with Whisper transcription of audio
export async function POST(req: NextRequest) {
  const { videoId, animeId } = await req.json().catch(() => ({}));
  const vid = (videoId as string)?.trim();
  if (!vid || !/^[a-zA-Z0-9_-]{6,20}$/.test(vid)) {
    return NextResponse.json({ error: "invalid videoId" }, { status: 400 });
  }

  // Try to get anime info for context
  let title = vid;
  let desc = "";
  if (animeId) {
    try {
      const ani = await getAnimeByIdAni(Number(animeId));
      if (ani) {
        const a = toAnime(ani);
        title = a.titleTh || a.titleEn;
        desc = a.description.slice(0, 120);
      }
    } catch {}
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
    animeId: animeId || null,
    cues,
    note: "demo auto-generate from anime metadata — replace with Whisper transcription for production",
  });
}
