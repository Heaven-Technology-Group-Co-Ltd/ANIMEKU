import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600; // cache 1h

// GET /api/youtube/captions?v=VIDEO_ID  -> { videoId, tracks: [{ lang, name, isAuto }] }
export async function GET(req: NextRequest) {
  const v = req.nextUrl.searchParams.get("v")?.trim();
  if (!v || !/^[a-zA-Z0-9_-]{6,20}$/.test(v)) {
    return NextResponse.json({ error: "missing or invalid v" }, { status: 400 });
  }

  // Try YouTube timedtext list API (no key needed)
  // This returns XML like: <transcript_list><track id="0" name="" lang_code="en" ... />
  const urls = [
    `https://www.youtube.com/api/timedtext?type=list&v=${v}`,
    `https://video.google.com/timedtext?type=list&v=${v}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9,th;q=0.8",
        },
        next: { revalidate: 3600 },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml || xml.length < 10) continue;

      // Parse <track ... lang_code="xx" name="..." kind="asr" ... />
      const tracks: { lang: string; name: string; kind: string; isAuto: boolean }[] = [];
      const trackRegex = /<track[^>]*>/g;
      let m: RegExpExecArray | null;
      while ((m = trackRegex.exec(xml)) !== null) {
        const tag = m[0];
        const lang = tag.match(/lang_code="([^"]+)"/)?.[1] || tag.match(/lang="([^"]+)"/)?.[1] || "";
        const name = tag.match(/name="([^"]*)"/)?.[1] || lang;
        const kind = tag.match(/kind="([^"]*)"/)?.[1] || "";
        if (lang) tracks.push({ lang, name: name || lang, kind, isAuto: kind === "asr" });
      }

      // Also try to parse <transcript_list> empty -> no captions
      if (tracks.length > 0) {
        return NextResponse.json({ videoId: v, tracks, source: url });
      }
      // If XML contains <transcript_list> but no tracks, means no captions
      if (xml.includes("<transcript_list")) {
        return NextResponse.json({ videoId: v, tracks: [], source: url });
      }
    } catch (err) {
      console.error(`[captions] fetch failed for ${url} v=${v}`, err);
    }
  }

  // Fallback: try to scrape watch page for captionTracks JSON
  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${v}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (watchRes.ok) {
      const html = await watchRes.text();
      const capMatch = html.match(/"captionTracks":(\[.*?\])/);
      if (capMatch) {
        type CaptionTrack = {
          languageCode?: string;
          name?: { simpleText?: string };
          kind?: string;
          baseUrl?: string;
        };
        const arr = JSON.parse(capMatch[1]) as CaptionTrack[];
        const tracks = arr.map((c) => ({
          lang: c.languageCode,
          name: c.name?.simpleText || c.languageCode,
          kind: c.kind || "",
          isAuto: c.kind === "asr",
          baseUrl: c.baseUrl,
        }));
        return NextResponse.json({ videoId: v, tracks, source: "watch page" });
      }
    }
  } catch (err) {
    console.error(`[captions] watch page scrape failed for v=${v}`, err);
  }

  return NextResponse.json({ videoId: v, tracks: [], source: "none" });
}
