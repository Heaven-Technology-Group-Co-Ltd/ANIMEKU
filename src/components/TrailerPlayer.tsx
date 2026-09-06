"use client";
import { useState } from "react";
import { Play, Pause, Sparkles, Volume2, VolumeX, Maximize2, Subtitles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActiveCue } from "@/lib/customSubs";
import { getDubInfo, getDubDisplayState, DUB_UNAVAILABLE_LABEL } from "@/lib/dubMap";
import { useTrailerCaptions } from "./trailer-player/useTrailerCaptions";
import { useYouTubePlayer } from "./trailer-player/useYouTubePlayer";

type Props = {
  title: string;
  youtubeId?: string;
  youtubeDubId?: string;
  /** Anime id — ใช้ lookup dubMap เพื่อยืนยันพากย์ไทย (P1.5) */
  animeId?: string;
  /** true ก็ต่อเมื่อ youtubeDubId ผ่านการยืนยันแล้ว (resolve ฝั่ง page ผ่าน resolveTrailerDub) */
  dubVerified?: boolean;
  thumbnail?: string;
  animeSlug: string;
  episodeNumber?: number;
  hlsUrl?: string;
};



// P3.2: thin composition over useTrailerCaptions (caption fetching/state)
// + useYouTubePlayer (YT lifecycle/transport). Dub/mode/theater/poster
// semantics, caption contracts, and player behavior are unchanged —
// only the dead Watchlist/Share affordances (buttons without handlers)
// are removed so the UI stays honest.

export default function TrailerPlayer({ title, youtubeId, youtubeDubId, animeId, dubVerified, thumbnail, animeSlug, hlsUrl }: Props) {
  const clean = (v?: string) => v?.trim();
  const youtubeIdClean = clean(youtubeId);
  const youtubeDubClean = clean(youtubeDubId);
  // P1.5: ถือว่ามีพากย์ไทยอย่างเป็นทางการก็ต่อเมื่อยืนยันแล้วเท่านั้น —
  // ยืนยันผ่าน dubMap (lookup ด้วย animeId) หรือ prop dubVerified ที่ page resolve มาแล้ว
  const dubEntry = animeId ? getDubInfo(animeId) : undefined;
  const resolvedDubId = dubEntry?.videoId ?? youtubeDubClean;
  const resolvedVerified = dubEntry ? true : dubVerified === true;
  const hasVerifiedDub =
    getDubDisplayState({ videoId: resolvedDubId, verified: resolvedVerified, mainTrailerId: youtubeIdClean }) === "verified";
  const [mode, setMode] = useState<"sub" | "dub">("sub");
  const [theater, setTheater] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showCaptionMenu, setShowCaptionMenu] = useState(false);

  const activeId = mode === "dub" && hasVerifiedDub && resolvedDubId ? resolvedDubId : youtubeIdClean;
  const hasYoutube = !!activeId;
  const showHlsFallback = !hasYoutube && !!hlsUrl;
  const playerContainerId = `yt-player-${animeSlug}`;

  const {
    captionTracks,
    selectedCaption,
    setSelectedCaption,
    useCustomSub,
    setUseCustomSub,
    subDelay,
    setSubDelay,
    customCues,
    hasCustomSub,
    syncTracksFromPlayer,
  } = useTrailerCaptions(activeId);

  const {
    containerRef,
    playing,
    setPlaying,
    isPlaying,
    current,
    duration,
    volume,
    muted,
    togglePlay,
    handleSeek,
    handleVolume,
    toggleMute,
    toggleFullscreen,
    closePlayer,
  } = useYouTubePlayer({
    activeId,
    hasYoutube,
    playerContainerId,
    selectedCaption,
    useCustomSub,
    syncTracksFromPlayer,
  });

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  if (!hasYoutube && !showHlsFallback) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10 grid place-items-center">
        <p className="text-sm text-zinc-500">ไม่มีตัวอย่างแนะนำสำหรับเรื่องนี้</p>
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
      {/* Top bar - sub/dub + theater */}
      <div className={cn("flex items-center justify-between gap-3 mb-3", theater && "px-4 py-3 bg-[#0a0a0f] border-b border-white/10 mb-0")}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (mode !== "sub") setMode("sub");
            }}
            className={cn("rounded-full px-4 py-1.5 text-sm font-bold border transition flex items-center gap-1.5", mode === "sub" ? "bg-[#ff3b82] text-white border-[#ff3b82] shadow shadow-[#ff3b82]/20" : "bg-white/[0.06] text-zinc-300 border-white/10 hover:bg-white/10")}
          >
            <span className="h-2 w-2 rounded-full bg-white animate-pulse hidden sm:inline-block" /> ซับไทย
          </button>
          <button
            onClick={() => {
              // P1.5: เปิดโหมดพากย์ไทยได้เฉพาะเมื่อมีข้อมูลที่ยืนยันแล้วเท่านั้น
              if (!hasVerifiedDub) return;
              if (mode !== "dub") setMode("dub");
            }}
            disabled={!hasVerifiedDub}
            title={hasVerifiedDub ? "พากย์ไทย" : DUB_UNAVAILABLE_LABEL}
            className={cn("rounded-full px-4 py-1.5 text-sm font-bold border transition disabled:opacity-40 disabled:cursor-not-allowed", mode === "dub" ? "bg-white text-black border-white" : "bg-white/[0.06] text-zinc-300 border-white/10 hover:bg-white/10")}
          >
            พากย์ไทย
          </button>
          <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-zinc-500 ml-2">
            {mode === "sub" ? "ญี่ปุ่น • ซับไทย" : "พากย์ไทย"} • YouTube iframe • Custom UI
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

      {/* Player container */}
      <div
        ref={containerRef}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => playing && isPlaying && setShowControls(false)}
        className={cn("relative aspect-video w-full overflow-hidden bg-black border border-white/10 group/player", theater ? "flex-1 rounded-none border-0" : "rounded-2xl shadow-2xl")}
      >
        {!playing ? (
          <button onClick={() => setPlaying(true)} className="absolute inset-0 group grid place-items-center overflow-hidden">
            {thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt={title} className="absolute inset-0 h-full w-full object-cover scale-105 group-hover:scale-100 transition duration-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 group-hover:from-black/80 transition" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff3b82]/20 via-transparent to-[#7c3aed]/20 opacity-60" />
            <div className="relative text-center px-4">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-black shadow-2xl group-hover:scale-105 transition duration-300 ring-4 ring-white/20">
                <Play className="h-8 w-8 fill-black ml-1" />
              </span>
              <p className="mt-4 text-base sm:text-lg font-black text-white drop-shadow-lg tracking-tight line-clamp-2">{title}</p>
              <p className="text-xs sm:text-sm text-zinc-200 mt-1 drop-shadow">
                {mode === "sub" ? "เสียงญี่ปุ่น • ซับไทย" : "พากย์ไทย"} • คลิกเพื่อเล่น • Custom Player
              </p>
              <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs text-white border border-white/10">
                <span className="h-2 w-2 rounded-full bg-[#ff3b82] animate-pulse" /> ตัวอย่างแนะนำ • {animeSlug}
              </span>
            </div>
            <div className="absolute bottom-0 w-full p-4 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded bg-red-600 px-2 py-1 text-xs font-black text-white tracking-widest">YouTube</span>
                <span className="hidden sm:inline text-xs text-white/80">Custom UI • ตัวอย่างแนะนำ • {activeId}</span>
              </div>
              <span className="text-xs text-white/60 hidden sm:inline">1080p • Adaptive</span>
            </div>
          </button>
        ) : (
          <>
            <div
              id={playerContainerId}
              className="absolute inset-0 h-full w-full"
            />
            {useCustomSub && customCues && (
              <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 max-w-[90%] text-center">
                <p className="inline-block rounded-xl bg-black/75 backdrop-blur px-3 py-1.5 text-sm sm:text-base font-bold text-white leading-tight shadow-lg border border-white/10">
                  {getActiveCue(customCues, current, subDelay * -1) || "\u00A0"}
                </p>
              </div>
            )}
            <div
              className={cn(
                "absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300",
                showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <button onClick={togglePlay} className="absolute inset-0 grid place-items-center">
                <span className={cn("flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur border border-white/20 text-white transition", isPlaying ? "opacity-0 group-hover/player:opacity-100" : "opacity-100")}>
                  {isPlaying ? <Pause className="h-7 w-7 fill-white" /> : <Play className="h-7 w-7 fill-white ml-1" />}
                </span>
              </button>

              <div className="relative p-3 sm:p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={current}
                    onChange={handleSeek}
                    className="flex-1 h-1 accent-[#ff3b82] cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-white/80 tabular-nums hidden sm:inline">
                    {formatTime(current)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={togglePlay} className="h-8 w-8 grid place-items-center rounded-full bg-white text-black hover:bg-zinc-100 shrink-0">
                    {isPlaying ? <Pause className="h-4 w-4 fill-black" /> : <Play className="h-4 w-4 fill-black ml-0.5" />}
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={toggleMute} className="h-8 w-8 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white">
                      {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <input type="range" min={0} max={100} value={muted ? 0 : volume} onChange={handleVolume} className="hidden sm:block w-20 h-1 accent-white cursor-pointer" />
                    <span className="text-[11px] font-mono text-white/70 hidden lg:inline tabular-nums">{formatTime(current)} / {formatTime(duration)}</span>
                  </div>

                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="relative">
                      <button
                        onClick={() => setShowCaptionMenu(v => !v)}
                        className={cn("h-8 w-8 grid place-items-center rounded-full border text-white", selectedCaption || useCustomSub ? "bg-[#ff3b82] border-[#ff3b82]" : "bg-white/10 border-white/10 hover:bg-white/20")}
                        title={`ซับ: ${captionTracks.length} ภาษา${hasCustomSub ? " + ซับทำเอง" : ""}`}
                      >
                        <Subtitles className="h-4 w-4" />
                      </button>
                      {showCaptionMenu && (
                        <div className="absolute bottom-10 right-0 w-64 rounded-xl bg-[#1a1a24] border border-white/10 shadow-xl p-2 z-20">
                          <p className="text-xs font-bold text-white px-2 py-1">เลือกซับไตเติล</p>
                          <button onClick={() => { setSelectedCaption(""); setUseCustomSub(false); setShowCaptionMenu(false); }} className={cn("w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between", !selectedCaption && !useCustomSub ? "bg-[#ff3b82] text-white" : "text-zinc-300 hover:bg-white/10")}>
                            ปิดซับ {(!selectedCaption && !useCustomSub) && <Check className="h-3 w-3" />}
                          </button>
                          {captionTracks.map((t) => (
                            <button key={t.lang} onClick={() => { setSelectedCaption(t.lang); setUseCustomSub(false); setShowCaptionMenu(false); }} className={cn("w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between", selectedCaption === t.lang && !useCustomSub ? "bg-[#ff3b82] text-white" : "text-zinc-300 hover:bg-white/10")}>
                              <span>{t.name} <span className="text-white/50">({t.lang})</span>{t.isAuto && " • Auto"}</span>
                              {selectedCaption === t.lang && !useCustomSub && <Check className="h-3 w-3" />}
                            </button>
                          ))}
                          {hasCustomSub && (
                            <button onClick={() => { setUseCustomSub(v => !v); if (!useCustomSub) setSelectedCaption(""); setShowCaptionMenu(false); }} className={cn("w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between mt-1 border-t border-white/10", useCustomSub ? "bg-[#ff3b82] text-white" : "text-zinc-300 hover:bg-white/10")}>
                              <span>ซับทำเอง ANIMEKU {useCustomSub && "✓"}</span>
                              {useCustomSub && <Check className="h-3 w-3" />}
                            </button>
                          )}
                          {useCustomSub && (
                            <div className="mt-2 px-2 flex items-center gap-2">
                              <span className="text-xs text-zinc-400">ดีเลย์</span>
                              <input type="range" min={-3} max={3} step={0.5} value={subDelay} onChange={(e) => setSubDelay(Number(e.target.value))} className="flex-1 h-1 accent-[#ff3b82]" />
                              <span className="text-xs font-mono text-white">{subDelay > 0 ? `+${subDelay}` : subDelay}s</span>
                            </div>
                          )}
                          <p className="text-[11px] text-zinc-500 px-2 pt-1">YT CC: {captionTracks.length} ภาษา • ซับทำเอง: {hasCustomSub ? `${customCues!.length} cues` : "ไม่มี"}</p>
                        </div>
                      )}
                    </div>
                    <button onClick={toggleFullscreen} className="h-8 w-8 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white" title="Fullscreen">
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <button onClick={closePlayer} className="hidden sm:inline-flex rounded-full bg-white text-black px-3 py-1.5 text-xs font-bold hover:bg-zinc-100">
                      ปิด
                    </button>
                  </div>
                </div>

                <div className="hidden sm:flex items-center justify-between text-[11px] text-white/50">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> YouTube iframe • Custom controls • {animeSlug}</span>
                  <span>แนะนำ • {title.slice(0, 40)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* P3.2: dead Watchlist/Share buttons removed — both rendered without
          handlers, so they looked functional but silently did nothing. The
          status line below stays as the honest trailer/dub/sub indicator. */}
      <div className={cn("mt-3 flex flex-wrap items-center gap-2 text-xs", theater && "px-4 py-3 bg-[#0a0a0f] border-t border-white/10 mt-0")}>
        <span className="text-zinc-500 ml-1 hidden sm:inline">YouTube iframe • Custom UI • ตัวอย่างแนะนำ • {useCustomSub ? "ซับทำเอง ✓" : `ซับจริง ${captionTracks.length}ภาษา ${captionTracks.map(t=>t.lang).slice(0,4).join("/")}`} {hasVerifiedDub ? "• พากย์ไทย" : hasCustomSub ? "• มีซับทำเอง" : `• ${DUB_UNAVAILABLE_LABEL}`}</span>
        {theater && (
          <button onClick={() => setTheater(false)} className="ml-auto rounded-full bg-white text-black px-4 py-1.5 font-bold">
            ออกจาก Theater
          </button>
        )}
      </div>
    </div>
  );
}
