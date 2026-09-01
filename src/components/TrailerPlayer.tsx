"use client";
import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  youtubeId?: string; // ซับไทย
  youtubeDubId?: string; // พากย์ไทย (ถ้ามี)
  thumbnail?: string;
  animeSlug: string;
  episodeNumber?: number;
  hlsUrl?: string; // ถ้ามี HLS จริงให้ใช้ HLS แทน
};

export default function TrailerPlayer({ title, youtubeId, youtubeDubId, thumbnail, hlsUrl }: Props) {
  const [mode, setMode] = useState<"sub" | "dub">("sub");
  const [playing, setPlaying] = useState(false);

  const activeId = mode === "dub" && youtubeDubId ? youtubeDubId : youtubeId;
  const hasYoutube = !!activeId;
  // If HLS exists and is not demo? For now Trailer mode wins if youtubeId exists
  const showHlsFallback = !hasYoutube && !!hlsUrl;

  if (!hasYoutube && !showHlsFallback) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10 grid place-items-center">
        <p className="text-sm text-zinc-500">ไม่มีตัวอย่างบน YouTube สำหรับเรื่องนี้</p>
      </div>
    );
  }

  // HLS fallback (rare)
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
    <div className="w-full">
      {/* Tabs ซับไทย / พากย์ไทย */}
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => {
            setMode("sub");
            setPlaying(false);
          }}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-bold border transition",
            mode === "sub"
              ? "bg-[#ff3b82] text-white border-[#ff3b82]"
              : "bg-white/[0.06] text-zinc-300 border-white/10 hover:bg-white/10"
          )}
        >
          ซับไทย
        </button>
        <button
          onClick={() => {
            setMode("dub");
            setPlaying(false);
          }}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-bold border transition",
            mode === "dub"
              ? "bg-white text-black border-white"
              : "bg-white/[0.06] text-zinc-300 border-white/10 hover:bg-white/10"
          )}
        >
          พากย์ไทย {youtubeDubId && youtubeDubId !== youtubeId ? "" : "• ตัวอย่าง"}
        </button>
        <span className="ml-auto hidden sm:inline-flex items-center text-xs text-zinc-500">
          {mode === "sub" ? "เสียงญี่ปุ่น + ซับไทย" : "พากย์ไทย"} • YouTube
        </span>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10">
        {!playing ? (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 group grid place-items-center"
          >
            {thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt={title} className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/25 transition" />
            <div className="relative text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-xl group-hover:scale-105 transition">
                <Play className="h-7 w-7 fill-black ml-1" />
              </span>
              <p className="mt-3 text-sm font-bold text-white drop-shadow">{title}</p>
              <p className="text-xs text-zinc-200 mt-1">
                {mode === "sub" ? "ซับไทย • คลิกเพื่อเล่น" : "พากย์ไทย • คลิกเพื่อเล่น"} • YouTube Official PV
              </p>
            </div>
          </button>
        ) : (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${activeId}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        ที่มา: YouTube Official PV • ID: {activeId} • ถ้ามีลิขสิทธิ์พากย์ไทยจริง ระบบจะแสดงวิดีโอพากย์ไทยอัตโนมัติ
      </p>
    </div>
  );
}
