"use client";
import { useState } from "react";
import { Play, Settings, Maximize2 } from "lucide-react";

export default function VideoPlayer({ title }: { title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10">
      {!playing ? (
        <button onClick={() => setPlaying(true)} className="absolute inset-0 grid place-items-center bg-gradient-to-br from-zinc-900 to-black">
          <div className="text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-xl hover:scale-105 transition">
              <Play className="h-7 w-7 fill-black ml-1" />
            </span>
            <p className="mt-3 text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-zinc-400">คลิกเพื่อเล่น • Demo Player (ต่อ HLS จริงได้ที่ src นี้)</p>
          </div>
        </button>
      ) : (
        <div className="absolute inset-0">
          <video controls autoPlay className="h-full w-full" poster="https://picsum.photos/seed/player/1280/720">
            <source src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" type="application/x-mpegURL" />
          </video>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-0 w-full p-3 flex justify-between items-center text-white/80">
        <span className="text-xs bg-black/60 rounded-full px-2 py-1">1080p • ซับไทย</span>
        <span className="flex gap-2">
          <Settings className="h-4 w-4" /> <Maximize2 className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
