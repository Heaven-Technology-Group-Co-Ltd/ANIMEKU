"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Sparkles, Volume2, VolumeX, Maximize2, Minimize2, Share2, Bookmark, Subtitles, Check } from "lucide-react";
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

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    return new Promise((res) => {
      const orig = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        orig?.();
        res();
      };
    });
  }
  return new Promise((res) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => res();
  });
}

export default function TrailerPlayer({ title, youtubeId, youtubeDubId, thumbnail, animeSlug, hlsUrl }: Props) {
  const clean = (v?: string) => v?.trim();
  const youtubeIdClean = clean(youtubeId);
  const youtubeDubClean = clean(youtubeDubId);
  const [mode, setMode] = useState<"sub" | "dub">("sub");
  const [playing, setPlaying] = useState(false);
  const [theater, setTheater] = useState(false);
  const [isYTReady, setIsYTReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [captionTracks, setCaptionTracks] = useState<{ lang: string; name: string; isAuto: boolean }[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string>("th");
  const [showCaptionMenu, setShowCaptionMenu] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const playerContainerId = useRef(`yt-player-${animeSlug}`);
  const timerRef = useRef<number | null>(null);

  const activeId = mode === "dub" && youtubeDubClean ? youtubeDubClean : youtubeIdClean;
  const hasYoutube = !!activeId;
  const showHlsFallback = !hasYoutube && !!hlsUrl;
  const hasRealDub = !!youtubeDubClean && youtubeDubClean !== youtubeIdClean;

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // Fetch caption tracks for active video (all languages)
  useEffect(() => {
    if (!activeId) {
      setCaptionTracks([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/youtube/captions?v=${activeId}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const tracks = (j.tracks || []) as { lang: string; name: string; isAuto: boolean }[];
        setCaptionTracks(tracks);
        // auto-select Thai if exists, else English, else first
        if (tracks.length > 0) {
          const hasTh = tracks.find((t) => t.lang === "th");
          const hasEn = tracks.find((t) => t.lang === "en");
          const pick = hasTh ? "th" : hasEn ? "en" : tracks[0].lang;
          setSelectedCaption(pick);
        } else {
          setSelectedCaption("");
        }
      })
      .catch(() => {
        if (!cancelled) setCaptionTracks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Load API when entering playing state
  useEffect(() => {
    if (!playing || !hasYoutube) return;
    let cancelled = false;
    loadYouTubeAPI().then(() => {
      if (cancelled) return;
      setIsYTReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [playing, hasYoutube]);

  // Create / recreate player when ready or mode changes
  useEffect(() => {
    if (!playing || !isYTReady || !activeId) return;
    const elId = playerContainerId.current;
    // cleanup previous
    if (playerRef.current?.destroy) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
    // ensure container exists
    const tryCreate = () => {
      const el = document.getElementById(elId);
      if (!el) {
        setTimeout(tryCreate, 50);
        return;
      }
      playerRef.current = new window.YT.Player(elId, {
        videoId: activeId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          autoplay: 1,
          cc_load_policy: 1,
          cc_lang_pref: selectedCaption || "th",
          hl: selectedCaption || "th",
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: (e: any) => {
            setDuration(e.target.getDuration?.() || 0);
            e.target.setVolume(volume);
            if (muted) e.target.mute();
            // enable captions module and set language
            try {
              e.target.loadModule?.("captions");
              if (selectedCaption) {
                e.target.setOption?.("captions", "track", { languageCode: selectedCaption });
              }
            } catch {}
            e.target.playVideo();
            setIsPlaying(true);
          },
          onStateChange: (e: any) => {
            // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
            if (e.data === 1) setIsPlaying(true);
            else if (e.data === 2) setIsPlaying(false);
            else if (e.data === 0) {
              setIsPlaying(false);
              setCurrent(0);
            }
          },
        },
      });
    };
    tryCreate();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isYTReady, playing, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update caption when language changes
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !playing || !isYTReady) return;
    try {
      p.loadModule?.("captions");
      if (selectedCaption) {
        p.setOption?.("captions", "track", { languageCode: selectedCaption });
      } else {
        p.setOption?.("captions", "track", {});
      }
    } catch {}
  }, [selectedCaption, playing, isYTReady]);

  // Poll time
  useEffect(() => {
    if (!playing || !isYTReady) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== "function") return;
      try {
        const c = p.getCurrentTime();
        const d = p.getDuration();
        if (!isNaN(c)) setCurrent(c);
        if (!isNaN(d) && d > 0) setDuration(d);
      } catch {}
    }, 500) as unknown as number;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [playing, isYTReady, isPlaying]);

  // Handle mode switch while playing
  useEffect(() => {
    // when mode changes and already playing, isYTReady effect will recreate player
  }, [mode]);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const state = p.getPlayerState?.();
      if (state === 1) {
        p.pauseVideo();
        setIsPlaying(false);
      } else {
        p.playVideo();
        setIsPlaying(true);
      }
    } catch {}
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setCurrent(v);
    playerRef.current?.seekTo?.(v, true);
  }, []);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    playerRef.current?.setVolume?.(v);
    if (v === 0) setMuted(true);
    else if (muted) {
      setMuted(false);
      playerRef.current?.unMute?.();
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) {
      p.unMute?.();
      p.setVolume?.(volume || 80);
      setMuted(false);
    } else {
      p.mute?.();
      setMuted(true);
    }
  }, [muted, volume]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }, []);

  const closePlayer = useCallback(() => {
    if (playerRef.current?.destroy) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
    if (timerRef.current) window.clearInterval(timerRef.current);
    setPlaying(false);
    setIsYTReady(false);
    setIsPlaying(false);
    setCurrent(0);
  }, []);

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
              const nextMode = "sub";
              if (mode !== nextMode) {
                setMode(nextMode);
                if (playing) {
                  // will recreate player via effect
                  setIsYTReady(false);
                  setTimeout(() => setIsYTReady(true), 50);
                }
              }
            }}
            className={cn("rounded-full px-4 py-1.5 text-sm font-bold border transition flex items-center gap-1.5", mode === "sub" ? "bg-[#ff3b82] text-white border-[#ff3b82] shadow shadow-[#ff3b82]/20" : "bg-white/[0.06] text-zinc-300 border-white/10 hover:bg-white/10")}
          >
            <span className="h-2 w-2 rounded-full bg-white animate-pulse hidden sm:inline-block" /> ซับไทย
          </button>
          <button
            onClick={() => {
              if (!youtubeDubId) return;
              const nextMode: "sub" | "dub" = "dub";
              if (mode !== nextMode) {
                setMode(nextMode);
                if (playing) {
                  setIsYTReady(false);
                  setTimeout(() => setIsYTReady(true), 50);
                }
              }
            }}
            disabled={!youtubeDubId}
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
            {/* YouTube iframe via API */}
            <div id={playerContainerId.current} className="absolute inset-0 h-full w-full" />
            {/* Custom overlay - hide when not hovered during playback */}
            <div
              className={cn(
                "absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300",
                showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              {/* Center big play/pause on click */}
              <button onClick={togglePlay} className="absolute inset-0 grid place-items-center">
                <span className={cn("flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur border border-white/20 text-white transition", isPlaying ? "opacity-0 group-hover/player:opacity-100" : "opacity-100")}>
                  {isPlaying ? <Pause className="h-7 w-7 fill-white" /> : <Play className="h-7 w-7 fill-white ml-1" />}
                </span>
              </button>

              {/* Bottom custom controls */}
              <div className="relative p-3 sm:p-4 space-y-2">
                {/* Progress */}
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

                {/* Controls row */}
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
                    {/* CC menu */}
                    <div className="relative">
                      <button
                        onClick={() => setShowCaptionMenu(v => !v)}
                        className={cn("h-8 w-8 grid place-items-center rounded-full border text-white", selectedCaption ? "bg-[#ff3b82] border-[#ff3b82]" : "bg-white/10 border-white/10 hover:bg-white/20")}
                        title={`ซับ: ${captionTracks.length} ภาษา`}
                      >
                        <Subtitles className="h-4 w-4" />
                      </button>
                      {showCaptionMenu && (
                        <div className="absolute bottom-full right-0 mb-2 w-56 rounded-2xl border border-white/10 bg-[#12121a] p-2 shadow-2xl z-10">
                          <p className="px-2 py-1 text-xs font-bold text-white flex items-center gap-1.5"><Subtitles className="h-3.5 w-3.5" /> ซับจากคลิปจริง • {captionTracks.length} ภาษา</p>
                          <p className="px-2 text-[11px] text-zinc-500">ดึงจาก YouTube timedtext • แตะเพื่อสลับทันที</p>
                          <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                            <button
                              onClick={() => {
                                setSelectedCaption("");
                                setShowCaptionMenu(false);
                              }}
                              className={cn("w-full text-left rounded-xl px-3 py-1.5 text-xs flex items-center justify-between", !selectedCaption ? "bg-white text-black font-bold" : "text-zinc-300 hover:bg-white/10")}
                            >
                              ปิดซับ <span className="text-[11px] text-zinc-500">Off</span> {!selectedCaption && <Check className="h-3.5 w-3.5" />}
                            </button>
                            {captionTracks.map((t) => (
                              <button
                                key={t.lang}
                                onClick={() => {
                                  setSelectedCaption(t.lang);
                                  setShowCaptionMenu(false);
                                }}
                                className={cn("w-full text-left rounded-xl px-3 py-1.5 text-xs flex items-center justify-between", selectedCaption === t.lang ? "bg-[#ff3b82] text-white font-bold" : "text-zinc-300 hover:bg-white/10")}
                              >
                                <span>{t.name || t.lang} <span className="text-[11px] opacity-60">({t.lang})</span> {t.isAuto && <span className="text-[10px] bg-white/15 px-1 rounded">Auto</span>}</span>
                                {selectedCaption === t.lang && <Check className="h-3.5 w-3.5" />}
                              </button>
                            ))}
                            {captionTracks.length === 0 && <p className="px-3 py-2 text-xs text-zinc-500">คลิปนี้ไม่มีซับฝัง • ใช้ซับ Auto ของ YouTube ได้</p>}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white border border-white/10">
                      {mode === "sub" ? "ซับไทย" : "พากย์ไทย"} • {captionTracks.length > 0 ? `${captionTracks.length}ภาษา` : "Custom"}
                    </span>
                    {hasRealDub && <span className="hidden lg:inline-flex rounded-full bg-emerald-500 px-2 py-1 text-xs font-black text-white">พากย์จริง ✓</span>}
                    <button onClick={() => setTheater(v => !v)} className="hidden sm:grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white" title="Theater">
                      {theater ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button onClick={toggleFullscreen} className="h-8 w-8 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white" title="Fullscreen">
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <button onClick={closePlayer} className="hidden sm:inline-flex rounded-full bg-white text-black px-3 py-1.5 text-xs font-bold hover:bg-zinc-100">
                      ปิด
                    </button>
                  </div>
                </div>

                {/* Source badge */}
                <div className="hidden sm:flex items-center justify-between text-[11px] text-white/50">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> YouTube iframe • Custom controls • {animeSlug}</span>
                  <span>แนะนำ • {title.slice(0, 40)}</span>
                </div>
              </div>
            </div>
          </>
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
        <span className="text-zinc-500 ml-1 hidden sm:inline">YouTube iframe • Custom UI • ตัวอย่างแนะนำ • ซับจริง {captionTracks.length}ภาษา {captionTracks.map(t=>t.lang).slice(0,4).join("/")} {hasRealDub ? "• พากย์ไทยจริง" : "• พากย์ไทยตาม Trailer หลัก"}</span>
        {theater && (
          <button onClick={() => setTheater(false)} className="ml-auto rounded-full bg-white text-black px-4 py-1.5 font-bold">
            ออกจาก Theater
          </button>
        )}
      </div>
    </div>
  );
}
