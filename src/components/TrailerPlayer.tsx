"use client";
import { useState } from "react";
import { Play, Sparkles, Volume2, Maximize2, Share2, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  youtubeId?: string;
  youtubeDubId?: string;
  thumbnail?: string;
  animeSlug: string;
  episodeNumber?: number;
  hlsUrl?: string;
};

export default function TrailerPlayer({ title, youtubeId, youtubeDubId, thumbnail, animeSlug, episodeNumber, hlsUrl }: Props) {
  const [mode, setMode] = useState<"sub" | "dub">("sub");
  const [playing, setPlaying] = useState(false);
  const [theater, setTheater] = useState(false);

  const activeId = mode === "dub" && youtubeDubId ? youtubeDubId : youtubeId;
  const hasYoutube = !!activeId;
  const showHlsFallback = !hasYoutube && !!hlsUrl;

  if (!hasYoutube && !showHlsFallback) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10 grid place-items-center">
        <p className="text-sm text-zinc-500">ไม่มีตัวอย่างสำหรับตอนนี้</p>
      </div>
    );
  }

  if (showHlsFallback) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10">
        <video controls autoPlay playsInline className="h-full w-full" poster={thumbnail}>
          <source src={hlsUrl} type="application/x-mpegURL" />
        </video>
      </div>
    );
  }

  return (
    <div className={cn("w-full", theater && "fixed inset-0 z-[100] bg-black p-0 flex flex-col")}>
      {/* Top bar - Title + theater toggle */}
      <div className={cn("flex items-center justify-between gap-3 mb-3", theater && "px-4 py-3 bg-[#0a0a0f] border-b border-white/10 mb-0")}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMode("sub"); setPlaying(false); }}
            className={cn("rounded-full px-4 py-1.5 text-sm font-bold border transition flex items-center gap-1.5", mode === "sub" ? "bg-[#ff3b82] text-white border-[#ff3b82] shadow shadow-[#ff3b82]/20" : "bg-white/[0.06] text-zinc-300 border-white/10 hover:bg-white/10")}
          >
            <span className="h-2 w-2 rounded-full bg-white animate-pulse hidden sm:inline-block" /> ซับไทย
          </button>
          <button
            onClick={() => { setMode("dub"); setPlaying(false); }}
            className={cn("rounded-full px-4 py-1.5 text-sm font-bold border transition", mode === "dub" ? "bg-white text-black border-white" : "bg-white/[0.06] text-zinc-300 border-white/10 hover:bg-white/10")}
          >
            พากย์ไทย
          </button>
          <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-zinc-500 ml-2">
            <Volume2 className="h-3.5 w-3.5" /> {mode === "sub" ? "ญี่ปุ่น • ซับไทย" : "พากย์ไทย"} • Official PV
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline-flex rounded-full bg-amber-500/15 border border-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 items-center gap-1">
            <Sparkles className="h-3 w-3" /> ตัวอย่างแนะนำ
          </span>
          <button onClick={() => setTheater(v => !v)} className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/10 text-zinc-300" title="Theater">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Player */}
      <div className={cn("relative aspect-video w-full overflow-hidden bg-black border border-white/10", theater ? "flex-1 rounded-none border-0" : "rounded-2xl shadow-2xl")}>
        {!playing ? (
          <button onClick={() => setPlaying(true)} className="absolute inset-0 group grid place-items-center overflow-hidden">
            {thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt={title} className="absolute inset-0 h-full w-full object-cover scale-105 group-hover:scale-100 transition duration-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 group-hover:from-black/80 transition" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff3b82]/20 via-transparent to-[#7c3aed]/20 opacity-60" />
            
            {/* Center play */}
            <div className="relative text-center px-4">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-black shadow-2xl group-hover:scale-105 transition duration-300 ring-4 ring-white/20">
                <Play className="h-8 w-8 fill-black ml-1" />
              </span>
              <p className="mt-4 text-base sm:text-lg font-black text-white drop-shadow-lg tracking-tight line-clamp-2">{title}</p>
              <p className="text-xs sm:text-sm text-zinc-200 mt-1 drop-shadow">
                {mode === "sub" ? "เสียงญี่ปุ่น • ซับไทย" : "พากย์ไทย"} • คลิกเพื่อเล่น • YouTube
              </p>
              <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs text-white border border-white/10">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> EP.{episodeNumber ?? 1} • {animeSlug}
              </span>
            </div>

            {/* Bottom meta */}
            <div className="absolute bottom-0 w-full p-4 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded bg-red-600 px-2 py-1 text-xs font-black text-white tracking-widest">YouTube</span>
                <span className="hidden sm:inline text-xs text-white/80">ตัวอย่างแนะนำ • Official PV • {activeId}</span>
              </div>
              <span className="text-xs text-white/60 hidden sm:inline">1080p • Adaptive</span>
            </div>
          </button>
        ) : (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${activeId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
      </div>

      {/* Bottom actions */}
      <div className={cn("mt-3 flex flex-wrap items-center gap-2 text-xs", theater && "px-4 py-3 bg-[#0a0a0f] border-t border-white/10 mt-0")}>
        <button className="inline-flex items-center gap-1.5 rounded-full bg-white text-black px-3 py-1.5 font-semibold hover:bg-zinc-100">
          <Bookmark className="h-3.5 w-3.5" /> เพิ่ม Watchlist
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1.5 text-white hover:bg-white/10">
          <Share2 className="h-3.5 w-3.5" /> แชร์
        </button>
        <span className="text-zinc-500 ml-1 hidden sm:inline">ที่มา: YouTube Official PV • ตัวอย่างแนะนำ • ถ้ามีพากย์ไทยจริงจะแยกวิดีโอให้อัตโนมัติ</span>
        {theater && (
          <button onClick={() => setTheater(false)} className="ml-auto rounded-full bg-white text-black px-4 py-1.5 font-bold">
            ออกจาก Theater
          </button>
        )}
      </div>
    </div>
  );
}
